"use client";

type Props = {

    open: boolean;

    victoire: boolean;

    conseiller: string;

    adversaire: string;

    scoreConseiller: number;

    scoreAdversaire: number;

    produit: string;

    message: string;

    onClose: () => void;

};

export default function ChallengeResult({

    open,

    victoire,

    conseiller,

    adversaire,

    scoreConseiller,

    scoreAdversaire,

    produit,

    message,

    onClose,

}: Props) {

    if (!open) return null;

    return (

        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur">

            <div className="w-full max-w-2xl rounded-[36px] bg-gradient-to-br from-slate-900 via-violet-900 to-slate-950 p-10 shadow-[0_30px_120px_rgba(0,0,0,.45)]">

                <div className="text-center">

                    <div className="text-7xl">

                        {victoire ? "🏆" : "👏"}

                    </div>

                    <h1 className="mt-6 text-5xl font-black text-white">

                        {victoire ? "Victoire" : "Défi terminé"}

                    </h1>

                    <p className="mt-2 text-xl text-violet-300">

                        {produit}

                    </p>

                </div>

                <div className="mt-12 flex items-center justify-around">

                    <div className="text-center">

                        <div className="text-5xl">

                            😎

                        </div>

                        <p className="mt-3 text-2xl font-bold text-white">

                            {conseiller}

                        </p>

                        <p className="mt-5 text-6xl font-black text-green-400">

                            {scoreConseiller}

                        </p>

                    </div>

                    <div className="text-3xl font-black text-violet-300">

                        VS

                    </div>

                    <div className="text-center">

                        <div className="text-5xl">

                            👩

                        </div>

                        <p className="mt-3 text-2xl font-bold text-white">

                            {adversaire}

                        </p>

                        <p className="mt-5 text-6xl font-black text-red-400">

                            {scoreAdversaire}

                        </p>

                    </div>

                </div>

                <div className="mt-10 rounded-3xl bg-white/10 p-6">

                    <p className="text-sm uppercase tracking-[0.35em] text-violet-300">

                        KPILOTE

                    </p>

                    <p className="mt-3 text-lg leading-8 text-white">

                        {message}

                    </p>

                </div>

                <div className="mt-10 flex justify-center">

                    <button

                        onClick={onClose}

                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-4 text-lg font-black text-white transition hover:scale-105"

                    >

                        Retour au Dashboard

                    </button>

                </div>

            </div>

        </div>

    );

}