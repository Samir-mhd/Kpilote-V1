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

export async function getObjectifsManager(): Promise<ObjectifManagerRow[]> {
  const { data, error } = await supabase
    .from("objectifs_mensuels")
    .select(`
      id,
      conseiller_id,
      objectif,
      conseillers (
        nom
      ),
      produits (
        nom,
        code
      )
    `);

  if (error) throw error;

  return (data ?? []) as unknown as ObjectifManagerRow[];
}

export async function updateObjectifMensuel(id: string, objectif: number) {
  const { error } = await supabase
    .from("objectifs_mensuels")
    .update({ objectif })
    .eq("id", id);

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