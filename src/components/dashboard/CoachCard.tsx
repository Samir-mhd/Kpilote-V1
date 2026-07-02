"use client";

type Props = {

    nom: string;

    message: string;

};

export default function CoachCard({

    nom,

    message,

}: Props) {

    return (

        <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-8 text-white shadow-[0_25px_70px_rgba(0,0,0,.30)]">

            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl"/>

            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl"/>

            <div className="relative">

                <div className="flex items-center gap-5">

                    <div className="relative">

                        <div className="absolute inset-0 rounded-full bg-violet-500 blur-2xl opacity-40"/>

                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-violet-400 bg-slate-800 text-5xl">

                            🤖

                        </div>

                    </div>

                    <div>

                        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">

                            Coach IA

                        </p>

                        <h2 className="mt-2 text-3xl font-black">

                            KPILOTE

                        </h2>

                        <p className="mt-1 text-white/60">

                            En direct avec {nom}

                        </p>

                    </div>

                </div>

                <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">

                    <p className="text-lg leading-9">

                        {message}

                    </p>

                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">

                    <div className="rounded-2xl bg-white/10 p-4 text-center">

                        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">

                            Moral

                        </p>

                        <p className="mt-2 text-3xl">

                            🔥

                        </p>

                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 text-center">

                        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">

                            Focus

                        </p>

                        <p className="mt-2 text-3xl">

                            🎯

                        </p>

                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 text-center">

                        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">

                            Confiance

                        </p>

                        <p className="mt-2 text-3xl">

                            ⚡

                        </p>

                    </div>

                </div>

                <div className="mt-8 overflow-hidden rounded-full bg-white/10">

                    <div

                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"

                        style={{

                            width: "82%",

                        }}

                    />

                </div>

                <p className="mt-3 text-center text-sm text-white/60">

                    KPILOTE estime à

                    <span className="font-bold text-violet-300">

                        {" "}82 %

                    </span>

                    tes chances d'atteindre ton objectif aujourd'hui.

                </p>

            </div>

        </section>

    );

}