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