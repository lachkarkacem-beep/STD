// Numéros affichés dans une barre de pagination.
//
// Partagé par le catalogue produits et le catalogue photo, et écrit en
// JavaScript simple pour que `npm run check` puisse le vérifier : cinquante
// et une pages ne tiennent pas dans une barre, et un repli mal fait perd
// l'accès à la première ou à la dernière page.

/**
 * @param {number} current page courante, à partir de 1
 * @param {number} total nombre de pages
 * @returns {(number | "…")[]}
 */
export function pageNumbers(current, total) {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);

  // On garde toujours la première et la dernière, plus les voisines
  // immédiates de la page courante.
  const around = [current - 1, current, current + 1].filter((n) => n > 1 && n < total);
  const list = [1, ...around, total];

  /** @type {(number | "…")[]} */
  const out = [];
  let previous = 0;
  for (const n of list) {
    if (n - previous > 1) out.push("…");
    out.push(n);
    previous = n;
  }
  return out;
}
