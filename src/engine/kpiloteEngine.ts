export type EtatConseiller =
  | "retard"
  | "rythme"
  | "avance"
  | "objectif_atteint";

export type KpiMensuel = {
  produit: string;
  objectifMensuel: number;
  realise: number;
};

export type PlanningConseiller = {
  joursPlanifiesMois: number; // JP
  joursTravailles: number; // JT
  joursPlanifiesSemaine: number; // JP S
};

export type MissionKpi = {
  produit: string;
  objectifMensuel: number;
  realise: number;
  restantMois: number;
  joursRestants: number; // JR
  rafJour: number;
  objectifJour: number;
  objectifSemaine: number;
  progression: number;
  etat: EtatConseiller;
  message: string;
};

export function determinerEtat(progression: number): EtatConseiller {
  if (progression >= 100) return "objectif_atteint";
  if (progression >= 105) return "avance";
  if (progression >= 90) return "rythme";
  return "retard";
}

export function calculerMissionKpi(
  kpi: KpiMensuel,
  planning: PlanningConseiller
): MissionKpi {
  const joursRestants = Math.max(
    planning.joursPlanifiesMois - planning.joursTravailles,
    0
  );

  const restantMois = Math.max(kpi.objectifMensuel - kpi.realise, 0);

  const rafJour =
    joursRestants > 0
      ? restantMois / joursRestants
      : restantMois;

  const objectifJour = Math.ceil(rafJour);

  const objectifSemaine = Math.ceil(
    rafJour * planning.joursPlanifiesSemaine
  );

  const progression =
    kpi.objectifMensuel > 0
      ? Math.round((kpi.realise / kpi.objectifMensuel) * 100)
      : 0;

  const etat = determinerEtat(progression);

  return {
    produit: kpi.produit,
    objectifMensuel: kpi.objectifMensuel,
    realise: kpi.realise,
    restantMois,
    joursRestants,
    rafJour,
    objectifJour,
    objectifSemaine,
    progression,
    etat,
    message: messageCopilote(etat, kpi.produit, objectifJour, restantMois),
  };
}

export function calculerMissions(
  kpis: KpiMensuel[],
  planning: PlanningConseiller
): MissionKpi[] {
  return kpis.map((kpi) => calculerMissionKpi(kpi, planning));
}

export function messageCopilote(
  etat: EtatConseiller,
  produit: string,
  objectifJour: number,
  restantMois: number
) {
  if (restantMois === 0) {
    return `🏆 Objectif ${produit} atteint. Continue pour prendre de l'avance ou aider la boutique.`;
  }

  switch (etat) {
    case "retard":
      return `🎯 Priorité ${produit} : vise ${objectifJour} aujourd’hui pour revenir dans le rythme.`;

    case "rythme":
      return `🔥 Tu es dans le rythme sur ${produit}. Encore ${objectifJour} aujourd’hui.`;

    case "avance":
      return `🚀 Tu es en avance sur ${produit}. Tu peux préparer l’objectif de demain.`;

    case "objectif_atteint":
      return `🏆 Objectif ${produit} atteint. Continue pour sécuriser ton mois.`;
  }
}