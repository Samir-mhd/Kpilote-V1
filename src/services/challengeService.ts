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

    const dureeMs  = (challenge.duree ?? 30) * 60 * 1000;
    // localStorage = partagé entre onglets + persiste aux rechargements (contrairement à sessionStorage)
    const lsKey    = `kpilote-expires-${challenge.id}`;

    let expiresAt: number;

    if (challenge.started_at) {
        // Source de vérité DB → calculée une fois, mise en cache localStorage
        expiresAt = new Date(challenge.started_at).getTime() + dureeMs;
        try { localStorage.setItem(lsKey, String(expiresAt)); } catch {}
    } else {
        // Lit le cache localStorage si dispo (stable entre onglets et rechargements)
        const cached = (() => { try { return localStorage.getItem(lsKey); } catch { return null; } })();
        if (cached) {
            expiresAt = parseInt(cached);
        } else {
            // Première fois : mémorise maintenant + durée
            expiresAt = Date.now() + dureeMs;
            try { localStorage.setItem(lsKey, String(expiresAt)); } catch {}
        }
    }

    // NE PAS auto-clôturer ici : c'est le rôle du countdown UI et de cloturerChallengesExpires.
    // On laisse simplement passer pour afficher la carte. La clôture sera gérée par :
    //   1. Le countdown timer dans challenges/page.tsx
    //   2. handleSale quand le score atteint l'objectif
    //   3. cloturerChallengesExpires (appelé par le manager toutes les 30s)

    // Charge les noms depuis la table conseillers (adversaire_nom / createur_nom n'existent pas)
    const ids = [challenge.createur, challenge.adversaire].filter(Boolean);
    const { data: conseillers } = await supabase
        .from("conseillers")
        .select("id, nom")
        .in("id", ids);

    const nomMap: Record<string, string> = {};
    (conseillers ?? []).forEach((c: any) => { nomMap[c.id] = c.nom; });

    // Si le créateur est le manager (UUID fixe), le "challenge" vient du manager
    const adversaireNom =
        challenge.createur === MANAGER_UUID
            ? "Votre manager"
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
