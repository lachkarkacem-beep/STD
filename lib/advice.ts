// Le conseil du paysagiste, par famille de produits.
//
// Volontairement par famille et non par référence : les quarante-quatre bacs
// se posent de la même manière, et un texte propre à chacun serait du
// remplissage. Ce qui change d'une famille à l'autre, c'est l'usage, le
// rythme de pose et les végétaux qui s'y plaisent.
//
// `plantes` reprend les identifiants réels du générateur : la fiche propose
// donc des associations que le client peut essayer immédiatement dans la
// visionneuse, et non des noms décoratifs.

export type Advice = {
  usage: string;
  associations: string;
  plantes: string[];
  style: string;
};

export const ADVICE: Record<string, Advice> = {
  "Bacs à fleurs": {
    usage:
      "Posez-les par deux de part et d'autre d'une porte, ou alignés à un mètre d'intervalle pour border une terrasse sans la fermer. Un bac isolé se perd : c'est la répétition qui fait l'effet.",
    associations:
      "Un olivier ou un laurier-rose pour la hauteur, du géranium en pied pour la couleur, des graminées si vous cherchez le mouvement au moindre souffle.",
    plantes: ["olivier", "laurier", "geranium", "graminee"],
    style:
      "Blanc sur façade claire pour un esprit contemporain ; saumon ou rouge clair si vous assumez la note méditerranéenne.",
  },
  "Pots décoratifs": {
    usage:
      "Un pot rond se traite comme une sculpture : laissez-lui de l'espace libre autour, à l'angle d'une terrasse ou en fin de perspective. Groupés par trois de tailles différentes, ils composent un coin entier.",
    associations:
      "Un buis taillé en boule pour la rigueur, des succulentes pour la sobriété, un palmier nain si le pot est large.",
    plantes: ["buis", "succulente", "palmier"],
    style: "Le gris souligne les volumes ronds ; le blanc les allège.",
  },
  Vasques: {
    usage:
      "Une vasque se porte : sur un piédouche, une colonne ou un muret. Posée au sol, elle perd sa raison d'être. Placez-la à hauteur de regard, à l'entrée ou en point de fuite d'une allée.",
    associations:
      "Un retombant discret ou des succulentes : la forme de la coupe doit rester lisible.",
    plantes: ["succulente", "geranium"],
    style: "Le blanc reste le choix classique, le noir en fait une pièce contemporaine.",
  },
  Colonnes: {
    usage:
      "Toujours par paire, pour encadrer un passage, un portail ou une vue. Comptez deux à trois mètres entre elles : trop rapprochées, elles étouffent le passage.",
    associations:
      "Rien sur la colonne elle-même, tout à son pied : un buis boule de chaque côté suffit à l'asseoir.",
    plantes: ["buis"],
    style: "Blanc pour l'esprit classique, gris pour un dessin plus sec et moderne.",
  },
  Veilleuses: {
    usage:
      "Une veilleuse éclaire par en dessous, à hauteur de cheville ou de hanche : elle balise, elle n'inonde pas. Comptez 2,50 à 3 m entre deux lanternes le long d'une allée, pour que les halos se touchent sans se confondre ; isolée, posez-la à l'angle d'une terrasse ou au pied d'un arbre dont elle révélera le tronc.",
    associations:
      "Un massif bas au pied, jamais devant la claire-voie : ce sont les découpes qui font le dessin sur le sol. La V50 porte sa propre coupe — des retombées légères y suffisent, elles ne doivent pas noyer les montants ajourés.",
    plantes: ["lavande", "succulente", "graminee"],
    style:
      "Le blanc renvoie le plus de lumière et se voit de loin ; le gris et le noir s'effacent le jour et ne laissent voir que la flamme la nuit.",
  },
  Clôture: {
    usage:
      "Un piquet tous les 1,50 à 1,60 m, sans exception : c'est cette régularité qui fait une clôture propre. Tendez le grillage une fois les piquets alignés.",
    associations:
      "Doublez d'une haie basse de buis ou d'un rideau de graminées pour adoucir la ligne.",
    plantes: ["buis", "graminee"],
    style: "Le gris disparaît dans le paysage, ce qui est en général ce qu'on cherche.",
  },
  Niches: {
    usage:
      "À l'écart du passage et dos au vent dominant, jamais en plein soleil de l'après-midi. Prévoyez un mètre dégagé devant l'entrée.",
    associations: "Un massif bas à proximité, sans épineux ni laurier-rose, toxique.",
    plantes: ["graminee"],
    style: "Le gris salit moins que le blanc à cet usage.",
  },
  Puits: {
    usage:
      "C'est une pièce maîtresse : donnez-lui le centre d'une pelouse ou le fond d'une perspective, et trois mètres de dégagement tout autour.",
    associations:
      "Une couronne de lavande ou de géraniums à un mètre de la margelle, jamais collée au puits.",
    plantes: ["lavande", "geranium", "graminee"],
    style: "Le blanc évoque le village méditerranéen, le saumon la pierre chaude du Sud.",
  },
  Dallages: {
    usage:
      "Prévoyez une légère pente — un centimètre par mètre — pour que l'eau s'évacue, et calculez la surface en plaques entières pour éviter les coupes en rive.",
    associations:
      "Laissez des poches non pavées pour y poser des bacs : une terrasse entièrement minérale fatigue le regard.",
    plantes: ["olivier", "graminee"],
    style:
      "Motif bois pour une terrasse chaleureuse, tapis ou brique pour un patio, autobloquant pour une allée carrossable.",
  },
  "Tables et bancs": {
    usage:
      "Comptez 70 cm de passage derrière chaque assise et 60 cm par convive. Une table de 155 cm accueille six personnes à l'aise.",
    associations:
      "Deux grands bacs plantés d'oliviers suffisent à faire une pièce à vivre d'un coin de terrasse.",
    plantes: ["olivier", "lavande"],
    style: "Le gris s'accorde au mobilier contemporain, le blanc aux façades claires.",
  },
  "Pas japonais": {
    usage:
      "Espacez-les de 60 cm d'axe en axe : c'est la longueur d'un pas naturel. Enterrez-les au ras de la pelouse pour passer la tondeuse sans les heurter.",
    associations:
      "Laissez l'herbe ou un couvre-sol courir entre les dalles — c'est le contraste qui fait le charme.",
    plantes: ["graminee"],
    style: "Le gris se fond dans le vert ; le blanc dessine franchement le cheminement.",
  },
  Bordures: {
    usage:
      "Une bordure retient la terre et dessine la limite. Enterrez-la d'un tiers de sa hauteur pour qu'elle tienne, et suivez la courbe plutôt que de la contrarier.",
    associations:
      "Derrière la bordure, un massif de lavande ou de dodonaea ; devant, rien, pour que la ligne reste nette.",
    plantes: ["lavande", "dodonaea", "buis"],
    style:
      "Les BP27 ajourées apportent de la dentelle, la T2 et la S restent sobres, les bois réchauffent.",
  },
  "Jets d'eau muraux": {
    usage:
      "Contre un mur porteur, robinet à hauteur de main — entre 90 cm et 1,20 m. Prévoyez l'arrivée d'eau et l'évacuation avant la pose.",
    associations:
      "Un yucca ou un palmier nain de chaque côté : la verticale du feuillage répond à celle du dosseret.",
    plantes: ["yucca", "palmier", "geranium"],
    style: "Le blanc éclaire un patio sombre ; le saumon réchauffe une cour close.",
  },
  Fontaines: {
    usage:
      "Au centre d'une cour ou d'un rond-point d'allée, avec un dégagement égal à deux fois son diamètre. Une fontaine adossée perd la moitié de son effet.",
    associations:
      "Un cercle de bacs bas plantés de buis ou de lavande, à bonne distance des éclaboussures.",
    plantes: ["buis", "lavande", "succulente"],
    style: "Le blanc reste le choix des cours de riad ; le gris convient aux jardins contemporains.",
  },
  Barbecues: {
    usage:
      "Adossé à un mur plein, jamais sous une pergola de bois, et la hotte face aux vents dominants. Prévoyez deux mètres entre le foyer et la table.",
    associations:
      "Des graminées ou un laurier-rose à distance du foyer, pour fermer le coin sans risque.",
    plantes: ["graminee", "laurier"],
    style: "La brique saumon réchauffe une terrasse claire ; la brique rouge assume le côté rustique.",
  },
};

export function adviceFor(category: string): Advice | null {
  return ADVICE[category] ?? null;
}
