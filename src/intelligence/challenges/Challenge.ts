import { ChallengeStatus } from "./ChallengeStatus";

export interface Challenge {

    id: string;

    createur: string;

    adversaire: string;

    produit: string;

    duree: number;

    raison: string;

    priorite:
        | "faible"
        | "normale"
        | "haute";

    status: ChallengeStatus;

    scoreCreateur: number;

    scoreAdversaire: number;

    debut?: Date;

    fin?: Date;

}