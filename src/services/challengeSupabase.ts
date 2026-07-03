import { supabase } from "@/lib/supabase";

export async function creerChallenge(data: {
  createur: string;
  adversaire: string;
  produit: string;
  duree: number;
  raison: string;
  objectif?: number;
  /** "pending" (défaut) ou "running" pour les challenges manager directs */
  statusInitial?: "pending" | "running";
}) {
  const payload: Record<string, unknown> = {
    createur: data.createur,
    adversaire: data.adversaire,
    produit: data.produit,
    duree: data.duree,
    raison: data.raison,
    status: data.statusInitial ?? "pending",
  };

  if (data.objectif !== undefined) {
    payload.objectif = data.objectif;
  }

  let result = await supabase.from("challenges").insert(payload).select().single();

  // Si la colonne objectif n'existe pas encore, on réessaie sans elle
  if (result.error?.message?.includes("objectif")) {
    const { objectif: _o, ...payloadSans } = payload;
    result = await supabase.from("challenges").insert(payloadSans).select().single();
  }

  if (result.error) throw result.error;
  return result.data;
}
