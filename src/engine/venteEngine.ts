import { enregistrerVente } from "@/services/ventes";
import { PRODUITS_ORDRE } from "@/utils/produits";

export type VenteInput = {
  conseillerId: string;
  produit: string;
};

function normaliserProduit(produit: string) {
  // Priorit\u00e9 au mapping canonique (le nom affich\u00e9 peut diverger du code r\u00e9el en base,
  // ex. "R\u00e9cap Co" affich\u00e9 mais code produit rest\u00e9 "recap_commercial" apr\u00e8s renommage).
  const connu = PRODUITS_ORDRE.find((p) => p.label === produit)?.code;
  if (connu) return connu;

  return produit
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ /g, "_");
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