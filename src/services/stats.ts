import { supabase } from "@/lib/supabase";

export async function getVentesDuJour(conseillerId: string) {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ventes")
    .select(`
      id,
      quantite,
      date_vente,
      produits (
        code,
        nom
      )
    `)
    .eq("conseiller_id", conseillerId)
    .gte("date_vente", debutJour.toISOString());

  if (error) throw error;

  return data ?? [];
}