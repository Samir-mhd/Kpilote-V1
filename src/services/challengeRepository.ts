import { supabase } from "@/lib/supabase";

/** Invitations en attente reçues par le conseiller (il est l'adversaire). */
export async function getInvitationsPendantes(conseillerId: string) {
    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("adversaire", conseillerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/** Accepter un défi → passe en "running". */
export async function accepterChallenge(id: string): Promise<void> {
    const { error } = await supabase
        .from("challenges")
        .update({ status: "running" })
        .eq("id", id);
    if (error) throw new Error(error.message);
}

/** Refuser un défi → supprime la ligne. */
export async function refuserChallenge(id: string): Promise<void> {
    const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", id);
    if (error) throw new Error(error.message);
}

export async function getChallengeActif(conseillerId: string) {
    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .or(`createur.eq.${conseillerId},adversaire.eq.${conseillerId}`)
        .in("status", ["pending", "running"])
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Clôture un défi expiré : détermine le vainqueur et passe status → "finished".
 */
export async function cloturerChallenge(challenge: {
    id: string;
    createur: string;
    adversaire: string;
    score_createur: number | null;
    score_adversaire: number | null;
}): Promise<void> {
    const sc = challenge.score_createur ?? 0;
    const sa = challenge.score_adversaire ?? 0;

    let vainqueur: string | null = null;
    if (sc > sa) vainqueur = challenge.createur;
    else if (sa > sc) vainqueur = challenge.adversaire;
    // null = égalité

    await supabase
        .from("challenges")
        .update({ status: "finished", vainqueur })
        .eq("id", challenge.id);
}
