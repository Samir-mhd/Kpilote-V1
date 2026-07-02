import { Badge } from "./Badge";
import { Metric } from "@/intelligence/metrics";

export class BadgeEngine {

    static analyze(metrics: Metric[]): Badge[] {

        const badges: Badge[] = [];

        metrics.forEach(metric => {

            // Objectif atteint

            if (metric.value >= metric.target) {

                badges.push({

                    id: metric.id + "_OBJECTIF",

                    titre: `Objectif ${metric.label}`,

                    description: `Objectif atteint sur ${metric.label}.`,

                    emoji: "🏆",

                    obtenu: true,

                });

            }

            // Première vente

            if (metric.value >= 1) {

                badges.push({

                    id: metric.id + "_FIRST",

                    titre: `Première ${metric.label}`,

                    description: `Première vente ${metric.label}.`,

                    emoji: "🎉",

                    obtenu: true,

                });

            }

        });

        return badges;

    }

}