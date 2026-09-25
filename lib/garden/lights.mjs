// Veilleuses et mode nuit.
//
// Chaque veilleuse porte dans son GLB un nœud « lumiere-foyer » et un matériau
// « lumiere » : le premier dit où loge la flamme, le second quelle surface
// s'allume. Les hauteurs ci-dessous ne sont pas choisies, elles sont MESURÉES
// dans les fichiers livrés (matrices monde composées jusqu'à la racine) — si
// un modèle est remplacé, le harnais le verra tout de suite.

/** Nom du matériau qui rougeoie, et du nœud qui porte le foyer. */
export const MAT_LUMIERE = "lumiere";
export const NOEUD_FOYER = "lumiere-foyer";

/**
 * Hauteur du foyer au-dessus du sol, en mètres, et hauteur totale du modèle.
 * Mesurées dans public/models_web/glb/<ref>.glb.
 */
export const VEILLEUSES = {
  V23: { foyer: 0.171, hauteur: 0.4, portee: 3.2, intensite: 2.6 },
  V40: { foyer: 0.585, hauteur: 0.8, portee: 4.6, intensite: 4.2 },
  V50: { foyer: 0.298, hauteur: 0.7, portee: 3.8, intensite: 3.2 },
  V90: { foyer: 0.303, hauteur: 0.7, portee: 4.2, intensite: 3.6 },
};

/** Couleur de flamme : celle du matériau « lumiere » livré (1, 0.53, 0.16). */
export const COULEUR_FLAMME = 0xffa855;

/** @param {string} ref */
export function isVeilleuse(ref) {
  return Object.prototype.hasOwnProperty.call(VEILLEUSES, ref);
}

/** Les quatre références, dans l'ordre de hauteur croissante. */
export function veilleuseRefs() {
  return Object.keys(VEILLEUSES).sort((a, b) => VEILLEUSES[a].hauteur - VEILLEUSES[b].hauteur);
}

/**
 * Réglages de la lampe à poser dans une veilleuse.
 * @param {string} ref
 * @param {number} [allumage] 0 = éteinte, 1 = pleine nuit
 */
export function lampSpec(ref, allumage = 1) {
  const v = VEILLEUSES[ref];
  if (!v) return null;
  return {
    y: v.foyer,
    color: COULEUR_FLAMME,
    // Une lampe éteinte ne doit rien éclairer du tout, pas « presque rien ».
    intensity: v.intensite * allumage,
    distance: v.portee,
    decay: 2,
    // Rougeoiement de la surface ajourée elle-même : c'est ce qu'on voit de
    // loin, la lampe ne fait que le halo autour.
    emissive: allumage,
  };
}

/**
 * Allume (ou éteint) une veilleuse dans un modèle chargé.
 *
 * La lampe est accrochée au nœud « lumiere-foyer » du GLB lui-même : il n'y a
 * donc aucune hauteur à recalculer, et si un modèle est remplacé la flamme
 * reste à sa place. La hauteur mesurée ne sert que de repli, au cas où le nœud
 * viendrait à disparaître.
 *
 * @param {any} THREE
 * @param {any} model modèle chargé (non mis à l'échelle)
 * @param {string} ref
 * @param {number} allumage 0 = éteinte, 1 = pleine nuit
 */
export function lightVeilleuse(THREE, model, ref, allumage) {
  const spec = lampSpec(ref, allumage);
  if (!spec) return null;

  let lamp = model.userData.lampeVeilleuse ?? null;
  if (!lamp) {
    lamp = new THREE.PointLight(spec.color, 0, spec.distance, spec.decay);
    const foyer = model.getObjectByName?.(NOEUD_FOYER) ?? null;
    if (foyer) {
      foyer.add(lamp);
    } else {
      lamp.position.set(0, spec.y, 0);
      model.add(lamp);
    }
    // Pas d'ombre portée : plusieurs lampes à ombres feraient chuter la scène
    // sur mobile, pour un gain invisible à travers une claire-voie.
    model.userData.lampeVeilleuse = lamp;
  }
  lamp.intensity = spec.intensity;

  // La paroi ajourée rougeoie d'elle-même : c'est elle qu'on voit de loin, la
  // lampe ne fait que le halo autour.
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || m.name !== MAT_LUMIERE) continue;
      m.emissive?.setHex(spec.color);
      m.emissiveIntensity = spec.emissive;
    }
  });

  return lamp;
}

/**
 * Ambiance d'une fiche produit selon l'heure.
 *
 * Elle diffère de celle du jardin : la fiche n'a ni ciel ni brouillard, et le
 * jour son fond reste celui de la page. La nuit, en revanche, il faut un fond
 * sombre — sur du blanc, une lanterne allumée ne se voit pas.
 *
 * @param {"jour"|"nuit"} moment
 */
export function ambianceFiche(moment) {
  if (moment === "nuit") {
    return {
      fond: 0x151d2b, // fond opaque : indispensable pour voir la flamme
      hemiCiel: 0x354562, // bleu nuit
      hemiSol: 0x181410,
      hemiIntensite: 0.5,
      cle: 0xaebdd8, // clair de lune
      cleIntensite: 0.35,
      ombre: 0.35,
      allumage: 1,
    };
  }
  return {
    fond: null, // transparent : la fiche garde le fond clair de la page
    hemiCiel: 0xffffff,
    hemiSol: 0xd8d8d0,
    hemiIntensite: 2.2,
    cle: 0xfff6e8,
    cleIntensite: 2.4,
    ombre: 0.22,
    allumage: 0,
  };
}

/**
 * Ambiance de la scène selon l'heure choisie.
 * Le mode nuit ne se contente pas d'allumer : il éteint le reste, sans quoi
 * les veilleuses ne se verraient pas.
 *
 * @param {"jour"|"nuit"} moment
 */
export function ambiance(moment) {
  if (moment === "nuit") {
    return {
      ciel: 0x0e1626,
      brouillard: 0x0e1626,
      hemiCiel: 0x2a3a5c,
      hemiSol: 0x14100c,
      hemiIntensite: 0.35,
      soleil: 0x9fb4d8, // clair de lune
      soleilIntensite: 0.35,
      soleilPos: [-6, 9, -4],
      exposition: 0.95,
      allumage: 1,
    };
  }
  return {
    ciel: 0xdfeaf5,
    brouillard: 0xdfeaf5,
    hemiCiel: 0xffffff,
    hemiSol: 0xc8bfa8,
    hemiIntensite: 2.1,
    soleil: 0xfff4e4,
    soleilIntensite: 2.4,
    soleilPos: [8, 12, 6],
    exposition: 1,
    allumage: 0,
  };
}
