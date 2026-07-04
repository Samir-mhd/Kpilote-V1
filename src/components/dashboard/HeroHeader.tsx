"use client";

import { useEffect, useRef, useState } from "react";
import CartoonAvatar, { type AvatarEtat } from "@/components/avatar/CartoonAvatar";

type Props = {
    nom: string;
    message: string;
    coachMessage?: string;
    progression?: number;
    rang?: number;
    defi?: boolean;
    avatarEtat?: AvatarEtat;
};

const AVATAR_PHRASES: Record<AvatarEtat, string[]> = {
    souriant_main: [
        "Bonjour {nom} 👋",
        "Belle journée en vue, {nom} ! Prêt à cartonner ?",
        "C'est parti {nom} ! La journée commence, tout est possible.",
        "Salut {nom} ! Nouvelle journée, nouvelles opportunités.",
        "Bienvenue {nom} ! Ton tableau de bord est prêt.",
    ],
    souriant_actif: [
        "Tu es de retour dans le game ! 💪",
        "Ça repart ! Garde ce rythme. 🚀",
        "La machine est relancée, continue !",
        "Voilà l'énergie qu'on attendait !",
        "Tu as répondu présent. Enchaîne maintenant !",
        "Le game reprend, ne t'arrête plus !",
        "Un pas en avant — maintenant le suivant.",
        "Tu es là, et ça se voit. Continue !",
    ],
    en_feu: [
        "T'es en feu ! Rien ne t'arrête. 🔥",
        "Quelle série ! Tu es inarrêtable aujourd'hui.",
        "Les ventes s'enchaînent, continue comme ça !",
        "Mode turbo activé ! Tu régales.",
        "C'est ta journée ! Ne lâche rien.",
        "On est là pour ça ! Continue d'enflammer !",
        "La machine est lancée, tu domines.",
        "Personne ne t'arrête aujourd'hui. 🔥",
    ],
    glacon: [
        "Tu refroidis... Une vente pour relancer ! 🧊",
        "Un peu de silence du côté des ventes. Relance-toi !",
        "C'est calme, mais ça peut changer vite !",
        "Le momentum s'endort... Réveille-le !",
        "Une heure sans vente — l'heure de tout changer.",
        "Ton prochain client t'attend. À toi de jouer !",
        "Le froid arrive, mais tu sais comment le réchauffer.",
    ],
    endormi: [
        "C'est l'heure de se réveiller ! L'objectif t'attend. 😴",
        "2 heures sans vente… Il est temps de réagir !",
        "Allez, on se réveille ! La journée n'est pas finie.",
        "Le moment de faire la différence, c'est maintenant.",
        "Seconde chance ! Chaque vente compte encore.",
        "Debout ! Ton objectif ne va pas se réaliser tout seul.",
        "La remontée commence par une seule vente.",
    ],
    heureux_gagne: [
        "Belle victoire ! Profite de cette énergie pour enchaîner. 🏆",
        "Champion ! Tu l'as mérité, maintenant va chercher le suivant.",
        "Gagné ! Cette victoire, c'est ton fuel pour la suite.",
        "Impressionnant ! Continue sur cette dynamique.",
        "Le trophée est à toi — et maintenant, l'objectif suivant !",
        "Victoire méritée. Tu savais que tu pouvais le faire.",
    ],
    malheureux_perdu: [
        "Pas grave, la prochaine victoire est pour toi. Remonte ! 💪",
        "Un faux pas, pas une défaite. Tu vas revenir plus fort.",
        "Ça arrive aux meilleurs ! La revanche est pour bientôt.",
        "Ce n'est qu'un challenge. L'essentiel, c'est d'être là.",
        "Tête haute ! Tu as tout pour rebondir.",
        "Perdu aujourd'hui, gagné demain. Continue à te battre.",
        "Cette défaite va te rendre plus fort. C'est garanti.",
    ],
};

function pickPhrase(etat: AvatarEtat, nom: string, lastIdx: number): { phrase: string; idx: number } {
    const pool = AVATAR_PHRASES[etat];
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === lastIdx) idx = (idx + 1) % pool.length;
    return { phrase: pool[idx].replace("{nom}", nom), idx };
}

export default function HeroHeader({
    nom,
    message,
    coachMessage = "",
    progression = 0,
    rang = 0,
    defi = false,
    avatarEtat = "souriant_main",
}: Props) {
    const [titreVisible, setTitreVisible] = useState(true);
    const [titrePhrase,  setTitrePhrase]  = useState(() => AVATAR_PHRASES[avatarEtat][0].replace("{nom}", nom));
    const lastIdxRef   = useRef(0);
    const prevEtatRef  = useRef(avatarEtat);

    useEffect(() => {
        if (avatarEtat === prevEtatRef.current) return;
        prevEtatRef.current = avatarEtat;
        setTitreVisible(false);
        const t = setTimeout(() => {
            const { phrase, idx } = pickPhrase(avatarEtat, nom, lastIdxRef.current);
            lastIdxRef.current = idx;
            setTitrePhrase(phrase);
            setTitreVisible(true);
        }, 280);
        return () => clearTimeout(t);
    }, [avatarEtat, nom]);

    const titreBrut = titrePhrase;

    return (
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 px-10 py-10 text-white shadow-[0_30px_90px_rgba(0,0,0,.35)]">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
                <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

                    {/* ── Gauche : infos conseiller ─────────────────────── */}
                    <div className="max-w-3xl">
                        <p className="text-sm uppercase tracking-[0.45em] text-violet-300">KPILOTE</p>
                        <h1
                            className="mt-4 text-6xl font-black transition-opacity duration-280"
                            style={{ opacity: titreVisible ? 1 : 0 }}
                        >
                            {titreBrut}
                        </h1>
                        <p className="mt-6 max-w-2xl text-2xl leading-10 text-white/85">{message}</p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            {rang > 0 && (
                                <div className="rounded-full bg-white/10 px-5 py-3">
                                    🏆 {rang}ᵉ vendeur
                                </div>
                            )}
                            {defi && (
                                <div className="rounded-full bg-orange-500/20 px-5 py-3 text-orange-300">
                                    ⚔ Défi en cours
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Droite : avatar ────────────────────────────────── */}
                    <div className="flex flex-col items-center w-full max-w-sm mx-auto xl:mx-0">
                        <CartoonAvatar
                            prenom={nom}
                            etat={avatarEtat}
                            size={630}
                            className="drop-shadow-[0_20px_40px_rgba(139,92,246,.4)]"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
}
