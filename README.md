# STD — Société Tunisienne de Décoration

Catalogue en ligne (bacs, pots, vasques, colonnes, puits, dallages) avec visualisation 3D,
compte client, demandes de devis et portail d'administration.

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind) — déployé sur Vercel.
- **Backend**: Supabase (Postgres + Auth) — voir `supabase/migrations/0001_init.sql`.
- **Moteur 3D**: le travail three.js existant (`planter-builder.js`, `three-d-stage.js`,
  `finishes.js`, `products.json`) est réutilisé tel quel dans `public/3d/`, chargé via
  `<iframe src="/3d/viewer.html?ref=...">`, exactement comme dans les maquettes d'origine.
- `design-reference/` contient les maquettes HTML d'origine (historique, non utilisées par
  l'application).

## Démarrage local

```bash
npm install
cp .env.local.example .env.local   # remplir avec les clés du projet Supabase
npm run dev
```

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter `supabase/migrations/0001_init.sql`
   (ou `npx supabase db push` une fois le projet lié).
3. Copier l'URL du projet et la clé `anon` (Project Settings → API) dans `.env.local`.
4. **Initialiser l'admin** : il suffit de créer un compte via le formulaire d'inscription du
   site avec l'adresse `lachkarkacem@gmail.com` — un trigger SQL lui attribue automatiquement
   le rôle `admin` (voir `handle_new_user()` dans la migration).

## Déploiement

- **Vercel** : connecter le dépôt GitHub dans le tableau de bord Vercel, puis renseigner
  `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans les variables
  d'environnement du projet.
- **Supabase** : le projet tourne indépendamment ; seules l'URL et la clé publique sont
  nécessaires côté frontend.

## Catalogue photo (flipbook)

Les images dans `public/catalogue-flipbook/` alimentent la page `/flipbook`. Elles sont
triées par ordre numérique de nom de fichier (`1.jpg, 2.jpg, …`) — déposer nom fichier suivant
la pagination attendue met à jour le flipbook sans changement de code. (Note : la page 8 est
absente de l'export fourni.)

## Fonctionnalités

- Signup client (nom, **fonction/métier**, e-mail, mot de passe) → `/inscription`.
- Ajout au devis depuis une fiche produit (`/catalogue/[ref]`), panier en `localStorage`.
- Envoi de la demande de devis (connexion requise) → `/devis`, réponse admin sous 24–48h.
- Suivi des réponses côté client → `/compte`.
- Portail admin (`/admin`) : tableau de bord, réponse aux devis, liste des clients filtrable
  par fonction/métier.
