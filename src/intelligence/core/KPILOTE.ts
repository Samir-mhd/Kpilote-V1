import { Metric } from "@/intelligence/metrics";

import {
    Badge,
    BadgeEngine,
} from "@/intelligence/badges";

import {
    Moment,
    MomentEngine,
} from "@/intelligence/moments";

import {
    ChallengeDecision,
    ChallengeEngine,
} from "@/intelligence/challenges";

export interface KPILOTEResult {

    badges: Badge[];

    moments: Moment[];

    challenge: ChallengeDecision | null;

}

export class KPILOTE {

    static analyze(
        metrics: Metric[]
    ): KPILOTEResult {

        const badges =
            BadgeEngine.analyze(metrics);

        const moments =
            MomentEngine.analyze(metrics);

        const challenges =
            ChallengeEngine.analyze(metrics);

        const challenge =
            challenges.length > 0
                ? {
                    createur: "",
                    adversaire: "",
                    produit: challenges[0].produit,
                    duree: challenges[0].duree,
                    raison: challenges[0].raison,
                    priorite: challenges[0].priorite,
                }
                : null;

        return {

            badges,

            moments,

            challenge,

        };

    }

}