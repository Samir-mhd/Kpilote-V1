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

/** Accepter un défi → passe en "running".
 *  Stocke started_at = maintenant (source de vérité pour le chrono inter-appareils).
 *  Efface le cache sessionStorage pour repartir du vrai started_at. */
export async function accepterChallenge(id: string): Promise<void> {
    const now = new Date().toISOString();

    // Efface le cache localStorage AVANT l'update DB → chargerChallenge recalcule depuis started_at
    try { localStorage.removeItem(`kpilote-expires-${id}`); } catch {}

    const { error } = await supabase
        .from("challenges")
        .update({ status: "running", started_at: now })
        .eq("id", id);

    if (error) {
        // Schema cache pas à jour → fallback sans started_at
        if (error.message?.includes("started_at") || error.message?.includes("schema")) {
            const startMs = Date.now();
            // Le cache sera créé par chargerChallenge au prochain chargement
            const { error: e2 } = await supabase
                .from("challenges")
                .update({ status: "running" })
                .eq("id", id);
            if (e2) throw new Error(e2.message);
        } else {
            throw new Error(error.message);
        }
    }
}

/** Refuser un défi → supprime la ligne. */
export async function refuserChallenge(id: string): Promise<void> {
    const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", id);
    if (error) throw new Error(error.message);
}

/** Défi actif pour un conseiller (pending ou running). */
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
 * Clôture un défi : passe status → "finished".
 * Note : la colonne vainqueur n'existe pas encore dans challenges — on clôture sans elle.
 */
export async function cloturerChallenge(challenge: {
    id: string;
    createur?: string;
    adversaire?: string;
    score_createur?: number | null;
    score_adversaire?: number | null;
}): Promise<void> {
    // Détermine le vainqueur selon les scores
    const sc = challenge.score_createur ?? 0;
    const sa = challenge.score_adversaire ?? 0;
    const vainqueur = sc > sa ? challenge.createur
        : sa > sc ? challenge.adversaire
        : null; // null = égalité

    const update: Record<string, unknown> = { status: "finished" };
    if (vainqueur !== undefined) update.vainqueur = vainqueur;

    const { error } = await supabase
        .from("challenges")
        .update(update)
        .eq("id", challenge.id);

    // Si vainqueur échoue (colonne absente), retry sans
    if (error?.message?.includes("vainqueur")) {
        await supabase.from("challenges").update({ status: "finished" }).eq("id", challenge.id);
    }

    try { localStorage.removeItem(`kpilote-expires-${challenge.id}`); } catch {}
}

/** Tous les défis actifs (pending/running) — pour la vue manager. */
export type DefiActifManager = {
    id: string;
    createurId: string;
    adversaireId: string;
    createurNom: string;
    adversaireNom: string;
    produit: string;
    duree: number;
    objectif: number;
    scoreCreateur: number;
    scoreAdversaire: number;
    createdAt: string;
    expiresAt: number;
    status: string;
};

export async function chargerDefisActifsManager(): Promise<DefiActifManager[]> {
    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false });

    if (error) return [];
    if (!data?.length) return [];

    const ids = [...new Set(data.flatMap((c: any) => [c.createur, c.adversaire].filter(Boolean)))];
    const { data: conseillers } = await supabase
        .from("conseillers")
        .select("id, nom")
        .in("id", ids);

    const nomMap: Record<string, string> = {};
    (conseillers ?? []).forEach((c: any) => { nomMap[c.id] = c.nom; });

    const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";
    return data.map((c: any) => ({
        id:              c.id,
        createurId:      c.createur,
        adversaireId:    c.adversaire,
        createurNom:     c.createur  === MANAGER_UUID ? "Votre manager" : nomMap[c.createur]  ?? "?",
        adversaireNom:   c.adversaire === MANAGER_UUID ? "Votre manager" : nomMap[c.adversaire] ?? "?",
        produit:         c.produit ?? "—",
        duree:           c.duree ?? 30,
        objectif:        c.objectif ?? 0,
        scoreCreateur:   c.score_createur ?? 0,
        scoreAdversaire: c.score_adversaire ?? 0,
        createdAt:       c.created_at,
        expiresAt:       (() => {
            const dureeMs = (c.duree ?? 30) * 60 * 1000;
            const lsKey   = `kpilote-expires-${c.id}`;
            if (c.started_at) {
                const exp = new Date(c.started_at).getTime() + dureeMs;
                try { localStorage.setItem(lsKey, String(exp)); } catch {}
                return exp;
            }
            const cached = (() => { try { return localStorage.getItem(lsKey); } catch { return null; } })();
            if (cached) return parseInt(cached);
            const exp = Date.now() + dureeMs;
            try { localStorage.setItem(lsKey, String(exp)); } catch {}
            return exp;
        })(),
        status:          c.status,
    }));
}
