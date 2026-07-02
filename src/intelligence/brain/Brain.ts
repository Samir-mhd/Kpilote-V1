import { Metric } from "../metrics";
import { Observation } from "../observations";
import { Deduction } from "../deductions";
import { Recommendation } from "../recommendations";

import { ObservationEngine } from "../observations";
import { DeductionEngine } from "../deductions";
import { RecommendationEngine } from "../recommendations";

export interface BrainResult {

    score: number;

    confidence: number;

    health: "excellent" | "good" | "warning" | "critical";

    observations: Observation[];

    deductions: Deduction[];

    recommendations: Recommendation[];

}

export class KPILOTEBrain {

    static analyze(metrics: Metric[]): BrainResult {

        const observations =
            ObservationEngine.analyze(metrics);

        const deductions =
            DeductionEngine.analyze(observations);

        const recommendations =
            RecommendationEngine.analyze(deductions);

        const success =
            observations.filter(
                o => o.severity === "success"
            ).length;

        const warning =
            observations.filter(
                o => o.severity === "warning"
            ).length;

        const total =
            Math.max(observations.length, 1);

        const score =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        ((success * 100) +
                        (warning * 50)) /
                        total
                    )
                )
            );

        const confidence =
            deductions.length === 0
                ? 50
                : Math.round(
                    deductions.reduce(
                        (s, d) => s + d.confidence,
                        0
                    ) / deductions.length
                );

        let health: BrainResult["health"] =
            "critical";

        if (score >= 90)
            health = "excellent";
        else if (score >= 75)
            health = "good";
        else if (score >= 50)
            health = "warning";

        return {

            score,

            confidence,

            health,

            observations,

            deductions,

            recommendations,

        };

    }

    
}export { KPILOTEBrain as Brain };