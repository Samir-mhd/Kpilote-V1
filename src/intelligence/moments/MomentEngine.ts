import { Metric } from "@/intelligence/metrics";
import { Moment } from "./Moment";

export class MomentEngine {

    static analyze(metrics: Metric[]): Moment[] {

        const moments: Moment[] = [];

        metrics.forEach(metric => {

            // Première vente

            if (metric.value === 1) {

                moments.push({

                    id: metric.id + "_FIRST",

                    titre: "Première vente",

                    description:
                        `Première vente ${metric.label} réalisée aujourd'hui.`,

                    emoji: "🎉",

                    priorite: "normale",

                });

            }

            // Objectif atteint

            if (metric.value >= metric.target && metric.target > 0) {

                moments.push({

                    id: metric.id + "_TARGET",

                    titre: "Objectif atteint",

                    description:
                        `Objectif atteint sur ${metric.label}.`,

                    emoji: "🏆",

                    priorite: "haute",

                });

            }

            // Produit en retard

            if (
                metric.target > 0 &&
                metric.value / metric.target < 0.5
            ) {

                moments.push({

                    id: metric.id + "_WARNING",

                    titre: "Produit à relancer",

                    description:
                        `${metric.label} est en dessous de 50 % de l'objectif.`,

                    emoji: "⚠️",

                    priorite: "haute",

                });

            }

        });

        return moments;

    }

}