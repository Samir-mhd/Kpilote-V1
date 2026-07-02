"use client";

import { useEffect, useState } from "react";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { Periode, PERIODE_LABELS, proratiserObjectif, couleurTaux } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { construireFelicitations } from "@/engine/managerAI/felicitationsEngine";

const medals = ["🥇", "🥈", "🥉"];
const podiumBg = [
    "bg-gradient-to-br from-slate-700 to-slate-800",
    "bg-gradient-to-br from-amber-400 to-orange-500",
    "bg-gradient-to-br from-slate-500 to-slate-600",
];
const podiumSizes = [56, 80, 56];
const podiumRangs = [2, 1, 3];
const podiumH = ["h-20", "h-28", "h-16"];

function tauxGlobal(c: ConseillerStats, periode: Periode): number {
    const totalObj = PRODUITS_ORDRE.reduce((t, p) => t + proratiserObjectif(c.objectifs[p.key], periode), 0);
    return totalObj > 0 ? Math.round((c.total / totalObj) * 100) : 0;
}

export default function ClassementPage() {
    const [periode, setPeriode] = useState<Periode>("mois");
    const [classement, setClassement] = useState<ConseillerStats[]>([]);
    const [photos, setPhotos]   = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);
    const [heure, setHeure]     = useState("");

    useEffect(() => {
        setHeure(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, []);

    useEffect(() => {
        setLoading(true);
        construireClassementPeriode(periode)
            .then(async (data) => {
                setClassement(data);
                const ids = data.map(c => c.id);
                const avs = await getPhotosByIds(ids).catch(() => ({}));
                setPhotos(avs);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [periode]);

    const top3 = classement.slice(0, 3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];

    return (
        <main className="space-y-8">

            {/* Header */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-9 shadow-[0_20px_60px_rgba(15,23,42,.30)]">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-400">KPILOTE Manager</p>
                        <h1 className="mt-2 text-4xl font-black text-white">Classement équipe</h1>
                        {heure && (
                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                                <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                Temps réel · {heure}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Effectif</p>
                        <p className="mt-1 text-5xl font-black text-white">{classement.length}</p>
                        <p className="text-xs text-slate-500">conseillers</p>
                    </div>
                </div>
            </div>

            {/* Période */}
            <div className="flex gap-2">
                {(["jour", "semaine", "mois"] as Periode[]).map((p) => (
                    <button key={p} onClick={() => setPeriode(p)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            periode === p ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}>
                        {PERIODE_LABELS[p]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Podium */}
                    {podiumOrder.length === 3 && (
                        <div>
                            <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                                🏆 Podium — {PERIODE_LABELS[periode]}
                            </p>
                            <div className="flex items-end justify-center gap-4">
                                {podiumOrder.map((c, i) => {
                                    const rang  = podiumRangs[i];
                                    const first = rang === 1;
                                    const taux  = tauxGlobal(c, periode);
                                    return (
                                        <div key={c.id} className="flex flex-col items-center" style={{ flex: first ? "0 0 220px" : "0 0 180px" }}>
                                            <div className={`w-full rounded-[24px] p-6 text-white ${podiumBg[i]} flex flex-col items-center text-center relative overflow-hidden shadow-xl`}>
                                                {first && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}
                                                {first && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
                                                <div className={`${first ? "mt-4" : "mt-2"} overflow-hidden rounded-full ${first ? "ring-4 ring-white/40" : "ring-2 ring-white/20"} shadow-xl`}>
                                                    <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={podiumSizes[i]} />
                                                </div>
                                                <p className={`mt-3 font-black text-white ${first ? "text-2xl" : "text-xl"}`}>{c.nom}</p>
                                                <div className="mt-3 flex items-end gap-1 justify-center">
                                                    <span className={`font-black text-white ${first ? "text-5xl" : "text-4xl"}`}>{c.total}</span>
                                                    <span className="mb-1.5 text-sm text-white/60">ventes</span>
                                                </div>
                                                <div className={`mt-3 rounded-full px-3 py-1 text-xs font-black ${taux >= 80 ? "bg-white/20 text-white" : "bg-black/20 text-white/80"}`}>
                                                    {taux}% obj.
                                                </div>
                                            </div>
                                            <div className={`w-full ${podiumH[i]} flex items-center justify-center rounded-b-2xl ${
                                                rang === 1 ? "bg-gradient-to-b from-amber-400 to-amber-600" : rang === 2 ? "bg-gradient-to-b from-slate-300 to-slate-400" : "bg-gradient-to-b from-amber-700 to-amber-900"
                                            } shadow-lg`}>
                                                <span className="text-2xl">{medals[rang - 1]}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tableau détaillé */}
                    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_4px_32px_rgba(15,23,42,.08)]">
                        <div className="px-7 pt-7 pb-3 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Classement complet — {PERIODE_LABELS[periode]}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-300">
                                <span className="text-emerald-600 font-bold">● ≥ obj.</span>
                                <span className="text-amber-500 font-bold">● ≥ 50%</span>
                                <span className="text-red-500 font-bold">● {"< 50%"}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[750px]">
                                <thead>
                                    <tr className="border-y border-slate-100 bg-slate-50/80">
                                        <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-400 w-10">#</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Conseiller</th>
                                        {PRODUITS_ORDRE.map(p => (
                                            <th key={p.code} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                                                {p.emoji} {p.label}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Taux</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {classement.map((c, idx) => {
                                        const taux = tauxGlobal(c, periode);
                                        const ct   = couleurTaux(c.total, PRODUITS_ORDRE.reduce((t, p) => t + proratiserObjectif(c.objectifs[p.key], periode), 0));
                                        return (
                                            <tr key={c.id} className={`transition-colors hover:bg-violet-50/40 ${idx === 0 ? "bg-amber-50/30" : ""}`}>
                                                <td className="px-5 py-4">{idx < 3 ? <span className="text-xl">{medals[idx]}</span> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{idx + 1}</span>}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="overflow-hidden rounded-full flex-shrink-0">
                                                            <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={36} />
                                                        </div>
                                                        <span className="font-black text-slate-800 text-sm">{c.nom}</span>
                                                    </div>
                                                </td>
                                                {PRODUITS_ORDRE.map(p => {
                                                    const val = c.produits[p.key];
                                                    const obj = Math.round(proratiserObjectif(c.objectifs[p.key], periode));
                                                    const col = couleurTaux(val, obj);
                                                    return (
                                                        <td key={p.code} className="px-3 py-4 text-center">
                                                            <div className={`mx-auto inline-flex h-9 min-w-[40px] flex-col items-center justify-center rounded-xl px-2 text-sm ${col.bg} ${col.text} border ${col.border}`}>
                                                                <span className="font-black">{val}</span>
                                                                {obj > 0 && <span className="text-[10px] opacity-60">/{obj}</span>}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-2xl font-black text-slate-800">{c.total}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-sm font-black ${ct.text}`}>{taux}%</span>
                                                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                                            <div className={`h-full rounded-full ${ct.bar} transition-all duration-700`} style={{ width: `${Math.min(taux, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-7 pb-5 pt-3 text-xs text-slate-300">Couleurs par cellule : vert = objectif atteint · orange = 50–99% · rouge = {"< 50%"}</div>
                    </div>
                </>
            )}
        </main>
    );
}
