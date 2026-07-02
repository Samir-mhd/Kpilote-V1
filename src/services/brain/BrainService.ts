import { Metric } from "@/intelligence/metrics";
import { KPILOTEBrain } from "@/intelligence/brain";

export class BrainService {

    static analyze(metrics: Metric[]) {

        const result =
            KPILOTEBrain.analyze(metrics);

        return {

            score: result.score,

            confidence: result.confidence,

            health: result.health,

            observations: result.observations,

            deductions: result.deductions,

            recommendations: result.recommendations,

            summary:
                this.buildSummary(result),

        };

    }

    private static buildSummary(
        result: ReturnType<typeof KPILOTEBrain.analyze>
    ): string {

        switch (result.health) {

            case "excellent":
                return "La boutique est en excellente dynamique.";

            case "good":
                return "La boutique progresse normalement.";

            case "warning":
                return "Plusieurs indicateurs nécessitent une vigilance.";

            default:
                return "La boutique nécessite une action rapide.";

        }

    }

}