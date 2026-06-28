import { supabase } from "@/lib/supabase";

export async function getPlanning(conseillerId: string) {
  const { data, error } = await supabase
    .from("planning_conseillers")
    .select("*")
    .eq("conseiller_id", conseillerId)
    .single();

  if (error) throw error;

  return data;
}