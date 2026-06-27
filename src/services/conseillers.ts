import { supabase } from "@/lib/supabase";

export async function getConseillers() {
  const { data, error } = await supabase
    .from("conseillers")
    .select("*")
    .order("ordre");

  console.log("DATA :", data);
  console.log("ERROR :", error);

  if (error) {
    throw error;
  }

  return data ?? [];
}