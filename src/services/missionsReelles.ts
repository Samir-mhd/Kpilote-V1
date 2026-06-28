import { getObjectifsMensuels } from "@/services/objectifs";
import { getVentesDuJour } from "@/services/stats";
import { calculerObjectifs } from "@/engine/objectifEngine";

type ObjectifSupabase = {
  objectif: number;
  produits: {
    nom: string;
    code: string;
  }[];
};

type VenteSupabase = {
  quantite: number;
  produits: {
    nom: string;
    code: string;
  }[];
};

export async function getMissionsReelles(conseillerId: string) {
  const objectifs = (await getObjectifsMensuels(
    conseillerId
  )) as ObjectifSupabase[];

  const ventes = (await getVentesDuJour(conseillerId)) as VenteSupabase[];

  const joursTravailles = 16;
  const joursRestants = 6;

  const inputs = objectifs.map((objectif) => {
    const produitNom = objectif.produits?.[0]?.nom ?? "Produit";
    const produitCode = objectif.produits?.[0]?.code ?? "";

    const realise = ventes
      .filter((vente) => vente.produits?.[0]?.code === produitCode)
      .reduce((total, vente) => total + vente.quantite, 0);

    return {
      produit: produitNom,
      objectifMensuel: objectif.objectif,
      realise,
      joursTravailles,
      joursRestants,
    };
  });

  return calculerObjectifs(inputs).map((mission) => ({
    produit: mission.produit,
    objectif: mission.objectifJour,
    realise: 0,
    couleur:
      mission.produit === "Box"
        ? "bg-green-500"
        : mission.produit === "Forfaits"
        ? "bg-blue-500"
        : mission.produit === "Téléphones"
        ? "bg-purple-500"
        : mission.produit === "McAfee"
        ? "bg-orange-500"
        : "bg-red-500",
    message: mission.message,
  }));
}