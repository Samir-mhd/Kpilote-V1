"use client";

type Props = {

    conseiller: string;

    adversaire: string;

    produit: string;

    temps: string;

    scoreMoi: number;

    scoreLui: number;

    message: string;

};

export default function ChallengeHero({

    conseiller,

    adversaire,

    produit,

    temps,

    scoreMoi,

    scoreLui,

    message,

}: Props) {

    const leader =
        scoreMoi >= scoreLui;

    return (

        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-10 shadow-[0_30px_80px_rgba(0,0,0,.35)]">

            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl"/>

            <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl"/>

            <div className="relative">

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-sm uppercase tracking-[0.4em] text-violet-300">

                            Défi Live

                        </p>

                        <h1 className="mt-3 text-5xl font-black text-white">

                            ⚔ {produit}

                        </h1>

                        <p className="mt-4 max-w-xl text-lg text-white/70">

                            {message}

                        </p>

                    </div>

                    <div className="rounded-full bg-white/10 px-8 py-4 backdrop-blur">

                        <p className="text-white">

                            ⏱ {temps}

                        </p>

                    </div>

                </div>

                <div className="mt-14 grid grid-cols-3 items-center">

                    <div className="text-center">

                        <div className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 ${leader ? "border-green-400 shadow-[0_0_40px_rgba(34,197,94,.6)]" : "border-white/20"} bg-slate-800 text-6xl`}>

                            😎

                        </div>

                        <p className="mt-5 text-3xl font-black text-white">

                            {conseiller}

                        </p>

                    </div>

                    <div>

                        <div className="text-center">

                            <p className="text-8xl font-black text-white">

                                {scoreMoi}

                            </p>

                            <p className="my-4 text-3xl font-black tracking-[0.4em] text-violet-300">

                                VS

                            </p>

                            <p className="text-8xl font-black text-white">

                                {scoreLui}

                            </p>

                        </div>

                        <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/10">

                            <div

                                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500"

                                style={{

                                    width: `${Math.min(((scoreMoi + scoreLui) * 10),100)}%`,

                                }}

                            />

                        </div>

                    </div>

                    <div className="text-center">

                        <div className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 ${!leader ? "border-green-400 shadow-[0_0_40px_rgba(34,197,94,.6)]" : "border-white/20"} bg-slate-800 text-6xl`}>

                            👩

                        </div>

                        <p className="mt-5 text-3xl font-black text-white">

                            {adversaire}

                        </p>

                    </div>

                </div>

                <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">

                    <p className="text-sm uppercase tracking-[0.35em] text-violet-300">

                        KPILOTE

                    </p>

                    <p className="mt-3 text-xl leading-9 text-white">

                        {message}

                    </p>

                </div>

            </div>

        </section>

    );

}