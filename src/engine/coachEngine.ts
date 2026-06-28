import { KpiloteEvent } from "./eventEngine";

type CoachContext = {
  event: KpiloteEvent;
  produit: string;
  reste: number;
};

const messages: Record<KpiloteEvent, string[]> = {
  PREMIERE_VENTE: [
    "👏 C’est parti, la journée est lancée !",
    "🚀 Belle entrée en matière !",
    "🔥 On démarre fort !",
    "💪 Première vente validée, continue comme ça !",
    "⭐ Excellent démarrage, garde le rythme !",
  ],

  DOUBLE: [
    "👌 Deuxième vente, tu prends le rythme !",
    "💥 Ça s’enchaîne bien, continue !",
    "🚀 Deux ventes, la dynamique est bonne !",
    "👏 Très bon début de journée !",
  ],

  TRIPLE: [
    "🔥 Wow, le triplé pour toi !",
    "🚀 Tu es en feu aujourd’hui !",
    "💥 Grosse dynamique, continue !",
    "🤩 Là, tu prends une vraie cadence !",
    "👏 Tu fais très fort aujourd’hui !",
  ],

  QUADRUPLE: [
    "🤯 Quatre ventes, énorme rythme !",
    "🔥 Tu es clairement en mode locomotive !",
    "🚀 Tu tires la boutique vers le haut !",
    "🏆 Très grosse journée qui se dessine !",
  ],

  VENTE_SIMPLE: [
    "🎯 Bien joué ! Encore {reste} {produit} pour terminer ta mission.",
    "💪 Continue, il te reste {reste} {produit}.",
    "🔥 Tu avances bien. Plus que {reste} {produit}.",
    "🚀 Encore {reste} {produit} et c’est validé.",
    "👏 Belle action, continue à pousser sur {produit}.",
  ],

  MISSION_TERMINEE: [
    "🎉 Mission {produit} validée ! Maintenant, prends de l’avance sur demain.",
    "🏆 Objectif {produit} du jour atteint, énorme travail !",
    "🚀 Mission {produit} terminée ! Chaque vente en plus sécurise ton mois.",
    "🔥 Tu as fait le job sur {produit}. Maintenant, tu peux aider la boutique.",
    "👏 Super ! Tu peux viser plus haut maintenant.",
    "💚 Mission validée. Tu donnes de l’air à toute l’équipe.",
  ],

  AVANCE_PRISE: [
    "🚀 Tu prends de l’avance, c’est exactement l’esprit KPILOTE.",
    "🔥 Tu ne fais pas que suivre le rythme, tu l’imposes.",
    "🏪 Chaque vente en plus aide toute la boutique.",
    "👏 Tu sécurises ton mois, continue !",
    "💪 Tu construis déjà ton avance sur demain.",
    "⭐ Tu transformes une bonne journée en très bonne journée.",
  ],
};

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export function genererMessageCoach({
  event,
  produit,
  reste,
}: CoachContext) {
  return pick(messages[event])
    .replaceAll("{reste}", String(reste))
    .replaceAll("{produit}", produit);
}