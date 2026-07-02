import { Metric } from "@/intelligence/metrics";
import { Challenge } from "./Challenge";

export class ChallengeEngine {

    static analyze(
        metrics: Metric[]
    ): Challenge[] {

        const challenges: Challenge[] = [];

        metrics.forEach(metric => {

            if (metric.target <= 0) return;

            const taux =
                metric.value / metric.target;

            if (taux < 0.5) {

                challenges.push({

                    id: crypto.randomUUID(),

                    createur: "",

                    adversaire: "",

                    produit: metric.label,

                    duree: 30,

                    raison:
                        `${metric.label} est en retard aujourd'hui.`,

                    priorite: "haute",

                    status: "pending",

                    scoreCreateur: 0,

                    scoreAdversaire: 0,

                });

            }

        });

        return challenges;

    }

}