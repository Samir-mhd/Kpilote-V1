import { getChallengeActif, cloturerChallenge } from "./challengeRepository";

export type ChallengeDashboard = {
    id: string;
    createdAt: string;
    createurId: string;
    adversaireId: string;
    adversaire: string;
    produit: string;
    raison: string;
    duree: number;
    status: string;
    scoreConseiller: number;
    scoreAdversaire: number;
    progression: number;
    tempsRestant: string;
    expiresAt: number; // timestamp ms — pour le countdown client-side
    message: string;
};

/** Calcule "MM:SS" depuis un timestamp d'expiration */
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

    // Calcul du temps restant côté client depuis created_at + duree
    const createdAt = new Date(challenge.created_at).getTime();
    const expiresAt = createdAt + (challenge.duree ?? 30) * 60 * 1000;

    // Si le défi est expiré, on le clôture immédiatement
    if (Date.now() >= expiresAt) {
        await cloturerChallenge({
            id: challenge.id,
            createur: challenge.createur,
            adversaire: challenge.adversaire,
            score_createur: challenge.score_createur,
            score_adversaire: challenge.score_adversaire,
        });
        return null;
    }

    // Nom de l'adversaire vu par le conseiller connecté
    const adversaireNom =
        challenge.createur === conseillerId
            ? (challenge.adversaire_nom ?? "Adversaire")
            : (challenge.createur_nom ?? "Adversaire");

    const scoreConseiller =
        challenge.createur === conseillerId
            ? (challenge.score_createur ?? 0)
            : (challenge.score_adversaire ?? 0);

    const scoreAdversaire =
        challenge.createur === conseillerId
            ? (challenge.score_adversaire ?? 0)
            : (challenge.score_createur ?? 0);

    return {
        id: challenge.id,
        createdAt: challenge.created_at,
        createurId: challenge.createur,
        adversaireId: challenge.adversaire,
        adversaire: adversaireNom,
        produit: challenge.produit,
        raison: challenge.raison ?? "",
        duree: challenge.duree ?? 30,
        status: challenge.status,
        scoreConseiller,
        scoreAdversaire,
        progression: challenge.progression ?? 0,
        expiresAt,
        tempsRestant: formatTempsRestant(expiresAt),
        message: challenge.message ?? "KPILOTE suit ce défi en temps réel.",
    };
}
