import { supabase } from "@/lib/supabase";

export async function enregistrerVente({
  conseillerId,
  produitCode,
}: {
  conseillerId: string;
  produitCode: string;
}) {

  console.log("Recherche :", `"${produitCode}"`);

  const { data, error } = await supabase
    .from("produits")
    .select("*")
    .eq("code", produitCode);

  console.log("Résultat recherche :", data);
  console.log("Erreur recherche :", error);

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error(`Produit introuvable : ${produitCode}`);
  }

  const produit = data[0];

  const { error: insertError } = await supabase
    .from("ventes")
    .insert({
      conseiller_id: conseillerId,
      produit_id: produit.id,
      quantite: 1,
      source: "conseiller",
    });

  if (insertError) throw insertError;
}

/** Supprime définitivement une vente (annulation immédiate — retire aussi la heatmap et le live). */
export async function annulerVente(venteId: string): Promise<void> {
  const { error } = await supabase.from("ventes").delete().eq("id", venteId);
  if (error) throw error;
}

/**
 * Insère une ligne de compensation pour corriger le total du jour d'un produit sans toucher
 * aux ventes déjà saisies (heatmap/live intacts) — source="reset_jour", exclue de leur affichage.
 */
export async function corrigerVentesJour(
  conseillerId: string,
  produitCode: string,
  deltaTotal: number
): Promise<void> {
  if (deltaTotal === 0) return;

  const { data: produit, error } = await supabase
    .from("produits")
    .select("id")
    .eq("code", produitCode)
    .maybeSingle();
  if (error || !produit) throw new Error(error?.message ?? `Produit introuvable : ${produitCode}`);

  const { error: insertError } = await supabase.from("ventes").insert({
    conseiller_id: conseillerId,
    produit_id: produit.id,
    quantite: deltaTotal,
    source: "reset_jour",
  });
  if (insertError) throw insertError;
}