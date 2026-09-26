-- NETTOYAGE : efface tous les comptes clients et toutes les demandes de devis.
--
--   À coller dans l'éditeur SQL de Supabase.
--
-- ATTENTION — C'EST IRRÉVERSIBLE.
--   Tous les comptes, sauf celui de l'administration, sont supprimés.
--   Toutes les demandes de devis sont supprimées, y compris leurs réponses.
--   Il n'y a pas de corbeille, pas d'annulation.
--
-- Ce fichier n'est PAS une migration : il ne s'applique pas tout seul et ne
-- doit pas être rejoué par habitude. Il vit à part pour cette raison.
--
-- Ce qui est conservé :
--   - le compte lachkarkacem@gmail.com, son profil et son rôle ;
--   - le schéma, les règles d'accès, les déclencheurs.

begin;

-- ---------------------------------------------------------------------------
-- 0. Garde-fou : on refuse d'agir sur une base qui ne serait pas la bonne.
-- ---------------------------------------------------------------------------

do $$
declare
  n_admin int;
begin
  select count(*) into n_admin
  from auth.users
  where lower(email) = 'lachkarkacem@gmail.com';

  if n_admin = 0 then
    raise exception
      'Compte d''administration introuvable : ce n''est pas la bonne base, rien n''a été effacé.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Ce qui va disparaître — à lire AVANT de dérouler la suite.
-- ---------------------------------------------------------------------------

select
  (select count(*) from public.quotes) as demandes_supprimees,
  (select count(*) from auth.users
     where lower(email) <> 'lachkarkacem@gmail.com') as comptes_supprimes,
  (select count(*) from auth.users
     where lower(email) = 'lachkarkacem@gmail.com') as comptes_conserves;

-- ---------------------------------------------------------------------------
-- 2. Les demandes de devis, toutes.
-- ---------------------------------------------------------------------------

delete from public.quotes;

-- ---------------------------------------------------------------------------
-- 3. Les comptes, sauf l'administration.
--
-- profiles.id référence auth.users avec « on delete cascade », donc supprimer
-- l'utilisateur emporte son profil. On passe par auth.users et non par
-- profiles : effacer le profil seul laisserait un compte capable de se
-- connecter sans fiche, ce qui est pire que tout.
-- ---------------------------------------------------------------------------

delete from auth.users
where lower(email) <> 'lachkarkacem@gmail.com';

-- ---------------------------------------------------------------------------
-- 4. Un profil orphelin ne devrait pas exister, mais on vérifie.
-- ---------------------------------------------------------------------------

delete from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id);

-- ---------------------------------------------------------------------------
-- 5. L'administration doit être intacte, et seule.
-- ---------------------------------------------------------------------------

do $$
declare
  n_admin int;
  n_total int;
begin
  select count(*) into n_admin from public.profiles where role = 'admin';
  select count(*) into n_total from public.profiles;

  if n_admin <> 1 then
    raise exception 'Après nettoyage : % compte(s) administrateur au lieu d''un seul.', n_admin;
  end if;
  if n_total <> 1 then
    raise exception 'Après nettoyage : % profil(s) restant(s) au lieu d''un seul.', n_total;
  end if;
end
$$;

commit;

-- ---------------------------------------------------------------------------
-- 6. État final.
-- ---------------------------------------------------------------------------

select
  (select count(*) from public.quotes) as demandes_restantes,
  (select count(*) from public.profiles) as profils_restants,
  (select email from public.profiles limit 1) as compte_conserve;
