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

// Message avec variante genrée optionnelle
type Msg = string | { H: string; F: string };

function pick(arr: Msg[], genre: "H" | "F" | null = null): string {
    const m = arr[Math.floor(Math.random() * arr.length)];
    if (typeof m === "string") return m;
    return genre === "F" ? m.F : m.H;
}

// ─── Tous objectifs atteints ──────────────────────────────────
const heroFeu: Msg[] = [
    "T'es un avion !",
    "T'es un monstre !",
    "T'es un phénomène !",
    "T'es un crack !",
    { H: "T'es un champion !",              F: "T'es une championne !" },
    "Tu régales !",
    "Tu casses tout !",
    "T'es une machine !",
    { H: "T'es un tueur !",                 F: "T'es une tueuse !" },
    "T'es en mission !",
    "T'as envoyé du lourd !",
    { H: "T'es pas venu enfiler des perles !", F: "T'es pas venue enfiler des perles !" },
    "Oh fan, tu les plies tous !",
    "T'as mangé du lion !",
    { H: "T'es un fada, mais un bon !",     F: "T'es une fada, mais une bonne !" },
    "T'as le niveau, trop easy pour toi aujourd'hui !",
];

const coachFeu: Msg[] = [
    "Tu peux maintenant prendre de l'avance sur ton objectif mensuel.",
    "Continue ! Chaque vente supplémentaire sécurise ton mois.",
    "La boutique peut encore compter sur toi pour prendre de l'avance.",
    "Tu réalises une très belle journée.",
    "Pourquoi ne pas aider un collègue sur un autre KPI ?",
];

// ─── Bonne avance (≥ 70 %) ────────────────────────────────────
const heroSolide: Msg[] = [
    "Tu fais le boulot !",
    "T'es au-dessus du lot !",
    "T'es une pointure !",
    "T'as la classe !",
    "Tu les fais danser !",
    "T'es injouable !",
    "T'as mis tout le monde d'accord !",
    "Chapeau, t'as assuré grave !",
];

const coachSolide: Msg[] = [
    "Continue comme ça, tu es dans une excellente dynamique.",
    "Tu fais clairement partie des locomotives aujourd'hui.",
    "Très belle cadence, continue !",
];

// ─── En cours (≥ 15 %) ────────────────────────────────────────
const heroEnCours: Msg[] = [
    "🎯 Une mission est encore en cours.",
    "💪 T'es proche de tout terminer.",
    "🔥 Encore un effort.",
];

const coachEnCours: Msg[] = [
    "Concentre-toi sur le KPI prioritaire.",
    "Une dernière accélération et ta journée sera validée.",
    "Continue, tu tiens le bon rythme.",
];

// ─── Ralenti (< 15 %) ─────────────────────────────────────────
const heroLent: Msg[] = [
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

const coachLent: Msg[] = [
    "Allez, réveille-toi ! Les objectifs ne vont pas se faire seuls.",
    "Un peu d'énergie et ça repart — c'est maintenant ou jamais.",
    "La journée est encore longue, mais il faut démarrer.",
    "Ton objectif t'attend. Lance-toi !",
    "Chaque minute compte. En avant !",
];

export function analyserDashboard(
    missions: MissionContext[],
    genre: "H" | "F" | null = null,
    // Date de la dernière vente commerciale aujourd'hui (null = aucune vente aujourd'hui ; undefined = non fourni)
    derniereVente?: Date | null
): DashboardContext {

    const total = missions.length;
    if (total === 0) {
        return {
            situation: "NORMAL",
            messageHero: "Passe une excellente journée.",
            messageCoach: "Chaque vente compte.",
        };
    }

    const terminees     = missions.filter((m) => m.realise >= m.objectif).length;
    const totalRealise  = missions.reduce((s, m) => s + m.realise, 0);
    const totalObjectif = missions.reduce((s, m) => s + m.objectif, 0);
    const tauxGlobal    = totalObjectif > 0 ? totalRealise / totalObjectif : 0;

    if (terminees === total) {
        return {
            situation: "TOUS_OBJECTIFS",
            messageHero: "🔥 " + pick(heroFeu, genre),
            messageCoach: pick(coachFeu, genre),
        };
    }

    // Inactivité : une vente commerciale existait aujourd'hui mais il y a > 1h → LENT
    if (derniereVente instanceof Date &&
        Date.now() - derniereVente.getTime() > 60 * 60 * 1000) {
        return {
            situation: "LENT",
            messageHero: "⚡ " + pick(heroLent, genre),
            messageCoach: pick(coachLent, genre),
        };
    }

    if (tauxGlobal >= 0.7) {
        return {
            situation: "AVANCE",
            messageHero: "⭐ " + pick(heroSolide, genre),
            messageCoach: pick(coachSolide, genre),
        };
    }

    if (tauxGlobal >= 0.15) {
        const priorite = missions
            .filter((m) => m.realise < m.objectif)
            .sort((a, b) => (b.objectif - b.realise) - (a.objectif - a.realise))[0];
        return {
            situation: "MISSION",
            messageHero: `${pick(heroEnCours, genre)} Encore ${priorite.objectif - priorite.realise} ${priorite.produit}.`,
            messageCoach: `${pick(coachEnCours, genre)} Priorité : ${priorite.produit}.`,
        };
    }

    return {
        situation: "LENT",
        messageHero: "⚡ " + pick(heroLent, genre),
        messageCoach: pick(coachLent, genre),
    };
}
