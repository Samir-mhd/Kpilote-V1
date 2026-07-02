import { enregistrerVente } from "@/services/ventes";

export type VenteInput = {
  conseillerId: string;
  produit: string;
};

function normaliserProduit(produit: string) {
  return produit
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function traiterVente({
  conseillerId,
  produit,
}: VenteInput) {

  await enregistrerVente({
    conseillerId,
    produitCode: normaliserProduit(produit),
  });

  return true;
}