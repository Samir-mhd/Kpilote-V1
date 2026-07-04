"use client";

import { useEffect, useState } from "react";
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

const AVATAR_CONTEXTE: Record<AvatarEtat, string> = {
    souriant_main:       "Bonne journée ! Lance-toi, chaque vente compte.",
    en_feu:              "T'es en feu ! Continue sur cette lancée, rien ne t'arrête.",
    glacon:              "Tu refroidis... Une vente pour relancer la machine !",
    endormi:             "C'est l'heure de se réveiller ! L'objectif t'attend.",
    heureux_gagne:       "Belle victoire ! Profite de cette énergie pour enchaîner.",
    malheureux_perdu:    "Pas grave, la prochaine victoire est pour toi. Remonte !",
};

export default function HeroHeader({
    nom,
    message,
    coachMessage = "",
    progression = 0,
    rang = 0,
    defi = false,
    avatarEtat = "souriant_main",
}: Props) {
    const [displayed, setDisplayed] = useState(coachMessage);
    const [visible,   setVisible]   = useState(true);

    useEffect(() => {
        if (!coachMessage || coachMessage === displayed) return;
        setVisible(false);
        const t = setTimeout(() => { setDisplayed(coachMessage); setVisible(true); }, 250);
        return () => clearTimeout(t);
    }, [coachMessage]);

    return (
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 px-10 py-10 text-white shadow-[0_30px_90px_rgba(0,0,0,.35)]">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
                <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

                    {/* ── Gauche : infos conseiller ─────────────────────── */}
                    <div className="max-w-3xl">
                        <p className="text-sm uppercase tracking-[0.45em] text-violet-300">KPILOTE</p>
                        <h1 className="mt-4 text-6xl font-black">Bonjour {nom} 👋</h1>
                        <p className="mt-6 max-w-2xl text-2xl leading-10 text-white/85">{message}</p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <div className="rounded-full bg-green-500/20 px-5 py-3 text-green-300">
                                🔥 Excellente dynamique
                            </div>
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

                    {/* ── Droite : avatar + message coach ───────────────── */}
                    <div className="flex flex-col items-center gap-5 w-full max-w-xs mx-auto xl:mx-0">

                        {/* Avatar grand format */}
                        <CartoonAvatar
                            prenom={nom}
                            etat={avatarEtat}
                            size={340}
                            className="drop-shadow-[0_20px_40px_rgba(139,92,246,.4)]"
                        />

                        {/* Phrase contextualisée selon l'état */}
                        <p
                            className="text-center text-base font-bold text-white/80 leading-7 px-2 transition-all duration-300"
                            style={{ opacity: visible ? 1 : 0 }}
                        >
                            {AVATAR_CONTEXTE[avatarEtat]}
                        </p>

                    </div>

                </div>
            </div>
        </section>
    );
}
