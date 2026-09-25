// Liste typée des espèces, pour l'interface. La géométrie, elle, est produite
// par public/3d/plants-builder.js (chargé à la demande dans la visionneuse).
// Les deux listes doivent rester alignées ; `npm run check` le vérifie.

export type PlantSpecies = { id: string; label: string };

export const PLANT_SPECIES: PlantSpecies[] = [
  { id: "geranium", label: "Géranium" },
  { id: "lavande", label: "Lavande" },
  { id: "rosier", label: "Rosier buisson" },
  { id: "laurier", label: "Laurier-rose" },
  { id: "buis", label: "Buis boule" },
  { id: "olivier", label: "Olivier" },
  { id: "bonsai", label: "Olivier bonsaï" },
  { id: "dodonaea", label: "Dodonaea" },
  { id: "yucca", label: "Yucca elephantipes" },
  { id: "palmier", label: "Palmier nain" },
  { id: "succulente", label: "Succulentes" },
  { id: "graminee", label: "Graminées" },
];
