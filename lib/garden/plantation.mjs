// Échange de plantation : retirer l'ancienne avant de poser la nouvelle.
//
// Ce geste tient en trois lignes et s'est pourtant révélé faux : la fiche
// produit retirait la plantation d'un groupe qui n'était pas son parent, si
// bien qu'elle restait en place et que la suivante s'y superposait. Chaque
// changement d'espèce ajoutait une couche de feuillage.
//
// Le code est donc sorti du composant pour que le harnais puisse le vérifier
// sur un vrai graphe three.js, sans WebGL.

/**
 * Détache une plantation de l'objet qui la porte réellement, et libère sa
 * géométrie — sans quoi changer dix fois d'espèce laisse dix plantations en
 * mémoire.
 *
 * @param {any} plantation
 */
export function dropPlantation(plantation) {
  if (!plantation) return;
  // Son parent, et non celui qu'on croit : c'est toute l'erreur d'origine.
  if (plantation.parent) plantation.parent.remove(plantation);
  plantation.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose?.();
  });
}

/**
 * Remplace la plantation portée par un modèle. Renvoie la nouvelle, ou null.
 *
 * @param {any} model modèle qui porte la plantation
 * @param {any} next nouvelle plantation (ou null pour n'en poser aucune)
 */
export function swapPlantation(model, next) {
  // On ne se fie pas à une référence conservée ailleurs : on cherche ce que le
  // modèle porte vraiment. Une plantation orpheline d'un rendu précédent est
  // ainsi ramassée elle aussi.
  let previous = model.getObjectByName?.("plantation") ?? null;
  while (previous) {
    dropPlantation(previous);
    previous = model.getObjectByName?.("plantation") ?? null;
  }
  if (!next) return null;
  model.add(next);
  return next;
}

/** Nombre de plantations portées par un modèle — doit toujours valoir 0 ou 1. */
export function countPlantations(model) {
  let n = 0;
  model.traverse((o) => {
    if (o.name === "plantation") n++;
  });
  return n;
}
