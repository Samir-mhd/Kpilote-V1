import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";

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

function classementVide(conseillers: { id: string; nom: string; profil_actif?: boolean | null }[]): ConseillerClassement[] {
  // Profil désactivé (mode restreint) : invisible du classement et des totaux boutique
  return conseillers.filter((c) => c.profil_actif !== false).map((c) => ({
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
    .select("id, nom, profil_actif");

  if (conseillersError) throw conseillersError;

  // Filtre sur le mois en cours uniquement
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const finMois   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Paginé : au-delà de 1000 lignes (plafond Supabase par défaut), les ventes de toute
  // l'équipe sur un mois seraient coupées silencieusement, sans tri garanti.
  const ventes = await fetchToutesLesLignes((from, to) =>
    supabase
      .from("ventes")
      .select(`
        conseiller_id,
        quantite,
        produits (
          code
        )
      `)
      .gte("created_at", debutMois)
      .lte("created_at", finMois)
      .order("created_at", { ascending: true })
      .range(from, to)
  );

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