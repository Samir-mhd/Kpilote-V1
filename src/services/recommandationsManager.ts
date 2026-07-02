import { KPI } from "@/types/dashboard";

export type RecommandationManager = {
  titre: string;
  action: string;
  priorite: "haute" | "moyenne" | "faible";
};

export function construireRecommandationsManager(
  kpis: KPI[]
): RecommandationManager[] {

  const recommandations: RecommandationManager[] = [];

  const produitsEnRetard = kpis
    .map((kpi) => ({
      ...kpi,
      taux:
        kpi.objectif > 0
          ? Math.round((kpi.realise / kpi.objectif) * 100)
          : 0,
    }))
    .sort((a, b) => a.taux - b.taux);

  produitsEnRetard.forEach((kpi) => {

    if (kpi.taux < 50) {

      recommandations.push({

        titre: `Priorité : ${kpi.nom}`,

        action: `Lancer immédiatement une animation commerciale sur ${kpi.nom}. Organiser un coaching ciblé et suivre les résultats dans la journée.`,

        priorite: "haute",

      });

    } else if (kpi.taux < 80) {

      recommandations.push({

        titre: `${kpi.nom} à renforcer`,

        action: `Maintenir la dynamique commerciale et suivre quotidiennement les ventes ${kpi.nom}.`,

        priorite: "moyenne",

      });

    }

  });

  if (recommandations.length === 0) {

    recommandations.push({

      titre: "Très bonne dynamique",

      action: "Tous les indicateurs sont au niveau attendu. Maintenir le rythme et valoriser les performances de l'équipe.",

      priorite: "faible",

    });

  }

  return recommandations;

}