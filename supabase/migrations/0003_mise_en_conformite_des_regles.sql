-- STD — remet toutes les règles d'accès dans l'état voulu.
--
-- À appliquer avec `supabase db push`, ou collée dans l'éditeur SQL Supabase.
--
-- POURQUOI CETTE MIGRATION
--
-- La 0002 a échoué en cours de route la première fois : « policy already
-- exists ». Selon l'endroit où chaque passage s'est arrêté, la base peut
-- porter un mélange d'anciennes et de nouvelles règles. Et la règle qui
-- autorise l'administration à compléter une fiche client a été écrite APRÈS
-- ce passage : elle manque, ce qui faisait disparaître en silence les
-- numéros de téléphone saisis.
--
-- Plutôt que de deviner où l'on en est, ce fichier redéclare les CINQ règles
-- dans leur état final. Il est rejouable autant de fois qu'on veut.

begin;

-- ---------------------------------------------------------------------------
-- Les anciens noms, s'ils traînent encore.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: read own or admin reads all" on public.profiles;
drop policy if exists "profiles: user updates own row" on public.profiles;
drop policy if exists "quotes: read own or admin reads all" on public.quotes;
drop policy if exists "quotes: user creates own quote" on public.quotes;
drop policy if exists "quotes: admin replies to any quote" on public.quotes;

-- ---------------------------------------------------------------------------
-- 1. Lecture des profils : le sien, ou tous pour l'administration.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: lecture" on public.profiles;
create policy "profiles: lecture"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Chacun corrige sa propre fiche.
--
-- Le déclencheur profiles_guard (migration 0002) interdit par-dessus tout
-- changement de rôle, d'adresse ou d'identifiant : cette règle ne rouvre donc
-- pas la faille qu'il ferme.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: chacun corrige la sienne" on public.profiles;
create policy "profiles: chacun corrige la sienne"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. L'administration tient les fiches clients.
--
-- C'est LA règle qui manquait. Sans elle, renseigner un téléphone depuis
-- l'administration ne modifiait aucune ligne — et PostgREST répond « succès,
-- zéro ligne » sans lever d'erreur, si bien que rien ne le signalait.
--
-- Le déclencheur profiles_guard s'applique aussi à l'administration : elle
-- complète un téléphone ou un nom, elle ne touche ni au rôle ni à l'adresse.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: l'administrateur met à jour" on public.profiles;
create policy "profiles: l'administrateur met à jour"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Lecture des demandes : les siennes, ou toutes pour l'administration.
-- ---------------------------------------------------------------------------

drop policy if exists "quotes: lecture" on public.quotes;
create policy "quotes: lecture"
  on public.quotes for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Seul un client dépose une demande, et pour lui-même.
-- ---------------------------------------------------------------------------

drop policy if exists "quotes: seul un client dépose une demande" on public.quotes;
create policy "quotes: seul un client dépose une demande"
  on public.quotes for insert
  with check (user_id = auth.uid() and not public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Seule l'administration fait avancer une demande.
--
-- Une demande envoyée ne se modifie plus côté client. Et aucune règle de
-- `delete` n'existe : personne ne supprime de demande depuis le site.
-- ---------------------------------------------------------------------------

drop policy if exists "quotes: seul l'administrateur met à jour" on public.quotes;
create policy "quotes: seul l'administrateur met à jour"
  on public.quotes for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Vérification : les six règles attendues sont là, et pas d'autres.
-- ---------------------------------------------------------------------------

do $$
declare
  n int;
begin
  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'quotes');

  if n <> 6 then
    raise exception
      'Après mise en conformité : % règle(s) au lieu des 6 attendues.', n;
  end if;

  -- Aucune règle de suppression ne doit exister.
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'quotes')
      and cmd = 'DELETE'
  ) then
    raise exception 'Une règle de suppression existe : ce n''est pas voulu.';
  end if;
end
$$;

commit;

-- ---------------------------------------------------------------------------
-- État final, à lire.
-- ---------------------------------------------------------------------------

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'quotes')
order by tablename, cmd, policyname;
