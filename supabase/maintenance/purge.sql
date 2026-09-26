-- NETTOYAGE : efface les comptes d'essai et les demandes qui vont avec.
--
--   À coller dans l'éditeur SQL de Supabase.
--
-- ATTENTION — C'EST IRRÉVERSIBLE. Pas de corbeille, pas d'annulation.
--
-- Ce fichier n'est PAS une migration : il ne s'applique pas tout seul et ne
-- doit pas être rejoué par habitude. Il vit à part pour cette raison.
--
-- ---------------------------------------------------------------------------
-- CE QUI EST CONSERVÉ
-- ---------------------------------------------------------------------------
-- Les comptes listés en section 1, ET LEURS DEMANDES DE DEVIS.
--
-- Une demande de devis est une sollicitation réelle d'un client : la détruire
-- fait perdre ce qu'il a écrit et ce qu'il attend. On garde donc celles des
-- comptes conservés. Pour les effacer aussi, voir la section 5, à décommenter
-- sciemment.
--
-- ---------------------------------------------------------------------------
-- CE QUI DISPARAÎT
-- ---------------------------------------------------------------------------
-- Tout autre compte, son profil et ses demandes.

begin;

-- ---------------------------------------------------------------------------
-- 1. Les comptes à garder.
--
-- Modifiez CETTE liste, et rien d'autre. Une adresse absente d'ici sera
-- supprimée avec tout ce qu'elle porte.
-- ---------------------------------------------------------------------------

create temporary table a_conserver (email text primary key) on commit drop;

insert into a_conserver (email) values
  ('lachkarkacem@gmail.com'),     -- administration — ne jamais retirer
  ('aminerebaya50@gmail.com'),    -- Amine Rebaya, ingénieur
  ('abdelhamidrejeb45@gmail.com') -- Rejeb Abdelhamid, peintre
;

-- ---------------------------------------------------------------------------
-- 2. Garde-fous, AVANT toute suppression.
-- ---------------------------------------------------------------------------

do $$
declare
  manquant text;
  n_admin int;
begin
  -- L'administration doit figurer dans la liste : l'en retirer par
  -- inadvertance supprimerait le seul compte qui gère le site.
  if not exists (
    select 1 from a_conserver where lower(email) = 'lachkarkacem@gmail.com'
  ) then
    raise exception
      'L''administration ne figure pas dans la liste à conserver. Rien n''a été effacé.';
  end if;

  -- Bonne base ?
  select count(*) into n_admin
  from auth.users where lower(email) = 'lachkarkacem@gmail.com';
  if n_admin = 0 then
    raise exception
      'Compte d''administration introuvable : ce n''est pas la bonne base, rien n''a été effacé.';
  end if;

  -- Une adresse à conserver qui ne correspond à aucun compte est une faute de
  -- frappe. Continuer supprimerait justement le compte qu'on voulait garder.
  select string_agg(c.email, ', ') into manquant
  from a_conserver c
  where not exists (
    select 1 from auth.users u where lower(u.email) = lower(c.email)
  );

  if manquant is not null then
    raise exception
      'Ces adresses à conserver n''existent pas : %. Corrigez la liste, rien n''a été effacé.',
      manquant;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Ce qui va disparaître — à LIRE avant de dérouler la suite.
-- ---------------------------------------------------------------------------

select
  u.email,
  p.full_name,
  (select count(*) from public.quotes q where q.user_id = u.id) as demandes
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) not in (select lower(email) from a_conserver)
order by u.email;

-- ---------------------------------------------------------------------------
-- 4. Suppression.
--
-- On passe par auth.users et non par profiles : profiles.id référence
-- auth.users avec « on delete cascade », donc supprimer l'utilisateur emporte
-- son profil puis ses demandes. Effacer le profil seul laisserait un compte
-- capable de se connecter sans fiche, ce qui est pire que tout.
-- ---------------------------------------------------------------------------

delete from auth.users
where lower(email) not in (select lower(email) from a_conserver);

-- Un profil orphelin ne devrait pas exister, mais on vérifie.
delete from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id);

-- Et une demande sans auteur non plus.
delete from public.quotes q
where not exists (select 1 from public.profiles p where p.id = q.user_id);

-- ---------------------------------------------------------------------------
-- 5. OPTIONNEL — effacer aussi les demandes des comptes conservés.
--
-- Décommentez SEULEMENT si vous voulez repartir d'un historique vide. Les
-- demandes déjà reçues de vos clients seront perdues, réponses comprises.
-- ---------------------------------------------------------------------------

-- delete from public.quotes;

-- ---------------------------------------------------------------------------
-- 6. Vérification finale : la liste conservée l'est exactement.
-- ---------------------------------------------------------------------------

do $$
declare
  n_admin int;
  n_total int;
  n_attendu int;
begin
  select count(*) into n_attendu from a_conserver;
  select count(*) into n_total from public.profiles;
  select count(*) into n_admin from public.profiles where role = 'admin';

  if n_admin <> 1 then
    raise exception 'Après nettoyage : % compte(s) administrateur au lieu d''un seul.', n_admin;
  end if;
  if n_total <> n_attendu then
    raise exception
      'Après nettoyage : % profil(s) restant(s) au lieu des % conservés.', n_total, n_attendu;
  end if;
end
$$;

commit;

-- ---------------------------------------------------------------------------
-- 7. État final.
-- ---------------------------------------------------------------------------

select
  p.email,
  p.full_name,
  p.role,
  p.telephone,
  (select count(*) from public.quotes q where q.user_id = p.id) as demandes
from public.profiles p
order by p.role desc, p.email;
