-- STD — rôles stricts, téléphone obligatoire, quatre statuts de devis.
--
-- À appliquer avec `supabase db push`, ou collée dans l'éditeur SQL Supabase.
-- Elle est écrite pour pouvoir être rejouée sans dommage.
--
-- Elle corrige au passage une FAILLE : la politique d'origine laissait un
-- utilisateur modifier sa propre ligne de profil, colonne `role` comprise.
-- N'importe quel compte pouvait donc se promouvoir administrateur avec la
-- seule clé publique. Voir plus bas « profiles: update ».

begin;

-- ---------------------------------------------------------------------------
-- 1. Profils : téléphone, unicité de l'e-mail, rôle « user »
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists telephone text;

-- L'unicité vit déjà dans auth.users ; on la redit ici pour que la table de
-- profils ne puisse pas diverger. Sur lower(email), sinon « Kacem@… » et
-- « kacem@… » coexisteraient.
create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));

-- Le rôle passe de « client » à « user ». On desserre la contrainte avant de
-- convertir les lignes, sans quoi la mise à jour serait refusée.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role = 'client';
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- Un seul administrateur, et c'est cette adresse-là. L'index partiel rend
-- l'invariant impossible à violer, même par une écriture directe en base.
update public.profiles
  set role = 'user'
  where role = 'admin' and lower(email) <> 'lachkarkacem@gmail.com';

create unique index if not exists profiles_single_admin_idx
  on public.profiles ((role)) where role = 'admin';

-- ---------------------------------------------------------------------------
-- 2. Devis : quatre statuts, et une date de dernière modification
-- ---------------------------------------------------------------------------

alter table public.quotes drop constraint if exists quotes_status_check;

update public.quotes set status = 'demandé' where status = 'pending';
update public.quotes set status = 'réponse_envoyée_email' where status = 'answered';

alter table public.quotes alter column status set default 'demandé';
alter table public.quotes
  add constraint quotes_status_check check (
    status in (
      'demandé',
      'en_cours_de_traitement',
      'réponse_envoyée_email',
      'réponse_envoyée_whatsapp'
    )
  );

alter table public.quotes
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quotes_touch_updated_at on public.quotes;
create trigger quotes_touch_updated_at
  before update on public.quotes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Création du profil à l'inscription
-- ---------------------------------------------------------------------------

-- Le rôle ne vient JAMAIS du formulaire : il se déduit de l'adresse, ici, du
-- côté serveur. Un client qui enverrait role='admin' dans ses métadonnées
-- n'obtiendrait rien de plus qu'un autre.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, job_title, telephone, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'job_title',
    new.raw_user_meta_data ->> 'telephone',
    case
      when lower(new.email) = 'lachkarkacem@gmail.com' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Règles d'accès
-- ---------------------------------------------------------------------------

-- profiles: update — LA correction de sécurité.
--
-- L'ancienne politique autorisait `update` sur sa propre ligne sans restreindre
-- les colonnes. PostgreSQL ne sait pas limiter une politique à certaines
-- colonnes ; on compare donc l'ancienne et la nouvelle ligne dans un
-- déclencheur, et on refuse tout changement de rôle ou d'adresse qui ne
-- viendrait pas du serveur.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() est nul quand l'écriture vient du serveur (clé de service ou
  -- déclencheur) : ces chemins-là gardent la main.
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Le rôle ne se change pas depuis un compte client.';
  end if;

  if lower(new.email) is distinct from lower(old.email) then
    raise exception 'L''adresse e-mail ne se change pas ici.';
  end if;

  if new.id is distinct from old.id then
    raise exception 'L''identifiant ne se change pas.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_trigger on public.profiles;
create trigger profiles_guard_trigger
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- quotes: l'administrateur ne dépose pas de demande.
--
-- Il n'a pas non plus de bouton pour le faire dans l'interface, mais une règle
-- d'interface n'est pas une règle : celle-ci tient même si l'on appelle l'API
-- directement.
-- Chaque politique est supprimée sous SON PROPRE nom avant d'être créée, et
-- pas seulement sous l'ancien. Sans cela, un second passage échouait sur
-- « policy ... already exists » : l'ancien nom avait disparu au premier
-- passage, le nouveau était déjà là.
drop policy if exists "quotes: user creates own quote" on public.quotes;
drop policy if exists "quotes: seul un client dépose une demande" on public.quotes;
create policy "quotes: seul un client dépose une demande"
  on public.quotes for insert
  with check (user_id = auth.uid() and not public.is_admin());

-- quotes: une demande envoyée ne se modifie plus côté client. Seul
-- l'administrateur change le statut ou répond.
drop policy if exists "quotes: admin replies to any quote" on public.quotes;
drop policy if exists "quotes: seul l'administrateur met à jour" on public.quotes;
create policy "quotes: seul l'administrateur met à jour"
  on public.quotes for update
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: l'administrateur tient les fiches clients.
--
-- Il complète notamment les téléphones des comptes créés avant que le champ
-- n'existe. Il ne peut pas pour autant toucher au rôle ni à l'adresse : le
-- déclencheur ci-dessus s'applique à lui comme aux autres.
drop policy if exists "profiles: l'administrateur met à jour" on public.profiles;
create policy "profiles: l'administrateur met à jour"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Et personne ne supprime une demande depuis le site : aucune politique de
-- `delete` n'existe, donc RLS refuse par défaut. C'est voulu.

commit;
