import { supabase } from "@/lib/supabase";

// ─── Objectifs Boutique ───────────────────────────────────────────────────────

export type ObjectifBoutiqueRow = {
    id: string;
    produit_id: string;
    objectif: number;
    produits: { nom: string; code: string } | null;
};

export async function getObjectifsBoutique(): Promise<ObjectifBoutiqueRow[]> {
    const { data, error } = await supabase
        .from("objectifs_boutique")
        .select("id, produit_id, objectif, produits(nom, code)");

    if (error) throw error;
    return (data ?? []) as unknown as ObjectifBoutiqueRow[];
}

export async function upsertObjectifBoutique(
    produitId: string,
    objectif: number
): Promise<void> {
    const { error } = await supabase
        .from("objectifs_boutique")
        .upsert({ produit_id: produitId, objectif }, { onConflict: "produit_id" });

    if (error) throw error;
}

/** Retourne les produits disponibles pour pré-remplir si objectifs_boutique vide. */
export async function getProduits() {
    const { data } = await supabase.from("produits").select("id, nom, code").order("nom");
    return (data ?? []) as { id: string; nom: string; code: string }[];
}

export type ObjectifManagerRow = {
  id: string;
  conseiller_id: string;
  objectif: number;
  conseillers: { nom: string } | null;
  produits: { nom: string; code: string } | null;
};

/** Profil désactivé (espace restreint conseiller) : invisible des outils de gestion manager
 *  (objectifs, planning, reset ventes) — même convention que classement/badges/feed. */
export async function getObjectifsManager(): Promise<ObjectifManagerRow[]> {
  const { data, error } = await supabase
    .from("objectifs_mensuels")
    .select(`
      id,
      conseiller_id,
      objectif,
      conseillers (
        nom,
        profil_actif
      ),
      produits (
        nom,
        code
      )
    `);

  if (error) throw error;

  return ((data ?? []) as unknown as (ObjectifManagerRow & { conseillers: { nom: string; profil_actif: boolean | null } | null })[])
    .filter((row) => row.conseillers?.profil_actif !== false);
}

export async function updateObjectifMensuel(id: string, objectif: number) {
  const { error } = await supabase
    .from("objectifs_mensuels")
    .update({ objectif })
    .eq("id", id);

  if (error) throw error;
}

function moisCourantISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Crée les lignes objectifs_mensuels (une par produit, objectif = 0) pour un conseiller qui
 * n'en a encore aucune — sans quoi il n'apparaît dans aucune grille d'objectifs manager
 * (celles-ci sont construites à partir des lignes existantes, jamais depuis la table conseillers).
 * Appelée automatiquement à la création d'un conseiller.
 */
export async function initialiserObjectifsMensuels(conseillerId: string): Promise<void> {
    const { data: produits, error: errProduits } = await supabase.from("produits").select("id");
    if (errProduits) throw errProduits;
    if (!produits?.length) return;

    const mois = moisCourantISO();
    const { error } = await supabase.from("objectifs_mensuels").insert(
        produits.map((p: any) => ({ conseiller_id: conseillerId, produit_id: p.id, objectif: 0, mois }))
    );
    if (error) throw error;
}

export async function getObjectifsMensuels(conseillerId: string) {

  console.log("Recherche objectifs pour :", conseillerId);

  const { data, error } = await supabase
    .from("objectifs_mensuels")
    .select(`
      *,
      produits (
        nom,
        code
      )
    `)
    .eq("conseiller_id", conseillerId);

  console.log("Erreur objectifs :", error);
  console.log("Objectifs trouvés :", data);

  if (error) throw error;

  return data ?? [];
}