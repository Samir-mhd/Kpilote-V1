"use client";

type Props = {
    ventes?: number;
    objectif?: number;
    taux?: number;
    rang?: number;
};

export default function StatsBar({ ventes = 0, objectif = 0, taux = 0, rang = 0 }: Props) {
    const restants = Math.max(objectif - ventes, 0);

    return (
        <section className="relative overflow-hidden rounded-[28px] border border-white/40 bg-white/90 p-7 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,.09)]">

            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-10 blur-3xl" />

            <div className="relative flex items-center gap-8">

                {/* Actes du jour */}
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                        Actes du jour
                    </p>

                    <div className="mt-3 flex items-end gap-3">
                        <span className="text-5xl font-black text-slate-800">{ventes}</span>
                        <span className="mb-1.5 text-xl font-semibold text-slate-400">/ {objectif} attendus</span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                            style={{ width: `${Math.min(taux, 100)}%` }}
                        />
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-400">{taux}% réalisé</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-xs text-slate-400">
                            {restants > 0 ? `${restants} acte${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""}` : "🏆 Journée complète !"}
                        </span>
                    </div>
                </div>

                {/* Séparateur */}
                <div className="h-20 w-px bg-slate-200 flex-shrink-0" />

                {/* Classement */}
                <div className="flex-shrink-0 text-center min-w-[100px]">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                        Classement
                    </p>
                    {rang > 0 ? (
                        <>
                            <p className="mt-3 text-5xl font-black text-slate-800">
                                #{rang}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">ta position</p>
                        </>
                    ) : (
                        <p className="mt-3 text-2xl font-black text-slate-300">—</p>
                    )}
                </div>

            </div>
        </section>
    );
}
