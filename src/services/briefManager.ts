import { KPI } from "@/types/dashboard";
import { ConseillerClassement } from "./classementManager";
import { CoachManagerResult } from "./coachManager";

export type BriefManager = {
  titre: string;
  message: string;
  niveau: "success" | "warning" | "danger";
};

type Intelligence = {
  observations?: any[];
  deductions?: any[];
  recommendations?: any[];
};

type BriefManagerInput = {
  kpis: KPI[];
  classement: ConseillerClassement[];
  coach: CoachManagerResult;
  realiseGlobal: number;
  objectifGlobal: number;
  tauxGlobal: number;
  ventesRestantes: number;
  intelligence?: Intelligence;
};

export function construireBriefManager(
  dashboard: BriefManagerInput
): BriefManager[] {

  const briefs: BriefManager[] = [];

  // ===============================
  // Etat global
  // ===============================

  if (dashboard.tauxGlobal >= 100) {

    briefs.push({
      titre: "🟢 Boutique performante",
      message: "Tous les indicateurs principaux sont atteints.",
      niveau: "success",
    });

  } else if (dashboard.tauxGlobal >= 80) {

    briefs.push({
      titre: "🟠 Bonne dynamique",
      message: `${dashboard.ventesRestantes} ventes restent nécessaires pour atteindre l'objectif.`,
      niveau: "warning",
    });

  } else {

    briefs.push({
      titre: "🔴 Alerte performance",
      message: "La boutique est actuellement sous le rythme attendu.",
      niveau: "danger",
    });

  }

  // ===============================
  // Champion
  // ===============================

  if (dashboard.classement.length) {

    const champion = dashboard.classement[0];

    briefs.push({

      titre: "🏆 Champion",

      message: `${champion.prenom} réalise actuellement la meilleure performance.`,

      niveau: "success",

    });

  }

  // ===============================
  // Coaching
  // ===============================

  if (dashboard.coach) {

    briefs.push({

      titre: "🎯 Priorité Manager",

      message: dashboard.coach.message,

      niveau:
        dashboard.coach.niveau === "haut"
          ? "danger"
          : dashboard.coach.niveau === "moyen"
          ? "warning"
          : "success",

    });

  }

  // ===============================
  // Intelligence KPILOTE
  // ===============================

  dashboard.intelligence?.recommendations?.forEach((rec: any) => {

    briefs.push({

      titre: "🧠 " + rec.title,

      message: rec.description,

      niveau:
        rec.priority === "high"
          ? "danger"
          : rec.priority === "medium"
          ? "warning"
          : "success",

    });

  });

  // ===============================
  // Produits
  // ===============================

  dashboard.kpis.forEach((kpi) => {

    const taux =
      kpi.objectif > 0
        ? Math.round((kpi.realise / kpi.objectif) * 100)
        : 0;

    if (taux < 50) {

      briefs.push({

        titre: `📉 ${kpi.nom}`,

        message: `${kpi.nom} atteint seulement ${taux}% de son objectif.`,

        niveau: "danger",

      });

    }

  });

  return briefs;

}