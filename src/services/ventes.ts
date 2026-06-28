import { supabase } from "@/lib/supabase";

export async function enregistrerVente({
  conseillerId,
  produitCode,
}: {
  conseillerId: string;
  produitCode: string;
}) {
  const { data: produit, error: produitError } = await supabase
    .from("produits")
    .select("id")
    .eq("code", produitCode)
    .single();

  if (produitError) throw produitError;

  const { error } = await supabase.from("ventes").insert({
    conseiller_id: conseillerId,
    produit_id: produit.id,
    quantite: 1,
    source: "conseiller",
  });

  if (error) throw error;
}