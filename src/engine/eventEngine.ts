export type KpiloteEvent =
  | "PREMIERE_VENTE"
  | "VENTE_SIMPLE"
  | "DOUBLE"
  | "TRIPLE"
  | "QUADRUPLE"
  | "MISSION_TERMINEE"
  | "AVANCE_PRISE";

type EventInput = {
  score: number;
  objectif: number;
  totalVentesJour: number;
};

export function detecterEvenement({
  score,
  objectif,
  totalVentesJour,
}: EventInput): KpiloteEvent {
  if (score > objectif) return "AVANCE_PRISE";
  if (score === objectif) return "MISSION_TERMINEE";
  if (totalVentesJour === 4) return "QUADRUPLE";
  if (totalVentesJour === 3) return "TRIPLE";
  if (totalVentesJour === 2) return "DOUBLE";
  if (totalVentesJour === 1) return "PREMIERE_VENTE";
  return "VENTE_SIMPLE";
}