import { supabase } from "@/lib/supabase";

export async function getConseillers() {

  const { data, error } = await supabase
    .from("conseillers")
    .select("*")
    .order("ordre");

  if (error) throw error;

  return data ?? [];

}

export async function getChallengeSuggestion(
  conseillerId: string
) {

  const conseillers = await getConseillers();

  const { data: ventes } = await supabase
    .from("ventes")
    .select(`
      conseiller_id,
      quantite,
      produits(
        nom
      )
    `);

  if (!conseillers.length) {

    return {

      adversaire: "Julie",

      produit: "Assurance",

      duree: "30 min",

      raison: "Aucune donnée disponible.",

    };

  }

  const moi =
    conseillers.find(c => c.id == conseillerId);

  if (!moi) {

    return {

      adversaire: conseillers[0].prenom,

      produit: "Assurance",

      duree: "30 min",

      raison: "Conseiller introuvable.",

    };

  }

  // ======================================
  // Recherche d'un adversaire proche
  // ======================================

  const adversaire = conseillers
    .filter(c => c.id != conseillerId)
    .sort((a, b) => {

      const ecartA =
        Math.abs((a.ordre ?? 0) - (moi.ordre ?? 0));

      const ecartB =
        Math.abs((b.ordre ?? 0) - (moi.ordre ?? 0));

      return ecartA - ecartB;

    })[0];

  // ======================================
  // Analyse des ventes réelles
  // ======================================

  const compteur: Record<string, number> = {};

  (ventes ?? []).forEach((vente: any) => {

    const produit = Array.isArray(vente.produits)
      ? vente.produits[0]
      : vente.produits;

    if (!produit) return;

    compteur[produit.nom] =
      (compteur[produit.nom] ?? 0) + vente.quantite;

  });

  const classementProduits =
    Object.entries(compteur)
      .sort((a, b) => a[1] - b[1]);

  const produit =
    classementProduits.length
      ? classementProduits[0][0]
      : "Assurance";

  // ======================================
  // Durée intelligente
  // ======================================

  let duree = "30 min";

  const ecart =
    Math.abs(
      (moi.ordre ?? 0) -
      (adversaire.ordre ?? 0)
    );

  if (ecart <= 1)
    duree = "10 min";
  else if (ecart <= 3)
    duree = "30 min";
  else if (ecart <= 5)
    duree = "1 h";
  else
    duree = "2 h";

  return {

    adversaire: adversaire.prenom,

    produit,

    duree,

    raison:
      `${produit} est actuellement le produit le moins performant de la boutique.`

  };

}