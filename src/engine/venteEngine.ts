import { enregistrerVente } from "@/services/ventes";

export type VenteInput = {
  conseillerId: string;
  produit: string;
};

export async function traiterVente({
  conseillerId,
  produit,
}: VenteInput) {
  await enregistrerVente({
    conseillerId,
    produitCode: produit
      .toLowerCase()
      .replace("é", "e")
      .replace("è", "e")
      .replace("ê", "e"),
  });

  return true;
}