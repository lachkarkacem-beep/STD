# Modèles 3D — 46 produits (GLB)

- `glb/<REF>.glb`: one binary glTF per product, ~10 MB in total (8 KB to 1.3 MB).
- `models.json`: index listing ref, name, category, file, size and dimensions.

## Conventions
- Units are metres, Y is up, and the model rests on the ground (y = 0), centred on X/Z.
- Default finish: **blanc**. Materials are named `body`, `molding`, `soil`, `iron`, etc. To change the finish on the website, recolour the stone materials using the `finishes` values in `models.json`. Soil and iron keep their own colours.
- Tiles (DAL*) are exported as a laid patch, because the pattern only completes across the joints.

## Integration (example)
```html
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<model-viewer src="glb/B105.glb" camera-controls auto-rotate shadow-intensity="1" ar></model-viewer>
```
Compatible with three.js (`GLTFLoader`), Babylon, Shopify, WooCommerce 3D, and others.
