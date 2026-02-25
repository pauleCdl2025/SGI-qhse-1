// Liste des prestataires disponibles pour les formations
export const PRESTATAIRES = [
  "DOUMI'S",
  "HSE Gabon",
  "MBAYE",
  "Prolifte",
  "Bodyguard",
  "Modou",
  "King",
  "Felix",
  "Bernardo",
  "Miguel"
] as const;

export type Prestataire = typeof PRESTATAIRES[number];
