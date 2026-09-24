// Finishes offered across the range. One place defines them; every viewer and
// the product page read from here, so adding a finish later is a single edit.
//
// Each finish declares only its body tone. The moulding, lining and relief
// tones are derived from it by fixed lightness steps, so a new colour never
// needs four hand-picked hexes and every product stays internally consistent.

export const FINISHES = [
  { id: 'blanc',       label: 'Blanc',       body: '#f2f0ec', swatch: '#f2f0ec' },
  { id: 'gris',        label: 'Gris',        body: '#9b9b98', swatch: '#9b9b98' },
  { id: 'noir',        label: 'Noir',        body: '#33322f', swatch: '#33322f' },
  { id: 'saumon',      label: 'Saumon',      body: '#dfa189', swatch: '#dfa189' },
  { id: 'rouge-clair', label: 'Rouge clair', body: '#c2614c', swatch: '#c2614c' }
];

export const DEFAULT_FINISH = 'blanc';

export function getFinish(id) {
  return FINISHES.find(f => f.id === id) || FINISHES.find(f => f.id === DEFAULT_FINISH);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHexNum(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}
// k > 0 lightens toward white, k < 0 darkens toward black.
function shift(hex, k) {
  const [r, g, b] = hexToRgb(hex);
  return k >= 0
    ? rgbToHexNum(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k)
    : rgbToHexNum(r * (1 + k), g * (1 + k), b * (1 + k));
}

// Material-name → lightness offset from the body tone. Names match those used
// by every builder in the project (body / molding / inner / relief|weave|scales).
const STEPS = {
  body:    0.00,
  molding: -0.07,   // mouldings read slightly recessed
  inner:   -0.20,   // lining sits in shade
  relief:  0.05,    // raised decor catches light
  weave:   0.05,
  scales:  0.05
};

export function paletteFor(id) {
  const f = getFinish(id);
  const out = {};
  for (const [name, k] of Object.entries(STEPS)) out[name] = shift(f.body, k);
  return out;
}

// Recolour an already-built object. Soil is never recoloured — it is earth,
// not finish. Materials are shared per page, so this is cheap.
export function applyFinish(group, id) {
  const pal = paletteFor(id);
  const seen = new Set();
  group.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (!m || !m.name || seen.has(m)) continue;
      seen.add(m);
      const target = pal[m.name];
      if (target !== undefined) m.color.setHex(target);
    }
  });
  return id;
}

// Read ?finish= from the URL, apply it, and keep listening for changes posted
// by the host page so the picker can switch colour without reloading the model.
export function wireFinish(group) {
  const fromUrl = new URLSearchParams(location.search).get('finish');
  let current = getFinish(fromUrl).id;
  applyFinish(group, current);

  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.type !== 'set-finish') return;
    current = getFinish(d.finish).id;
    applyFinish(group, current);
  });

  // Tell the host what we settled on, so its picker can reflect reality.
  try { parent.postMessage({ type: 'finish-ready', finish: current }, '*'); } catch (_) {}
  return current;
}
