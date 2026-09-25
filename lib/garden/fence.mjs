// Choix des travées de grillage entre piquets.
//
// Première version : on reliait toute paire de piquets distante de moins de
// 2 m. Sur une clôture régulière cela tombait juste, mais des piquets posés
// à la main donnaient soit rien du tout (trop espacés), soit une toile
// d'araignée (tous voisins les uns des autres).
//
// Chaque piquet ne retient que ses deux plus proches voisins, et la travée
// n'est posée que si le voisinage est **mutuel**. Cette réciprocité est
// nécessaire : un piquet d'extrémité n'a qu'un voisin de pourtour, et son
// deuxième plus proche est alors celui d'après, ce qui poserait une travée
// par-dessus la première.

const VOISINS = 2;

/**
 * @param {{x: number, z: number}[]} posts
 * @param {number} maxSpan portée maximale d'une travée, en mètres
 * @returns {[number, number][]} couples d'indices à relier
 */
export function fenceEdges(posts, maxSpan = 2.5) {
  const prochesDe = posts.map((_, i) => {
    const candidats = [];
    for (let j = 0; j < posts.length; j++) {
      if (j === i) continue;
      const d = Math.hypot(posts[j].x - posts[i].x, posts[j].z - posts[i].z);
      // Deux piquets confondus ne forment pas une travée.
      if (d < 0.05 || d > maxSpan) continue;
      candidats.push({ j, d });
    }
    candidats.sort((a, b) => a.d - b.d);
    return new Set(candidats.slice(0, VOISINS).map((c) => c.j));
  });

  /** @type {[number, number][]} */
  const edges = [];
  for (let i = 0; i < posts.length; i++) {
    for (const j of prochesDe[i]) {
      if (j > i && prochesDe[j].has(i)) edges.push([i, j]);
    }
  }
  return edges;
}
