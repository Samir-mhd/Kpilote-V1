"use client";

import { KPI } from "@/types/dashboard";

type Props = {
    kpis: KPI[];
};

export default function KPIsManager({
    kpis,
}: Props) {
    return (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {kpis.map((kpi) => {

                const taux =
                    kpi.objectif > 0
                        ? Math.round((kpi.realise / kpi.objectif) * 100)
                        : 0;

                return (
                    <div
                        key={kpi.nom}
                        className="group relative overflow-hidden rounded-[30px] border border-white/30 bg-white/80 p-7 shadow-[0_15px_40px_rgba(15,23,42,.10)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(15,23,42,.16)]"
                    >

                        <div
                            className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${kpi.couleur} opacity-20 blur-3xl`}
                        />

                        <div className="relative">

                            <div className="flex items-start justify-between">

                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                    {kpi.nom}
                                </p>

                                <span
                                    className={`rounded-full bg-gradient-to-br ${kpi.couleur} px-3 py-1 text-xs font-black text-white`}
                                >
                                    {taux}%
                                </span>

                            </div>

                            <div className="mt-4 flex items-end gap-2">
                                <h2 className="text-4xl font-black text-slate-800">
                                    {kpi.realise}
                                </h2>

                                <span className="mb-1 text-slate-400">
                                    / {kpi.objectif}
                                </span>
                            </div>

                            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${kpi.couleur} transition-all duration-700`}
                                    style={{
                                        width: `${Math.min(taux, 100)}%`,
                                    }}
                                />
                            </div>

                        </div>

                    </div>
                );

            })}

        </section>
    );

}
