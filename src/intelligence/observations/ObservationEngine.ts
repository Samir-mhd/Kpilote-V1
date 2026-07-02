import { Metric } from "../metrics";
import { Observation } from "./Observation";
import { ObservationFactory } from "./ObservationFactory";

const CATEGORIES_CONNUES = [
    "box",
    "forfait",
    "assurance",
    "telephone",
    "mcafee",
];

export class ObservationEngine {

    static analyze(metrics: Metric[]): Observation[] {

        const observations: Observation[] = [];

        metrics.forEach(metric => {

            const ratio =
                metric.target > 0
                    ? metric.value / metric.target
                    : 0;

            const categorie =
                CATEGORIES_CONNUES.includes(metric.id)
                    ? metric.id
                    : "generique";

            let niveau: "CRITICAL" | "FAIBLE" | "GOOD" | "FORT";

            if (ratio < 0.40) {
                niveau = "CRITICAL";
            } else if (ratio < 0.80) {
                niveau = "FAIBLE";
            } else if (ratio < 1.00) {
                niveau = "GOOD";
            } else {
                niveau = "FORT";
            }

            const cle =
                `OBS_${categorie.toUpperCase()}_${niveau}`;

            const definition =
                ObservationFactory.create(cle);

            observations.push({

                id: definition.id,

                label: metric.label,

                category: definition.category,

                severity: definition.severity,

                message: definition.description,

            });

        });

        return observations;

    }

}