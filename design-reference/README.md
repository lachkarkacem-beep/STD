# Handoff: Catalogue 3D e-commerce (maison & jardin)

## Overview
Online catalogue for a reconstituted-stone home & garden decoration maker: 46 products (colonnes, jardinières, vasques, urnes, puits, pièces décoratives, 11 dalles/pavés), each with a procedural 3D model, 5 colour finishes, dimensions, GLB export and an email-quote cart.

## About the design files
The files here are **design references built in HTML** — working prototypes of intended look and behaviour, not production code. Recreate them in the target codebase (React/Next, Vue, etc.) using its patterns. If there is no codebase yet, a sensible choice is Next.js + React Three Fiber (or plain three.js), with `products.json` as the data source.

`*.dc.html` files are "Design Components": HTML templates with `{{ }}` holes plus a `class Component extends DCLogic` logic block, rendered by `support.js`. Read them as React components (template = JSX, `renderVals()` = render-time values, `state`/`setState` as in React). They open directly in a browser via a local server (`npx serve .`).

## Fidelity
**High-fidelity.** Colours, type, spacing and interactions are final and come from the Nocturne design system (`_ds/nocturne-…/styles.css`). The 3D geometry is the most mature part and should be ported as-is (it is plain JS / three.js).

## Architecture
- `planter-builder.js` — parametric geometry library (three.js r160+, ES module). One builder per family: tapered hollow box with fluting, round pots, columns, urns, well (`puits`), paving tiles. Every builder returns a `THREE.Group` of **named** meshes (names in French, e.g. `cannelures`, `godrons`, `rim`, `soil`) so GLB exports have a clean node hierarchy. Dimensions are written directly into vertices in metres (no mesh scaling). Planters have an open top with a soil disc.
- `products/products.json` — product database (46 entries): `id, name, category, shape, dimensions, weight, image, model3D, model3DSource, formats, description, available, dimensionType, catalogPage` + geometry spec consumed by the builder.
- `products/<REF>/metadata.json` — per-product metadata.
- `finishes.js` — the 5 finishes: blanc, gris, noir, saumon, rouge clair. Applied to stone materials only (iron/soil/interior keep their own).
- `catalog-dims.js` — printed catalogue dimensions (ground truth for fitting).
- `viewer.html?ref=<ID>` — single data-driven viewer for any product: orbit, finish picker, dimension callouts ("cotes"), GLB download.
- `three-d-stage.js` — viewer shell: renderer, lighting, ground shadow, OrbitControls, auto-framing, OBJ/GLB export.
- `check.html` — control harness, 7 assertions per product: dimension fit (precise vertex bounds, **not** `Box3.setFromObject` — it inflates on rotated geometry), flute/relief adherence to the surface, relief orientation, joint continuity between parts, planting cavity, real GLB export + size, node naming. Keep this as an automated test (e.g. Playwright / Vitest + headless GL).

## Screens
### Home (`Home.dc.html`)
Nocturne landing: nav bar, left-aligned hero with a featured 3D model, category entry points, link to catalogue.

### Catalogue (`Catalog.dc.html`)
Grid of product cards with filter by category. Each card shows a live 3D thumbnail. **WebGL context pooling:** max 6 live contexts, never more than 16 total; off-screen cards are released (IntersectionObserver) and show a static fallback. Card: ref, name, dimensions, finish swatches.

### Product (`Product.dc.html?ref=<ID>`)
3D viewer (orbit, zoom), finish picker (5 swatches), dimensions table, weight, description, GLB download, "Ajouter au devis" button. Degrades to a static placeholder if 3D fails.

## Interactions & behaviour
- Finish change swaps stone material colour on all stone meshes instantly.
- GLB export: 12 KB – 756 KB per product.
- Cart: items stored client-side (localStorage), intended to submit an **email quote request**. The quote/cart page itself is **not built yet**.

## Design tokens
All from `_ds/nocturne-…/styles.css` — use the variables, never raw values:
- Ground `--color-bg` #161826, text `--color-text` #e9e9ed, accent #9184d9 (blurple). Tonal ramps `--color-neutral-100…900`, `--color-accent-100…900`.
- Font: Inter (`--font-heading`, `--font-body`), headings weight 500 max.
- Spacing `--space-*` (density 0.7×), radius `--radius-*` (8px base), shadows `--shadow-sm/md/lg`.
- Buttons are outlined (1px accent border, transparent fill). Focus: `2px solid var(--color-accent)`, offset 2px. Icons: Phosphor.
- Rules fade to transparent at their ends; photos go through `.lighten` (`mix-blend-mode: lighten`).

## Open items to complete
1. **Cart / quote page** — list items with ref, finish, quantity; customer form (name, email, phone, message); send by email (backend or form service).
2. **Real product photographs** — none loaded yet; product pages currently show 3D only. Add a gallery alongside the viewer.
3. **B42 / B62 ribs** — unresolved whether the rounded ribs cover the whole face or only part of it. Needs a straight-on photo to settle; adjust the spec in `products.json`.
4. **Puits décoratif** — arch (posts, semicircular crown, volutes, windlass, crank, chain, bucket) was just rebuilt and the shaft made genuinely hollow (annular sector blocks, open lining). Re-run `check.html` on `PUITS` after porting.
5. Production concerns: pre-bake GLBs at build time rather than generating in the browser for catalogue thumbnails; SEO pages per product; i18n (UI copy is French).

## Assets / reference
- `reference/uploads/` — catalogue page scans and photos provided by the client (ground truth for shape and printed dimensions).
- `reference/crops/` — crops of specific details used during modelling.
- Earlier image-to-3D (Tripo) models were reference-only and are not used.

## Files
`Home.dc.html`, `Catalog.dc.html`, `Product.dc.html`, `index.html`, `viewer.html`, `check.html`, `planter-builder.js`, `finishes.js`, `catalog-dims.js`, `three-d-stage.js`, `support.js`, `products/`, `_ds/nocturne-…/`, `reference/`.
