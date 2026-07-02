import { Deduction } from "../deductions";
import { Recommendation } from "./Recommendation";
import { RecommendationCatalog } from "./RecommendationCatalog";

export class RecommendationEngine {

    static analyze(deductions: Deduction[]): Recommendation[] {

        const recommendations: Recommendation[] = [];

        deductions.forEach((deduction) => {

            const matches = RecommendationCatalog.filter(
                rule => rule.deduction === deduction.id
            );

            matches.forEach(rule => {

                recommendations.push({

                    id: rule.id,

                    title: rule.title,

                    description: rule.description,

                    priority: rule.priority

                });

            });

        });

        return recommendations;

    }

}