"use client";

import KPIIcon from "@/components/ui/KPIIcon";

type Props = {

    tauxGlobal: number;

    ventesRestantes: number;

    onRefresh: () => void;

};

export default function HeaderManager({

    tauxGlobal,

    ventesRestantes,

    onRefresh,

}: Props) {

    return (

        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 p-10 text-white shadow-[0_35px_90px_rgba(0,0,0,.30)]">

            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"/>

            <div className="absolute -left-10 bottom-0 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl"/>

            <div className="relative flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

                <div>

                    <p className="text-xs uppercase tracking-[0.45em] text-violet-300">

                        KPILOTE MANAGER

                    </p>

                    <h1 className="mt-4 text-5xl font-black">

                        Cockpit Boutique

                    </h1>

                    <p className="mt-6 max-w-2xl text-xl leading-9 text-white/80">

                        Votre boutique est à

                        <span className="font-black text-violet-300">

                            {" "}{tauxGlobal}%

                        </span>

                        de son objectif.

                        Il reste

                        <span className="font-black text-orange-300">

                            {" "}{ventesRestantes}

                        </span>

                        ventes pour terminer la journée.

                    </p>

                </div>

                <div className="grid grid-cols-2 gap-5">

                    <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-xl">

                        <div className="flex items-center gap-3">

                            <KPIIcon

                                name="trend"

                                size={24}

                            />

                            <span>

                                Performance

                            </span>

                        </div>

                        <h2 className="mt-4 text-5xl font-black">

                            {tauxGlobal}%

                        </h2>

                    </div>

                    <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-xl">

                        <div className="flex items-center gap-3">

                            <KPIIcon

                                name="target"

                                size={24}

                            />

                            <span>

                                Restant

                            </span>

                        </div>

                        <h2 className="mt-4 text-5xl font-black">

                            {ventesRestantes}

                        </h2>

                    </div>

                    <button

                        onClick={onRefresh}

                        className="btn-premium col-span-2 rounded-2xl py-4 text-lg font-black"

                    >

                        Actualiser le cockpit

                    </button>

                </div>

            </div>

        </section>

    );

}