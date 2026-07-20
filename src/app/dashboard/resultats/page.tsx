"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMissionsCompletes, getVentesParMois, MissionComplete } from "@/services/missionsReelles";

const MOIS_LABELS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_NOMS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function tauxColor(p: number) {
    if (p >= 100) return { bar: "from-violet-500 to-fuchsia-500", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" };
    if (p >= 80)  return { bar: "from-emerald-500 to-green-400",  badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
    if (p >= 50)  return { bar: "from-amber-400 to-orange-400",   badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-400" };
    return             { bar: "from-red-500 to-rose-400",         badge: "bg-red-100 text-red-700",        dot: "bg-red-500" };
}

// Couleur du score/% basée sur la pace réelle (avance vs retard) — pas sur le % mensuel brut
function etatTextColor(etat: string): string {
    if (etat === "termine") return "text-violet-400";
    if (etat === "avance")  return "text-emerald-400";
    if (etat === "rythme")  return "text-amber-400";
    return "text-red-400";
}

function etatLabel(etat: string) {
    if (etat === "termine") return "🏆 Objectif atteint";
    if (etat === "avance")  return "🚀 En avance";
    if (etat === "rythme")  return "🔥 Dans le rythme";
    return "⚠️ En retard";
}

// Arc SVG pour la progression globale
function ArcGlobal({ pct }: { pct: number }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(pct, 100) / 100);
    const col = pct >= 80 ? "#8b5cf6" : pct >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
    );
}

function ResultatsInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const nom          = searchParams.get("nom") ?? "Conseiller";

    const [missions,   setMissions]   = useState<MissionComplete[]>([]);
    const [vue,        setVue]        = useState<"globale" | "produit">("globale");
    const [historique, setHistorique] = useState<{ mois: number; annee: number; label: string; ventes: Record<string, number> }[]>([]);
    const [loading,    setLoading]    = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        setLoading(true);
        const now = new Date();
        Promise.all([
            getMissionsCompletes(conseillerId),
            ...[-3, -2, -1].map((delta) => {
                let m = now.getMonth() + 1 + delta;
                let a = now.getFullYear();
                if (m < 1) { m += 12; a -= 1; }
                return getVentesParMois(conseillerId, a, m).then(v => ({ mois: m, annee: a, label: `${MOIS_LABELS[m]} ${a}`, ventes: v }));
            }),
        ]).then(([missionsData, ...histData]) => {
            setMissions(missionsData as MissionComplete[]);
            setHistorique(histData as any[]);
        }).finally(() => setLoading(false));
    }, [conseillerId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    // Spiderhome = historisation, pas un acte commercial → exclu du total de la carte principale
    const missionsCommerciales = missions.filter((m) => m.produit.toLowerCase() !== "spiderhome");
    const totalRealise    = missionsCommerciales.reduce((t, m) => t + m.realise, 0);
    const totalObjectif   = missionsCommerciales.reduce((t, m) => t + m.objectifMensuel, 0);
    const progressionGlob = totalObjectif > 0 ? Math.round((totalRealise / totalObjectif) * 100) : 0;
    const projection      = missionsCommerciales.reduce((t, m) => t + m.projectionFinMois, 0);
    const cGlob           = tauxColor(progressionGlob);
    const etatGlob        = progressionGlob >= 100 ? "termine" : progressionGlob >= 80 ? "avance" : progressionGlob >= 50 ? "rythme" : "retard";

    return (
        <div className="space-y-7">

            {/* ── Hero banner ───────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 shadow-[0_20px_60px_rgba(15,23,42,.40)]">
                <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-fuchsia-600/15 blur-3xl" />

                <div className="relative flex items-center gap-8 px-9 py-8">
                    {/* Arc progression */}
                    <div className="relative flex-shrink-0">
                        <ArcGlobal pct={progressionGlob} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className={`text-3xl font-black ${etatTextColor(etatGlob)}`}>{progressionGlob}%</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">global</p>
                        </div>
                    </div>

                    {/* Infos */}
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-violet-400">
                            Mes objectifs
                        </p>
                        <h1 className="mt-2 text-4xl font-black text-white leading-tight">
                            {nom}
                        </h1>
                        <p className="mt-1 text-sm font-semibold capitalize text-white/40">
                            {MOIS_NOMS[new Date().getMonth()]} {new Date().getFullYear()}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-4">
                            <div>
                                <p className="text-xs text-white/30 uppercase tracking-wider">Réalisé</p>
                                <p className="text-2xl font-black text-white">{totalRealise}</p>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div>
                                <p className="text-xs text-white/30 uppercase tracking-wider">Objectif</p>
                                <p className="text-2xl font-black text-white">{totalObjectif}</p>
                            </div>
                            <div className="w-px bg-white/10" />
                            <div>
                                <p className="text-xs text-white/30 uppercase tracking-wider">Projection</p>
                                <p className={`text-2xl font-black ${projection >= totalObjectif ? "text-violet-300" : "text-amber-300"}`}>
                                    {projection}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Toggle vue ─────────────────────────────────────────────── */}
            <div className="flex gap-2">
                {(["globale", "produit"] as const).map(v => (
                    <button key={v} onClick={() => setVue(v)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            vue === v
                                ? "bg-violet-600 text-white shadow-md"
                                : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}>
                        {v === "globale" ? "Vue synthèse" : "Par produit"}
                    </button>
                ))}
            </div>

            {/* ── Vue globale ────────────────────────────────────────────── */}
            {vue === "globale" && (
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="mb-6 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Tous les produits
                    </p>
                    <div className="space-y-6">
                        {missions.map(m => {
                            const c    = tauxColor(m.progression);
                            const etat = etatLabel(m.etat);
                            return (
                                <div key={m.produit} className="group">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                                            <p className="font-black text-slate-800">{m.produit}</p>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.badge}`}>
                                                {etat}
                                            </span>
                                        </div>
                                        <p className={`text-lg font-black ${etatTextColor(m.etat)}`}>{m.progression}%</p>
                                    </div>

                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-700`}
                                            style={{ width: `${Math.min(m.progression, 100)}%` }} />
                                    </div>

                                    <div className="mt-2 grid grid-cols-3 text-xs text-slate-400">
                                        <span><span className="font-bold text-slate-600">{m.realise}</span> réalisé</span>
                                        <span className="text-center">
                                            <span className="font-bold text-violet-500">{m.objectifJour}</span>/jour requis
                                        </span>
                                        <span className="text-right">
                                            obj. <span className="font-bold text-slate-600">{m.objectifMensuel}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Vue par produit ─────────────────────────────────────────── */}
            {vue === "produit" && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {missions.map(m => {
                        const c    = tauxColor(m.progression);
                        const etat = etatLabel(m.etat);
                        return (
                            <div key={m.produit}
                                className="relative overflow-hidden rounded-[24px] bg-slate-900 p-6 shadow-[0_8px_32px_rgba(15,23,42,.25)]">
                                <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${c.bar} opacity-15 blur-2xl`} />
                                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.bar}`} />

                                <div className="relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                                Objectif mensuel
                                            </p>
                                            <p className="mt-1 text-xl font-black text-white">{m.produit}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${c.badge}`}>
                                            {etat}
                                        </span>
                                    </div>

                                    <p className={`text-5xl font-black ${etatTextColor(m.etat)}`}>{m.progression}%</p>

                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-700`}
                                            style={{ width: `${Math.min(m.progression, 100)}%` }} />
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                        {[
                                            { label: "Réalisé",  val: m.realise },
                                            { label: "Objectif", val: m.objectifMensuel },
                                            { label: "Restant",  val: m.resteAFaire },
                                        ].map(({ label, val }) => (
                                            <div key={label} className="rounded-xl bg-white/6 py-3 text-center">
                                                <p className="text-xl font-black text-white">{val}</p>
                                                <p className="text-xs text-white/40">{label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white/6 px-4 py-3">
                                        <div>
                                            <p className="text-xs text-white/40">Projection fin de mois</p>
                                            <p className={`text-xl font-black ${m.projectionFinMois >= m.objectifMensuel ? "text-violet-300" : "text-amber-300"}`}>
                                                {m.projectionFinMois} / {m.objectifMensuel}
                                            </p>
                                        </div>
                                        <p className="text-xs text-white/30">{m.objectifJour}/jour requis</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Historique 3 mois ───────────────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Historique — 3 mois précédents
                </p>
                {historique.every(h => Object.keys(h.ventes).length === 0) ? (
                    <p className="text-sm text-slate-400">Aucune donnée disponible.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                        {historique.map(h => {
                            const total = Object.values(h.ventes).reduce((t, v) => t + v, 0);
                            return (
                                <div key={h.label} className="rounded-2xl bg-slate-50 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{h.label}</p>
                                    <p className="mt-2 text-3xl font-black text-slate-800">{total}</p>
                                    <p className="text-xs text-slate-400 mb-3">ventes totales</p>
                                    <div className="space-y-1.5">
                                        {Object.entries(h.ventes).map(([produit, nb]) => (
                                            <div key={produit} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500">{produit}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                                                        <div className="h-full rounded-full bg-violet-400"
                                                            style={{ width: `${total > 0 ? Math.round((nb / total) * 100) : 0}%` }} />
                                                    </div>
                                                    <span className="font-bold text-slate-700 w-4 text-right">{nb}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}

export default function ResultatsPage() {
    return <Suspense><ResultatsInner /></Suspense>;
}
