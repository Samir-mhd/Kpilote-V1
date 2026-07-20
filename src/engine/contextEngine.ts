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

/** Formate une durée en minutes → "1h", "1h30", "2h"… */
function formatDuree(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m < 15) return `${h}h`;
    if (m < 45) return `${h}h30`;
    return `${h + 1}h`;
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

// ─── Bonne avance (≥ 70%) ────────────────────────────────────
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

// ─── En cours (≥ 15%) ────────────────────────────────────────
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

// ─── Ralenti (< 15%, pas d'inactivité détectée) ───────────────
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

// ─── Inactivité Palier 5 : taux ≥ 80 % ───────────────────────
// Belle journée, juste une pause — ton valorisant
const heroInactif5: Msg[] = [
    "T'as cartonné — {durée} de silence, une dernière pour finir en beauté !",
    "Belle journée jusqu'ici ! {durée} sans vente, signe ta performance.",
    "T'es au top — {durée} de pause, c'est l'heure du sprint final.",
    { H: "T'as été un monstre ce matin — {durée} sans vente, montre que t'as pas fini !", F: "T'as été une monstre ce matin — {durée} sans vente, montre que t'as pas fini !" },
    "Grosse matinée ! Mais {durée} de silence, c'est l'heure du coup de grâce.",
];

const coachInactif5: Msg[] = [
    "T'es bien placé. Reprends juste le rythme pour finir fort.",
    "Une petite relance et ta journée est parfaite.",
    "L'objectif est presque là. Une dernière accélération et c'est dans la boîte.",
    "Reste dans la dynamique — chaque vente en plus sécurise le mois.",
];

// ─── Inactivité Palier 4 : 60 % ≤ taux < 80 % ────────────────
// Bonne base — encourageant, doux
const heroInactif4: Msg[] = [
    "Bonne base ! Mais {durée} sans vente — la fin de journée te tend les bras.",
    "{durée} de silence. T'es bien parti — remets une pièce dans la machine.",
    "Solide jusqu'ici ! {durée} sans vente, c'est l'heure de la relance.",
    "T'as bien bossé. {durée} de pause, mais l'objectif n'est pas encore là.",
];

const coachInactif4: Msg[] = [
    "T'es en bonne position. Quelques ventes et tu dépasses ton objectif.",
    "La base est solide. Relance maintenant et tu finis fort.",
    "Continue sur ta lancée — une vente de plus et tu passes le cap.",
];

// ─── Inactivité Palier 3 : 40 % ≤ taux < 60 % ────────────────
// Mi-chemin — neutre, motivant
const heroInactif3: Msg[] = [
    "Mi-chemin et {durée} de silence — la deuxième mi-temps commence maintenant !",
    "{durée} sans vente. T'as le niveau pour rattraper ça, lance-toi !",
    "On est à mi-parcours — {durée} de pause, c'est l'heure de réagir.",
    "Moitié faite, moitié à faire. Et {durée} de silence — reprends le fil.",
];

const coachInactif3: Msg[] = [
    "T'as encore le temps. Mais chaque minute compte.",
    "Recentre-toi sur ton objectif prioritaire.",
    "Mi-chemin, c'est exactement le bon moment pour accélérer.",
];

// ─── Inactivité Palier 2 : 20 % ≤ taux < 40 % ────────────────
// En difficulté — appel à l'action clair
const heroInactif2: Msg[] = [
    "{durée} sans vente et l'objectif est loin — accélère maintenant !",
    "L'objectif s'éloigne. {durée} de silence, c'est trop long.",
    "Pas de vente depuis {durée} — remets-toi en mode chasseur !",
    "{durée} de pause avec encore beaucoup à faire — c'est le moment de changer de rythme.",
];

const coachInactif2: Msg[] = [
    "La journée est encore longue. Un effort maintenant peut tout changer.",
    "Focus. Objectif prioritaire. Maintenant.",
    "C'est le moment de changer de vitesse — chaque vente compte double.",
];

// ─── Inactivité Palier 1 : taux < 20 % ───────────────────────
// Critique — message fort avec durée
const heroInactif1: Msg[] = [
    "T'as le frein à main ! Et {durée} de silence en plus...",
    "{durée} sans vente — et l'objectif est encore loin.",
    "T'es en veille depuis {durée} — c'est maintenant ou jamais !",
    "T'as avalé une enclume ? {durée} sans vente et presque rien au compteur.",
    "Oh fan, {durée} de silence — mets la deuxième !",
    "T'as les pieds dans le béton depuis {durée} — secoue-toi !",
];

const coachInactif1: Msg[] = [
    "Allez, réveille-toi ! Les objectifs ne vont pas se faire seuls.",
    "Un peu d'énergie et ça repart — c'est maintenant ou jamais.",
    "Chaque minute compte. En avant !",
];

export function analyserDashboard(
    missions: MissionContext[],
    genre: "H" | "F" | null = null,
    // Date de la dernière vente commerciale aujourd'hui (null = aucune vente ; undefined = non fourni)
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

    // ─── Inactivité : dernière vente commerciale > 1h ────────────────────────
    if (derniereVente instanceof Date &&
        Date.now() - derniereVente.getTime() > 60 * 60 * 1000) {

        const minutesInactif = Math.floor((Date.now() - derniereVente.getTime()) / 60000);
        const duree = formatDuree(minutesInactif);

        let heroArr: Msg[];
        let coachArr: Msg[];
        let situation: string;
        let emoji: string;

        // 5 paliers de 20 %
        if (tauxGlobal >= 0.80) {
            heroArr    = heroInactif5;
            coachArr   = coachInactif5;
            situation  = "PAUSE_MERITEE";
            emoji      = "⭐";
        } else if (tauxGlobal >= 0.60) {
            heroArr    = heroInactif4;
            coachArr   = coachInactif4;
            situation  = "RELANCE_DOUCE";
            emoji      = "💪";
        } else if (tauxGlobal >= 0.40) {
            heroArr    = heroInactif3;
            coachArr   = coachInactif3;
            situation  = "RELANCE";
            emoji      = "⚡";
        } else if (tauxGlobal >= 0.20) {
            heroArr    = heroInactif2;
            coachArr   = coachInactif2;
            situation  = "ALERTE";
            emoji      = "⚡";
        } else {
            heroArr    = heroInactif1;
            coachArr   = coachInactif1;
            situation  = "LENT_CRITIQUE";
            emoji      = "⚡";
        }

        const heroRaw   = pick(heroArr, genre);
        const heroFinal = heroRaw.replace("{durée}", duree);

        return {
            situation,
            messageHero:  `${emoji} ${heroFinal}`,
            messageCoach: pick(coachArr, genre),
        };
    }

    // ─── Logique normale basée sur les % ─────────────────────────────────────
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

    // Vente réalisée il y a moins de 15 min : jamais le ton "ralenti", même si le % reste
    // bas en tout début de journée (1 vente sur un objectif complet donne un taux mécaniquement faible).
    if (derniereVente instanceof Date && Date.now() - derniereVente.getTime() < 15 * 60 * 1000) {
        return {
            situation: "MISSION",
            messageHero: pick(heroEnCours, genre),
            messageCoach: pick(coachEnCours, genre),
        };
    }

    return {
        situation: "LENT",
        messageHero: "⚡ " + pick(heroLent, genre),
        messageCoach: pick(coachLent, genre),
    };
}
