// Tous les textes du site, regroupés ici pour pouvoir les retoucher sans
// ouvrir les composants.
//
// Ton : sobre, précis, artisanal. On écrit comme le responsable de l'atelier
// de Bizerte parlerait à un client debout devant les pièces — phrases courtes,
// matière, proportions, usage, tenue dans le temps. On montre et on explique,
// on ne vend pas.
//
// À proscrire : « découvrez », « plongez dans », « laissez-vous séduire »,
// « sublimez », « au cœur de », « une expérience unique », et toute phrase qui
// sonne mieux qu'elle ne dit.
//
// Aucun chiffre de catalogue en dur ici : les compteurs se calculent depuis
// products.json, sinon ils deviennent faux à la première référence ajoutée.

export const HERO = {
  kicker: "Pierre reconstituée · Atelier de Bizerte",
  title: "La pierre, moulée à Bizerte",
  subtitle:
    "Pots, bacs à fleurs, vasques, colonnes, bordures, dallages. Des pièces lourdes, qui restent dehors toute l'année et prennent la patine au lieu de se salir. Elles tiennent aussi bien sur une terrasse neuve que dans un jardin d'oliviers.",
  primaryCta: "Voir le catalogue",
  secondaryCta: "Feuilleter le catalogue papier",
};

export const VALUE_PROPS = [
  {
    title: "Chaque pièce en 3D",
    body: "Tournez-la, changez le coloris, jugez les proportions à l'écran. Les cotes affichées sont celles de l'atelier : ce que vous voyez fait la taille annoncée.",
  },
  {
    title: "Cinq coloris",
    body: "Blanc, gris, noir, saumon, rouge terre. La teinte est dans la masse et non en surface — un éclat se voit peu, et ne se rattrape pas au pinceau.",
  },
  {
    title: "Les mêmes moules d'une année sur l'autre",
    body: "Si vous complétez un aménagement dans deux ans, le relief et les proportions seront les mêmes. C'est tout l'intérêt de travailler au moule plutôt qu'à la série.",
  },
  {
    title: "Pas de panier",
    body: "Vous réunissez ce qui vous intéresse, vous nous dites le projet — quantités, délais, accès au chantier. On répond avec un prix, sous 24 à 48 heures.",
  },
];

export const STEPS = [
  {
    number: "01",
    title: "Regardez les pièces",
    body: "Le catalogue en 3D : pots, bacs, vasques, colonnes, veilleuses, puits, bordures, dallages.",
  },
  {
    number: "02",
    title: "Composez votre sélection",
    body: "Coloris, quantités, et deux mots sur l'endroit : terrasse, allée, bord de bassin. Le contexte change souvent ce qu'on vous conseillera.",
  },
  {
    number: "03",
    title: "Recevez le prix",
    body: "Sous 24 à 48 heures, dans votre espace. Avec les délais et le poids de l'ensemble, qui décide souvent du mode de livraison.",
  },
];

export const AUDIENCE = {
  title: "Particuliers et professionnels",
  body: "Architectes, paysagistes, hôtels, collectivités — ou quelqu'un qui refait sa terrasse. Les quantités et les délais n'ont rien à voir d'un cas à l'autre : indiquez votre métier à l'inscription, la réponse en tiendra compte.",
};

export const FINAL_CTA = {
  title: "Dites-nous le projet",
  body: "Réunissez les pièces qui vous intéressent, ajoutez deux mots sur l'endroit. Réponse sous 24 à 48 heures.",
  cta: "Composer mon devis",
};

// Une phrase par famille, en tête de fiche produit et sur le catalogue. On y
// dit ce que la pièce est et comment elle se pose — pas ce qu'elle évoque.
// Les clés correspondent aux catégories de products.json.
export const CATEGORY_TEASERS: Record<string, string> = {
  "Bacs à fleurs":
    "Rectangulaires ou carrés, façade à lames ou à bandeaux. On les aligne le long d'une terrasse, ou on s'en sert pour fermer un espace sans monter un mur.",
  "Pots décoratifs":
    "Hexagonaux et ronds, à panneaux ou à écailles. Un pot rond tient un angle à lui seul ; groupés par trois, de tailles différentes, ils font un massif.",
  Vasques:
    "Des coupes larges, à poser sur une colonne ou un muret. Au sol, elles perdent leur dessin : c'est vues d'en dessous qu'elles valent.",
  Colonnes:
    "Par paire, pour tenir un passage ou porter une vasque. Deux à trois mètres entre elles — plus rapprochées, elles étouffent le passage.",
  Veilleuses:
    "Des lanternes à claire-voie. Une fois allumées, ce sont les découpes qui font le dessin sur le sol, pas la lumière elle-même.",
  Clôture:
    "Des piquets, et le grillage tendu après. Un tous les 1,50 à 1,60 m : c'est cette régularité qui fait une clôture propre.",
  Niches:
    "Un abri qui reste dehors toute l'année. Dos au vent, à l'écart du passage, jamais plein sud l'après-midi.",
  Puits:
    "Décoratif, avec son arceau en fer forgé. Il lui faut du vide autour : c'est une pièce qu'on regarde de loin.",
  Dallages:
    "Dalles et pavés autobloquants, motifs bois, tapis ou brique. Comptez la surface en plaques entières, les coupes en rive se voient.",
  "Tables et bancs":
    "Table, bancs et tabourets, avec un décor de carreaux. Ça pèse, ça ne bouge pas, ça passe l'hiver dehors.",
  "Pas japonais":
    "Des dalles posées dans l'herbe, 60 cm d'axe en axe — la longueur d'un pas. Au ras de la pelouse, pour ne pas gêner la tondeuse.",
  Bordures:
    "Ajourées, dentelées ou sobres. Elles retiennent la terre et tiennent la ligne ; enterrez-en un tiers pour qu'elles ne basculent pas.",
  "Jets d'eau muraux":
    "Fontaine murale, robinet en fer forgé. Le bruit de l'eau change une cour close, et ça ne prend pas de place au sol.",
  Fontaines:
    "Vasques superposées, feuillages, flamme au sommet. C'est la pièce qu'on met au centre, avec du dégagement autour.",
  Barbecues:
    "Pierre et brique, grille en fer, hotte en option. Adossé à un mur plein, et deux mètres entre le foyer et la table.",
};

export const CATALOGUE_INTRO =
  "Le catalogue en 3D, en cinq coloris. Tournez les pièces, regardez les proportions : les cotes affichées sont celles de l'atelier.";

export const CATALOGUE_OUTRO =
  "Une pièce vous intéresse ? Ajoutez-la au devis. Réponse sous 24 à 48 heures.";

export const FLIPBOOK_TITLE = "Le catalogue papier";

export const FLIPBOOK_INTRO =
  "Les pages telles qu'elles sont imprimées. Tirez un coin pour tourner, ou servez-vous des flèches en dessous.";

// Sous le livre, à voix basse : la même chose dite à qui n'aurait pas lu
// l'introduction en arrivant.
export const FLIPBOOK_HINT =
  "Tirez un coin de page, ou glissez du doigt sur l'écran.";

export const SIGNUP_INTRO =
  "Votre espace sert à réunir les pièces, à nous envoyer le projet et à retrouver nos réponses au même endroit.";

export const DEVIS_INTRO =
  "Vérifiez la sélection, puis dites-nous le reste : quantités, délais, lieu de livraison, accès au chantier. Réponse sous 24 à 48 heures.";

export const COMPTE_INTRO =
  "Vos demandes et nos réponses. On répond sous 24 à 48 heures.";
