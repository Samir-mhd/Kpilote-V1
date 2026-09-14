"use client";

import { StatsTransactionsMois } from "@/services/ventesTransactions";

export default function ArticlesParVenteCard({ stats, sombre = false }: { stats: StatsTransactionsMois; sombre?: boolean }) {
    const colonnes = [1, 2, 3, 4, 5];
    const max = Math.max(...colonnes.map((n) => stats.parNbArticles[n] ?? 0), 1);

    return (
        <div className={`rounded-[24px] p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)] ${sombre ? "bg-slate-900" : "bg-white"}`}>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${sombre ? "text-teal-400" : "text-teal-600"}`}>
                🛒 Articles par vente
            </p>
            <p className={`mt-1 text-sm ${sombre ? "text-white/40" : "text-slate-400"}`}>
                Box, forfait, téléphone, McAfee (produit + mobile), assurance (nouveau mobile + essentielle) — sur le mois en cours.
            </p>

            <div className="mt-4 flex flex-wrap gap-6">
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sombre ? "text-white/30" : "text-slate-400"}`}>Total ventes</p>
                    <p className={`text-2xl font-black ${sombre ? "text-white" : "text-slate-800"}`}>{stats.totalVentes}</p>
                </div>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sombre ? "text-white/30" : "text-slate-400"}`}>Ventes combo</p>
                    <p className={`text-2xl font-black ${sombre ? "text-amber-300" : "text-amber-600"}`}>{stats.totalCombo}</p>
                </div>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sombre ? "text-white/30" : "text-slate-400"}`}>Moyenne / vente</p>
                    <p className={`text-2xl font-black ${sombre ? "text-teal-300" : "text-teal-600"}`}>{stats.moyenneArticles.toFixed(2)}</p>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2">
                {colonnes.map((n) => {
                    const val = stats.parNbArticles[n] ?? 0;
                    const pct = Math.round((val / max) * 100);
                    return (
                        <div key={n} className="flex flex-col items-center gap-1.5">
                            <div className={`flex h-20 w-full items-end justify-center overflow-hidden rounded-xl ${sombre ? "bg-white/5" : "bg-slate-50"}`}>
                                <div
                                    className="w-full rounded-t-xl bg-gradient-to-t from-teal-500 to-emerald-400 transition-all"
                                    style={{ height: `${Math.max(pct, val > 0 ? 8 : 0)}%` }}
                                />
                            </div>
                            <p className={`text-sm font-black ${sombre ? "text-white" : "text-slate-800"}`}>{val}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${sombre ? "text-white/30" : "text-slate-400"}`}>
                                {n}{n === 5 ? "+" : ""} art.
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
