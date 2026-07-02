"use client";

import { useEffect, useState } from "react";

type Props = {
    nom: string;
    message: string;
    coachMessage?: string;
    progression?: number;
    rang?: number;
    defi?: boolean;
};

export default function HeroHeader({
    nom,
    message,
    coachMessage = "",
    progression = 0,
    rang = 0,
    defi = false,
}: Props) {
    const [displayed, setDisplayed] = useState(coachMessage);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!coachMessage || coachMessage === displayed) return;
        setVisible(false);
        const t = setTimeout(() => {
            setDisplayed(coachMessage);
            setVisible(true);
        }, 250);
        return () => clearTimeout(t);
    }, [coachMessage]);

    return (
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 px-10 py-10 text-white shadow-[0_30px_90px_rgba(0,0,0,.35)]">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
                <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

                    {/* Gauche */}
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

                    {/* Droite : message coach dynamique */}
                    <div
                        className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/10 p-8 backdrop-blur-xl transition-all duration-300"
                        style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.97)" }}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/30 text-xl">
                                🤖
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">
                                Coach IA
                            </p>
                        </div>

                        <p className="text-lg leading-8 text-white/90 min-h-[4rem]">
                            {displayed || "🎯 Commence par ta mission prioritaire du jour."}
                        </p>

                        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-700"
                                style={{ width: `${Math.min(progression, 100)}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-white/40">{progression}% de l'objectif du jour</p>
                    </div>

                </div>
            </div>
        </section>
    );
}
