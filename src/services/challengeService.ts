import { supabase } from "@/lib/supabase";
import { getChallengeActif, cloturerChallenge } from "./challengeRepository";

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";

export type ChallengeDashboard = {
    id: string;
    createdAt: string;
    createurId: string;
    adversaireId: string;
    adversaire: string;
    produit: string;
    raison: string;
    duree: number;
    objectif: number;
    status: string;
    scoreConseiller: number;
    scoreAdversaire: number;
    progression: number;
    tempsRestant: string;
    expiresAt: number;
    message: string;
};

export function formatTempsRestant(expiresAt: number): string {
    const remaining = Math.max(0, expiresAt - Date.now());
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
}

export async function chargerChallenge(
    conseillerId: string
): Promise<ChallengeDashboard | null> {
    const challenge = await getChallengeActif(conseillerId);
    if (!challenge) return null;

    // started_at = quand le défi a démarré (acceptation ou création directe pour manager)
    // Si absent (défi ancien), on utilise created_at comme fallback
    const startMs  = challenge.started_at
        ? new Date(challenge.started_at).getTime()
        : new Date(challenge.created_at).getTime();
    const expiresAt = startMs + (challenge.duree ?? 30) * 60 * 1000;

    // Auto-clôture uniquement si RUNNING ET vraiment expiré depuis started_at
    if (challenge.status === "running" && Date.now() >= expiresAt) {
        await cloturerChallenge({ id: challenge.id });
        return null;
    }

    // Charge les noms depuis la table conseillers (adversaire_nom / createur_nom n'existent pas)
    const ids = [challenge.createur, challenge.adversaire].filter(Boolean);
    const { data: conseillers } = await supabase
        .from("conseillers")
        .select("id, nom")
        .in("id", ids);

    const nomMap: Record<string, string> = {};
    (conseillers ?? []).forEach((c: any) => { nomMap[c.id] = c.nom; });

    // Si le créateur est le manager (UUID fixe), le "challenge" vient de KPILOTE
    const adversaireNom =
        challenge.createur === MANAGER_UUID
            ? "KPILOTE 🤖"
            : challenge.createur === conseillerId
            ? (nomMap[challenge.adversaire] ?? "Adversaire")
            : (nomMap[challenge.createur] ?? "Adversaire");

    const scoreConseiller =
        challenge.createur === conseillerId
            ? (challenge.score_createur ?? 0)
            : (challenge.score_adversaire ?? 0);

    const scoreAdversaire =
        challenge.createur === conseillerId
            ? (challenge.score_adversaire ?? 0)
            : (challenge.score_createur ?? 0);

    return {
        id:             challenge.id,
        createdAt:      challenge.created_at,
        createurId:     challenge.createur,
        adversaireId:   challenge.adversaire,
        adversaire:     adversaireNom,
        produit:        challenge.produit,
        raison:         challenge.raison ?? "",
        duree:          challenge.duree ?? 30,
        objectif:       challenge.objectif ?? 0,
        status:         challenge.status,
        scoreConseiller,
        scoreAdversaire,
        progression:    challenge.progression ?? 0,
        expiresAt,
        tempsRestant:   formatTempsRestant(expiresAt),
        message:        challenge.message ?? "KPILOTE suit ce défi en temps réel.",
    };
}
