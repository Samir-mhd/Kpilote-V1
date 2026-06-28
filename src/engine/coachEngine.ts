import { KpiloteEvent } from "./eventEngine";

type CoachContext = {
  event: KpiloteEvent;
  produit: string;
  reste: number;
  prenom?: string;
  totalVentesJour?: number;
};

const emojis = ["👏", "🔥", "🚀", "💪", "🤩", "⭐", "🏆", "🎯", "🙌", "⚡"];

const encouragements = [
  "très belle action",
  "excellent réflexe",
  "grosse dynamique",
  "tu prends le rythme",
  "tu montes en puissance",
  "tu fais avancer ta journée",
  "tu construis une belle performance",
  "tu gardes le cap",
  "tu fais plaisir à voir",
  "tu es bien lancé",
];

const fins = [
  "continue comme ça.",
  "ne lâche rien.",
  "la journée est bien lancée.",
  "tu peux faire une très belle journée.",
  "chaque vente compte.",
  "tu es sur une bonne dynamique.",
  "on garde ce rythme.",
  "tu peux viser encore plus haut.",
];

const missionsTerminees = [
  "mission validée",
  "objectif du jour atteint",
  "mission accomplie",
  "travail fait sur ce KPI",
  "KPI sécurisé pour aujourd’hui",
];

const avance = [
  "tu peux maintenant prendre de l’avance sur demain",
  "chaque vente en plus sécurise ton mois",
  "tu peux aider la boutique à aller chercher son objectif",
  "tu transformes une bonne journée en très bonne journée",
  "tu construis ton avance sur l’objectif mensuel",
];

function random(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function nom(prenom?: string) {
  return prenom ? `${prenom}, ` : "";
}

export function genererMessageCoach({
  event,
  produit,
  reste,
  prenom,
  totalVentesJour = 0,
}: CoachContext) {
  const emoji = random(emojis);
  const who = nom(prenom);

  if (event === "PREMIERE_VENTE") {
    return `${emoji} ${who}c’est parti ! Première vente validée, ${random(fins)}`;
  }

  if (event === "DOUBLE") {
    return `${emoji} ${who}deuxième vente de la journée, ${random(encouragements)}. ${random(fins)}`;
  }

  if (event === "TRIPLE") {
    return `${emoji} ${who}wow, le triplé ! Tu es en feu aujourd’hui. ${random(fins)}`;
  }

  if (event === "QUADRUPLE") {
    return `${emoji} ${who}quatre ventes déjà ! Tu tires clairement la journée vers le haut.`;
  }

  if (event === "MISSION_TERMINEE") {
    return `${emoji} ${who}${random(missionsTerminees)} sur ${produit}. ${random(avance)}.`;
  }

  if (event === "AVANCE_PRISE") {
    return `${emoji} ${who}tu prends de l’avance sur ${produit}. ${random(avance)}.`;
  }

  if (reste === 1) {
    return `${emoji} ${who}bien joué ! Encore une vente ${produit} et cette mission est validée.`;
  }

  if (totalVentesJour >= 5) {
    return `${emoji} ${who}${totalVentesJour} ventes aujourd’hui, grosse cadence ! Continue, tu es dans un très bon jour.`;
  }

  return `${emoji} ${who}${random(encouragements)} ! Encore ${reste} ${produit} pour terminer cette mission.`;
}