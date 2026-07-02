import { KPI } from "@/types/dashboard";
import { AnalyseManager } from "./types";

export function construireBriefIA(
  kpis: KPI[],
  tauxGlobal: number,
  ventesRestantes: number
): AnalyseManager[] {

  const analyses: AnalyseManager[] = [];

  if (tauxGlobal >= 100) {

    analyses.push({
      titre: "🎉 Objectif atteint",
      message:
        "La boutique est en avance sur son objectif collectif.",
      niveau: "success",
    });

  } else if (tauxGlobal >= 80) {

    analyses.push({
      titre: "🚀 Bonne dynamique",
      message:
        `Plus que ${ventesRestantes} ventes pour atteindre l'objectif.`,
      niveau: "warning",
    });

  } else {

    analyses.push({
      titre: "⚠️ Rythme insuffisant",
      message:
        "Une animation commerciale est recommandée dès ce matin.",
      niveau: "danger",
    });

  }

  kpis.forEach((kpi) => {

    const taux =
      kpi.objectif > 0
        ? Math.round((kpi.realise / kpi.objectif) * 100)
        : 0;

    if (taux < 50) {

      analyses.push({

        titre: `📉 ${kpi.nom}`,

        message:
          `${kpi.nom} est actuellement à ${taux}% de son objectif.`,

        niveau: "danger",

      });

    }

  });

  return analyses;

}