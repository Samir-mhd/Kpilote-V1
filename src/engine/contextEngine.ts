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

// ─── Tous objectifs atteints ──────────────────────────────────
const heroFeu = [
  "T'es un avion !",
  "T'es un monstre !",
  "T'es un phénomène !",
  "T'es un crack !",
  "T'es un champion !",
  "Tu régales !",
  "Tu casses tout !",
  "T'es une machine !",
  "T'es un tueur !",
  "T'es en mission !",
  "T'as envoyé du lourd !",
  "T'es pas venu enfiler des perles !",
  "Oh fan, tu les plies tous !",
  "T'as mangé du lion !",
  "T'es un fada, mais un bon !",
  "T'as le niveau, trop easy pour toi aujourd'hui !",
];

const coachFeu = [
  "Tu peux maintenant prendre de l'avance sur ton objectif mensuel.",
  "Continue ! Chaque vente supplémentaire sécurise ton mois.",
  "La boutique peut encore compter sur toi pour prendre de l'avance.",
  "Tu réalises une très belle journée.",
  "Pourquoi ne pas aider un collègue sur un autre KPI ?",
];

// ─── Bonne avance (≥ 70 %) ────────────────────────────────────
const heroSolide = [
  "Tu fais le boulot !",
  "T'es au-dessus du lot !",
  "T'es une pointure !",
  "T'as la classe !",
  "Tu les fais danser !",
  "T'es injouable !",
  "T'as mis tout le monde d'accord !",
  "Chapeau, t'as assuré grave !",
];

const coachSolide = [
  "Continue comme ça, tu es dans une excellente dynamique.",
  "Tu fais clairement partie des locomotives aujourd'hui.",
  "Très belle cadence, continue !",
];

// ─── En cours (≥ 15 %) ────────────────────────────────────────
const heroEnCours = [
  "🎯 Une mission est encore en cours.",
  "💪 T'es proche de tout terminer.",
  "🔥 Encore un effort.",
];

const coachEnCours = [
  "Concentre-toi sur le KPI prioritaire.",
  "Une dernière accélération et ta journée sera validée.",
  "Continue, tu tiens le bon rythme.",
];

// ─── Ralenti (< 15 %) ─────────────────────────────────────────
const heroLent = [
  "T'as le frein à main !",
  "Tu démarres au gasoil !",
  "T'es au ralenti !",
  "T'as avalé une enclume ?",
  "T'es pas pressé hein !",
  "T'es en mode économie d'énergie !",
  "T'as oublié la deuxième vitesse !",
  "Tu comptes les cigales avant d'avancer ?",
  "T'es au back office ?",
  "T'es en veille !",
  "Tu tournes au ralenti depuis une heure !",
  "T'as les pieds dans le béton !",
  "T'es branché sur le 56k !",
  "T'as le cerveau en vacances !",
  "Tu fais durer le suspense !",
  "T'as pris racine ?",
  "T'as plus de piles ?",
  "Tu fais la sieste en marchant ?",
  "Oh fan, mets la deuxième !",
];

const coachLent = [
  "Allez, réveille-toi ! Les objectifs ne vont pas se faire seuls.",
  "Un peu d'énergie et ça repart — c'est maintenant ou jamais.",
  "La journée est encore longue, mais il faut démarrer.",
  "Ton objectif t'attend. Lance-toi !",
  "Chaque minute compte. En avant !",
];

export function analyserDashboard(
  missions: MissionContext[]
): DashboardContext {

  const total = missions.length;
  if (total === 0) {
    return {
      situation: "NORMAL",
      messageHero: "Passe une excellente journée.",
      messageCoach: "Chaque vente compte.",
    };
  }

  const terminees    = missions.filter((m) => m.realise >= m.objectif).length;
  const totalRealise = missions.reduce((s, m) => s + m.realise, 0);
  const totalObjectif = missions.reduce((s, m) => s + m.objectif, 0);
  const tauxGlobal   = totalObjectif > 0 ? totalRealise / totalObjectif : 0;

  if (terminees === total) {
    return {
      situation: "TOUS_OBJECTIFS",
      messageHero: "🔥 " + random(heroFeu),
      messageCoach: random(coachFeu),
    };
  }

  if (tauxGlobal >= 0.7) {
    return {
      situation: "AVANCE",
      messageHero: "⭐ " + random(heroSolide),
      messageCoach: random(coachSolide),
    };
  }

  if (tauxGlobal >= 0.15) {
    const priorite = missions
      .filter((m) => m.realise < m.objectif)
      .sort((a, b) => (b.objectif - b.realise) - (a.objectif - a.realise))[0];
    return {
      situation: "MISSION",
      messageHero: `${random(heroEnCours)} Encore ${priorite.objectif - priorite.realise} ${priorite.produit}.`,
      messageCoach: `${random(coachEnCours)} Priorité : ${priorite.produit}.`,
    };
  }

  return {
    situation: "LENT",
    messageHero: "⚡ " + random(heroLent),
    messageCoach: random(coachLent),
  };
}
