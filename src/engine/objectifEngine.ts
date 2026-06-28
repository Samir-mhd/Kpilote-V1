export type EtatObjectif = "avance" | "rythme" | "retard" | "termine";

export type ObjectifInput = {
  produit: string;
  objectifMensuel: number;
  realise: number;
  joursTravailles: number;
  joursRestants: number;
};

export type ObjectifResultat = {
  produit: string;
  objectifMensuel: number;
  realise: number;
  resteAFaire: number;
  objectifJour: number;
  progression: number;
  projectionFinMois: number;
  etat: EtatObjectif;
  message: string;
};

export function calculerObjectif(input: ObjectifInput): ObjectifResultat {
  const resteAFaire = Math.max(input.objectifMensuel - input.realise, 0);

  const objectifJour =
    input.joursRestants > 0
      ? Math.ceil(resteAFaire / input.joursRestants)
      : resteAFaire;

  const progression =
    input.objectifMensuel > 0
      ? Math.round((input.realise / input.objectifMensuel) * 100)
      : 0;

  const moyenneJour =
    input.joursTravailles > 0 ? input.realise / input.joursTravailles : 0;

  const projectionFinMois = Math.round(
    input.realise + moyenneJour * input.joursRestants
  );

  const etat = determinerEtat({
    realise: input.realise,
    objectifMensuel: input.objectifMensuel,
    projectionFinMois,
  });

  return {
    produit: input.produit,
    objectifMensuel: input.objectifMensuel,
    realise: input.realise,
    resteAFaire,
    objectifJour,
    progression,
    projectionFinMois,
    etat,
    message: genererMessage(input.produit, etat, objectifJour, resteAFaire),
  };
}

function determinerEtat({
  realise,
  objectifMensuel,
  projectionFinMois,
}: {
  realise: number;
  objectifMensuel: number;
  projectionFinMois: number;
}): EtatObjectif {
  if (realise >= objectifMensuel) return "termine";
  if (projectionFinMois >= objectifMensuel * 1.05) return "avance";
  if (projectionFinMois >= objectifMensuel * 0.95) return "rythme";
  return "retard";
}

function genererMessage(
  produit: string,
  etat: EtatObjectif,
  objectifJour: number,
  resteAFaire: number
) {
  if (etat === "termine") {
    return `🏆 Objectif ${produit} atteint. Tu peux prendre de l’avance sur le mois.`;
  }

  if (etat === "avance") {
    return `🚀 Tu es en avance sur ${produit}. Continue pour sécuriser ton mois.`;
  }

  if (etat === "rythme") {
    return `🔥 Tu es dans le rythme sur ${produit}. Vise ${objectifJour} aujourd’hui.`;
  }

  return `🎯 Priorité ${produit}. Il reste ${resteAFaire} à faire, vise ${objectifJour} aujourd’hui.`;
}

export function calculerObjectifs(inputs: ObjectifInput[]) {
  return inputs.map(calculerObjectif);
}