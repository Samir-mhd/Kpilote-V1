import { Metric } from "@/intelligence/metrics";
import { ChallengeDecision } from "./ChallengeDecision";

export class ChallengeDecisionEngine {

    // KPILOTE ne propose aucun défi avant 10h30 :
    // la boutique a besoin de temps pour générer des données significatives.
    // En dessous de ce seuil, les métriques à 0 fausseraient les décisions.
    private static heureMinimum = { heure: 10, minute: 30 };

    // Nombre minimum de ventes totales sur la boutique avant toute proposition.
    private static ventesMinimum = 3;

    static peutProposer(totalVentes: number = 0): boolean {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const apresHeure =
            h > this.heureMinimum.heure ||
            (h === this.heureMinimum.heure && m >= this.heureMinimum.minute);
        return apresHeure && totalVentes >= this.ventesMinimum;
    }

    static analyze(metrics: Metric[], totalVentes: number = 0): ChallengeDecision[] {

        if (!this.peutProposer(totalVentes)) return [];

        const decisions: ChallengeDecision[] = [];

        metrics.forEach(metric => {

            if (metric.target <= 0) return;

            const taux = metric.value / metric.target;

            if (taux < 0.5) {

                decisions.push({

                    createur: "",

                    adversaire: "",

                    produit: metric.label,

                    duree: 30,

                    raison: `${metric.label} est en retard — un défi peut relancer la dynamique.`,

                    priorite: "haute",

                });

            }

        });

        return decisions;

    }

}