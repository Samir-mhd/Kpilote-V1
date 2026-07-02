import { supabase } from "@/lib/supabase";

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