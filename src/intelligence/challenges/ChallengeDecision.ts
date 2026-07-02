export interface ChallengeDecision {

    createur: string;

    adversaire: string;

    produit: string;

    duree: number;

    raison: string;

    priorite: "faible" | "normale" | "haute";

}