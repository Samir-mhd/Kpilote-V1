import { KPI } from "@/types/dashboard";
import { AlerteManager } from "./types";

export function construireAlertes(
  kpis: KPI[]
): AlerteManager[] {

  const alertes: AlerteManager[] = [];

  kpis.forEach((kpi) => {

    const taux =
      kpi.objectif > 0
        ? Math.round((kpi.realise / kpi.objectif) * 100)
        : 0;

    if (taux < 40) {

      alertes.push({

        titre: `${kpi.nom} critique`,

        message:
          `${kpi.nom} est très en dessous de son objectif.`

      });

    }

    if (kpi.realise === 0) {

      alertes.push({

        titre: `${kpi.nom} à zéro`,

        message:
          `Aucune vente ${kpi.nom} enregistrée aujourd'hui.`

      });

    }

  });

  return alertes;

}