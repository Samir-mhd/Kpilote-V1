export type MissionContext = {
  produit: string;
  objectif: number;
  realise: number;
};

export type DashboardContext = {
  situation: string;
  messageHero: string;
  messageCoach: string;
};

function random<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

const heroTousObjectifs = [
  "🏆 Toutes tes missions sont terminées !",
  "🚀 Tu as terminé tous tes objectifs du jour.",
  "🔥 Journée parfaitement maîtrisée.",
  "👏 Mission accomplie sur tous les KPI.",
];

const coachTousObjectifs = [
  "Tu peux maintenant prendre de l'avance sur ton objectif mensuel.",
  "Continue ! Chaque vente supplémentaire sécurise ton mois.",
  "La boutique peut encore compter sur toi pour prendre de l'avance.",
  "Tu réalises une très belle journée.",
  "Pourquoi ne pas aider un collègue sur un autre KPI ?",
];

const heroAvance = [
  "🚀 Tu prends une belle avance.",
  "🔥 Tu dépasses déjà plusieurs objectifs.",
  "⭐ Tu construis une excellente journée.",
];

const coachAvance = [
  "Continue comme ça, tu es dans une excellente dynamique.",
  "Tu fais clairement partie des locomotives aujourd'hui.",
  "Très belle cadence, continue !",
];

const heroMission = [
  "🎯 Une mission est encore en cours.",
  "💪 Tu es proche de tout terminer.",
  "🔥 Encore un effort.",
];

const coachMission = [
  "Concentre-toi sur le KPI prioritaire.",
  "Une dernière accélération et ta journée sera validée.",
  "Continue, tu tiens le bon rythme.",
];

export function analyserDashboard(
  missions: MissionContext[]
): DashboardContext {

  const terminees = missions.filter(
    (m) => m.realise >= m.objectif
  ).length;

  const total = missions.length;

  const avance = missions.filter(
    (m) => m.realise >= m.objectif * 2
  ).length;

  if (terminees === total && total > 0) {
    return {
      situation: "TOUS_OBJECTIFS",
      messageHero: random(heroTousObjectifs),
      messageCoach: random(coachTousObjectifs),
    };
  }

  if (avance >= 2) {
    return {
      situation: "AVANCE",
      messageHero: random(heroAvance),
      messageCoach: random(coachAvance),
    };
  }

  const priorite = missions
    .filter((m) => m.realise < m.objectif)
    .sort(
      (a, b) =>
        (b.objectif - b.realise) -
        (a.objectif - a.realise)
    )[0];

  if (priorite) {
    return {
      situation: "MISSION",
      messageHero: `${random(heroMission)} Encore ${
        priorite.objectif - priorite.realise
      } ${priorite.produit}.`,
      messageCoach: `${random(coachMission)} Priorité : ${priorite.produit}.`,
    };
  }

  return {
    situation: "NORMAL",
    messageHero: "Passe une excellente journée.",
    messageCoach: "Chaque vente compte.",
  };
}