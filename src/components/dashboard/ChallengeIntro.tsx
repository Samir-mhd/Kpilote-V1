"use client";

import { useEffect, useState } from "react";

type Props = {

    open: boolean;

    conseiller: string;

    adversaire: string;

    conseillerAvatar?: string;

    adversaireAvatar?: string;

    produit: string;

    duree: number;

    onStart: () => void;

};

export default function ChallengeIntro({

    open,

    conseiller,

    adversaire,

    conseillerAvatar,

    adversaireAvatar,

    produit,

    duree,

    onStart,

}: Props) {

    const [visible, setVisible] =
        useState(false);

    const [vsVisible, setVsVisible] =
        useState(false);

    useEffect(() => {

        if (!open) return;

        setVisible(true);

        const timer =
            setTimeout(() => {

                setVsVisible(true);

            }, 500);

        return () =>
            clearTimeout(timer);

    }, [open]);

    if (!open) return null;

    return (

        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 backdrop-blur-md">

            <div className="w-full max-w-6xl">

                <div className="flex items-center justify-between">

                    <div
                        className={`transition-all duration-700 ${
                            visible
                                ? "translate-x-0 opacity-100"
                                : "-translate-x-40 opacity-0"
                        }`}
                    >

                        <div className="flex flex-col items-center">

                            <div className="h-52 w-52 overflow-hidden rounded-full border-[6px] border-violet-500 bg-slate-800 shadow-2xl">

                                {conseillerAvatar ? (

                                    <img

                                        src={conseillerAvatar}

                                        alt={conseiller}

                                        className="h-full w-full object-cover"

                                    />

                                ) : (

                                    <div className="flex h-full items-center justify-center text-8xl">

                                        😎

                                    </div>

                                )}

                            </div>

                            <h2 className="mt-6 text-4xl font-black text-white">

                                {conseiller}

                            </h2>

                        </div>

                    </div>

                    <div
                        className={`transition-all duration-700 ${
                            vsVisible
                                ? "scale-100 opacity-100"
                                : "scale-50 opacity-0"
                        }`}
                    >

                        <div className="rounded-full border border-violet-500/40 bg-gradient-to-br from-violet-600 to-fuchsia-600 px-14 py-10 shadow-[0_0_80px_rgba(124,58,237,.6)]">

                            <div className="text-center">

                                <p className="text-sm uppercase tracking-[0.5em] text-violet-200">

                                    Défi

                                </p>

                                <h1 className="mt-2 text-8xl font-black text-white">

                                    VS

                                </h1>

                                <p className="mt-6 text-xl text-white/80">

                                    {produit}

                                </p>

                                <p className="mt-2 text-white/60">

                                    {duree} minutes

                                </p>

                            </div>

                        </div>

                    </div>

                    <div
                        className={`transition-all duration-700 ${
                            visible
                                ? "translate-x-0 opacity-100"
                                : "translate-x-40 opacity-0"
                        }`}
                    >

                        <div className="flex flex-col items-center">

                            <div className="h-52 w-52 overflow-hidden rounded-full border-[6px] border-pink-500 bg-slate-800 shadow-2xl">

                                {adversaireAvatar ? (

                                    <img

                                        src={adversaireAvatar}

                                        alt={adversaire}

                                        className="h-full w-full object-cover"

                                    />

                                ) : (

                                    <div className="flex h-full items-center justify-center text-8xl">

                                        👩

                                    </div>

                                )}

                            </div>

                            <h2 className="mt-6 text-4xl font-black text-white">

                                {adversaire}

                            </h2>

                        </div>

                    </div>

                </div>

                <div className="mt-16 text-center">

                    <button

                        onClick={onStart}

                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-12 py-5 text-2xl font-black text-white shadow-2xl transition hover:scale-105"

                    >

                        Commencer le défi

                    </button>

                </div>

            </div>

        </div>

    );

}