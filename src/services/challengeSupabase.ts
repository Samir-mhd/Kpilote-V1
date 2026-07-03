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
    // started_at = now() pour les challenges "running" immédiatement (manager)
    // Pour les défis "pending", started_at sera rempli à l'acceptation
    ...(data.statusInitial === "running" && { started_at: new Date().toISOString() }),
  };

  if (data.objectif !== undefined) {
    payload.objectif = data.objectif;
  }

  let result = await supabase.from("challenges").insert(payload).select().single();

  // Fallback si objectif ou started_at absent du schema cache
  if (result.error?.message?.includes("objectif") || result.error?.message?.includes("started_at")) {
    const { objectif: _o, started_at: _s, ...payloadSans } = payload;
    result = await supabase.from("challenges").insert(payloadSans).select().single();
  }

  if (result.error) throw result.error;
  return result.data;
}
