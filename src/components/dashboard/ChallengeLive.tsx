"use client";

import { useEffect, useState } from "react";

import {

    updateChallenge,

} from "@/services/challengeLiveService";

type Props = {

    conseiller: string;

    adversaire: string;

    scoreConseiller: number;

    scoreAdversaire: number;

    temps: string;

    produit: string;

    message: string;

};

export default function ChallengeLive({

    conseiller,

    adversaire,

    scoreConseiller,

    scoreAdversaire,

    temps,

    produit,

    message,

}: Props) {

    const [state, setState] =

        useState({

            scoreMoi: scoreConseiller,

            scoreAdversaire: scoreAdversaire,

            leader: "moi" as
                "moi" | "adversaire" | "egalite",

            message,

        });

    const [pulseMoi, setPulseMoi] =
        useState(false);

    const [pulseLui, setPulseLui] =
        useState(false);

    useEffect(() => {

        setPulseMoi(true);

        const t = setTimeout(() => {

            setPulseMoi(false);

        }, 400);

        return () => clearTimeout(t);

    }, [state.scoreMoi]);

    useEffect(() => {

        setPulseLui(true);

        const t = setTimeout(() => {

            setPulseLui(false);

        }, 400);

        return () => clearTimeout(t);

    }, [state.scoreAdversaire]);

    return (

        <div className="rounded-[34px] bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-900 p-8 text-white shadow-[0_25px_80px_rgba(0,0,0,.35)]">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-xs uppercase tracking-[0.35em] text-violet-300">

                        Défi Live

                    </p>

                    <h2 className="mt-2 text-4xl font-black">

                        ⚔ {produit}

                    </h2>

                </div>

                <div className="rounded-full bg-white/10 px-6 py-3 font-bold">

                    ⏱ {temps}

                </div>

            </div>

            <div className="mt-12 grid grid-cols-3 items-center">

                <div className="text-center">

                    <div
                        className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                            state.leader === "moi"
                                ? "border-green-400 shadow-[0_0_40px_rgba(34,197,94,.7)]"
                                : "border-white/20"
                        }`}
                    >

                        <span className="text-6xl">

                            😎

                        </span>

                    </div>

                    <p className="mt-4 text-2xl font-black">

                        {conseiller}

                    </p>

                </div>

                <div>

                    <div className="flex items-center justify-center gap-8">

                        <span
                            className={`text-7xl font-black transition-all duration-300 ${
                                pulseMoi
                                    ? "scale-125 text-green-400"
                                    : ""
                            }`}
                        >

                            {state.scoreMoi}

                        </span>

                        <span className="text-3xl font-black text-violet-300">

                            VS

                        </span>

                        <span
                            className={`text-7xl font-black transition-all duration-300 ${
                                pulseLui
                                    ? "scale-125 text-red-400"
                                    : ""
                            }`}
                        >

                            {state.scoreAdversaire}

                        </span>

                    </div>

                </div>

                <div className="text-center">

                    <div
                        className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                            state.leader === "adversaire"
                                ? "border-green-400 shadow-[0_0_40px_rgba(34,197,94,.7)]"
                                : "border-white/20"
                        }`}
                    >

                        <span className="text-6xl">

                            👩

                        </span>

                    </div>

                    <p className="mt-4 text-2xl font-black">

                        {adversaire}

                    </p>

                </div>

            </div>

            <div className="mt-10 rounded-3xl bg-white/10 p-6">

                <p className="text-xs uppercase tracking-[0.3em] text-violet-300">

                    KPILOTE

                </p>

                <p className="mt-3 text-lg leading-8">

                    {state.message}

                </p>

            </div>

            {/* Boutons temporaires de test */}

            <div className="mt-10 flex justify-center gap-6">

                <button

                    onClick={() =>

                        setState(

                            updateChallenge(

                                state,

                                "moi"

                            )

                        )

                    }

                    className="rounded-2xl bg-green-500 px-8 py-4 font-black transition hover:scale-105"

                >

                    +1 Moi

                </button>

                <button

                    onClick={() =>

                        setState(

                            updateChallenge(

                                state,

                                "adversaire"

                            )

                        )

                    }

                    className="rounded-2xl bg-red-500 px-8 py-4 font-black transition hover:scale-105"

                >

                    +1 Julie

                </button>

            </div>

        </div>

    );

}