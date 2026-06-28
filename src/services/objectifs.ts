import { supabase } from "@/lib/supabase";

export async function getObjectifsMensuels(conseillerId: string) {
  const premierJour = new Date();
  premierJour.setDate(1);
  premierJour.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("objectifs_mensuels")
    .select(`
      objectif,
      produits (
        nom,
        code
      )
    `)
    .eq("conseiller_id", conseillerId)
    .eq("mois", premierJour.toISOString().substring(0, 10));

  if (error) throw error;

  return data ?? [];
}