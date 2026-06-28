type BriefKpi = {
  nom: string;
  realise: number;
  objectif: number;
  missionJour: number;
};

type BriefConseiller = {
  nom: string;
  message: string;
  type: "bravo" | "attention" | "info";
};

export function genererBriefDuJour(
  kpis: BriefKpi[],
  conseillers: BriefConseiller[]
) {
  const lignesKpi = kpis.map((kpi) => {
    const retard = kpi.objectif - kpi.realise;

    return {
      nom: kpi.nom,
      realise: kpi.realise,
      objectif: kpi.objectif,
      reste: Math.max(retard, 0),
      missionJour: kpi.missionJour,
      statut:
        kpi.realise >= kpi.objectif
          ? "objectif_atteint"
          : retard <= kpi.missionJour
          ? "dans_le_rythme"
          : "a_rattraper",
    };
  });

  const messages = conseillers.map((conseiller) => ({
    ...conseiller,
  }));

  return {
    titre: "Brief du jour",
    kpis: lignesKpi,
    messages,
    synthese:
      "Voici les priorités du jour pour garder la boutique dans le rythme.",
  };
}