"use client";

type Props = {

    conseiller: string;

    adversaire: string;

    produit: string;

    scoreConseiller: number;

    scoreAdversaire: number;

    tempsRestant: string;

    progression: number;

    message: string;

    onOpen: () => void;

};

export default function ChallengeCard({

    conseiller,

    adversaire,

    produit,

    scoreConseiller,

    scoreAdversaire,

    tempsRestant,

    progression,

    message,

    onOpen,

}: Props) {

    return (

        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-7 text-white shadow-2xl">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">

                        Défi en cours

                    </p>

                    <h2 className="mt-2 text-3xl font-black">

                        ⚔ {produit}

                    </h2>

                </div>

                <button

                    onClick={onOpen}

                    className="rounded-xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:scale-105"

                >

                    Voir

                </button>

            </div>

            <div className="mt-8 flex items-center justify-between">

                <div className="text-center">

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">

                        😎

                    </div>

                    <p className="mt-3 font-bold">

                        {conseiller}

                    </p>

                </div>

                <div className="text-center">

                    <p className="text-6xl font-black">

                        {scoreConseiller}

                    </p>

                    <p className="my-3 text-xl font-black text-white/70">

                        VS

                    </p>

                    <p className="text-6xl font-black">

                        {scoreAdversaire}

                    </p>

                </div>

                <div className="text-center">

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">

                        👩

                    </div>

                    <p className="mt-3 font-bold">

                        {adversaire}

                    </p>

                </div>

            </div>

            <div className="mt-8">

                <div className="mb-2 flex justify-between text-sm">

                    <span>

                        Temps restant

                    </span>

                    <span>

                        {tempsRestant}

                    </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/20">

                    <div

                        className="h-full rounded-full bg-green-400 transition-all"

                        style={{

                            width: `${progression}%`,

                        }}

                    />

                </div>

            </div>

            <div className="mt-8 rounded-2xl bg-white/10 p-4">

                <p className="text-sm font-bold uppercase text-white/70">

                    KPILOTE

                </p>

                <p className="mt-2 font-medium leading-relaxed">

                    {message}

                </p>

            </div>

        </div>

    );

}