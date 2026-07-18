import { supabase } from "@/lib/supabase";

export type ObjectifsProduits = {
  box: number;
  forfaits: number;
  telephones: number;
  mcafee: number;
  assurance: number;
};

export type ConseillerClassement = {
  id: string;
  prenom: string;
  ventes: number;
  box: number;
  forfaits: number;
  telephones: number;
  mcafee: number;
  assurance: number;
  objectifs: ObjectifsProduits;
};

function classementVide(conseillers: { id: string; nom: string }[]): ConseillerClassement[] {
  return conseillers.map((c) => ({
    id: c.id,
    prenom: c.nom, // on garde la propriété "prenom" pour ne rien casser dans l'UI
    ventes: 0,
    box: 0,
    forfaits: 0,
    telephones: 0,
    mcafee: 0,
    assurance: 0,
    objectifs: {
      box: 0,
      forfaits: 0,
      telephones: 0,
      mcafee: 0,
      assurance: 0,
    },
  }));
}

function appliquerVentes(classement: ConseillerClassement[], ventes: any[]) {
  ventes.forEach((vente: any) => {
    const conseiller = classement.find(
      (c) => c.id === vente.conseiller_id
    );

    if (!conseiller) return;

    const produit = Array.isArray(vente.produits)
      ? vente.produits[0]
      : vente.produits;

    // Spiderhome = historisation → exclu du classement commercial
    if (produit?.code === "spiderhome") return;

    conseiller.ventes += vente.quantite;

    switch (produit?.code) {
      case "box":
        conseiller.box += vente.quantite;
        break;

      case "forfaits":
        conseiller.forfaits += vente.quantite;
        break;

      case "telephones":
        conseiller.telephones += vente.quantite;
        break;

      case "mcafee":
        conseiller.mcafee += vente.quantite;
        break;

      case "assurance":
        conseiller.assurance += vente.quantite;
        break;
    }
  });
}

function appliquerObjectifs(classement: ConseillerClassement[], objectifs: any[]) {
  objectifs.forEach((objectif: any) => {
    const conseiller = classement.find(
      (c) => c.id === objectif.conseiller_id
    );

    if (!conseiller) return;

    const produit = Array.isArray(objectif.produits)
      ? objectif.produits[0]
      : objectif.produits;

    switch (produit?.code) {
      case "box":
        conseiller.objectifs.box += objectif.objectif;
        break;

      case "forfaits":
        conseiller.objectifs.forfaits += objectif.objectif;
        break;

      case "telephones":
        conseiller.objectifs.telephones += objectif.objectif;
        break;

      case "mcafee":
        conseiller.objectifs.mcafee += objectif.objectif;
        break;

      case "assurance":
        conseiller.objectifs.assurance += objectif.objectif;
        break;
    }
  });
}

export async function construireClassementManager() {
  const { data: conseillers, error: conseillersError } = await supabase
    .from("conseillers")
    .select("id, nom");

  if (conseillersError) throw conseillersError;

  // Filtre sur le mois en cours uniquement
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const finMois   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: ventes, error: ventesError } = await supabase
    .from("ventes")
    .select(`
      conseiller_id,
      quantite,
      produits (
        code
      )
    `)
    .gte("created_at", debutMois)
    .lte("created_at", finMois);

  if (ventesError) throw ventesError;

  const { data: objectifs, error: objectifsError } = await supabase
    .from("objectifs_mensuels")
    .select(`
      conseiller_id,
      objectif,
      produits (
        code
      )
    `);

  if (objectifsError) throw objectifsError;

  const classement = classementVide(conseillers ?? []);

  appliquerVentes(classement, ventes ?? []);
  appliquerObjectifs(classement, objectifs ?? []);

  classement.sort((a, b) => b.ventes - a.ventes);

  return classement;
}

export { classementVide, appliquerVentes };