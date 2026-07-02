"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMissionsCompletes, getVentesParMois, MissionComplete } from "@/services/missionsReelles";

const MOIS_LABELS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function tauxColor(progression: number) {
    if (progression >= 80) return { bar: "from-green-500 to-emerald-400", text: "text-green-600", bg: "bg-green-50" };
    if (progression >= 50) return { bar: "from-orange-400 to-amber-400", text: "text-orange-600", bg: "bg-orange-50" };
    return { bar: "from-red-500 to-rose-400", text: "text-red-600", bg: "bg-red-50" };
}

function etatLabel(etat: string) {
    if (etat === "termine") return { label: "Terminé 🏆", color: "bg-green-100 text-green-700" };
    if (etat === "avance") return { label: "En avance 🚀", color: "bg-blue-100 text-blue-700" };
    if (etat === "rythme") return { label: "Dans le rythme 🔥", color: "bg-amber-100 text-amber-700" };
    return { label: "En retard ⚠️", color: "bg-red-100 text-red-700" };
}

export default function ResultatsPage() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const nom = searchParams.get("nom") ?? "Conseiller";

    const [missions, setMissions] = useState<MissionComplete[]>([]);
    const [vue, setVue] = useState<"globale" | "produit">("globale");
    const [historique, setHistorique] = useState<{ mois: number; annee: number; label: string; ventes: Record<string, number> }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        async function charger() {
            setLoading(true);
            try {
                const now = new Date();
                const [missionsData, ...histData] = await Promise.all([
                    getMissionsCompletes(conseillerId),
                    ...[-3, -2, -1].map((delta) => {
                        let m = now.getMonth() + 1 + delta;
                        let a = now.getFullYear();
                        if (m < 1) { m += 12; a -= 1; }
                        return getVentesParMois(conseillerId, a, m).then((v) => ({
                            mois: m, annee: a, label: `${MOIS_LABELS[m]} ${a}`, ventes: v,
                        }));
                    }),
                ]);
                setMissions(missionsData);
                setHistorique(histData);
            } finally {
                setLoading(false);
            }
        }
        charger();
    }, [conseillerId]);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>;
    }

    const totalRealise = missions.reduce((t, m) => t + m.realise, 0);
    const totalObjectif = missions.reduce((t, m) => t + m.objectifMensuel, 0);
    const progressionGlobale = totalObjectif > 0 ? Math.round((totalRealise / totalObjectif) * 100) : 0;
    const projectionGlobale = missions.reduce((t, m) => t + m.projectionFinMois, 0);
    const colors = tauxColor(progressionGlobale);

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">Résultats</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">{nom} — {MOIS_NOMS[new Date().getMonth()]}</h1>
            </div>

            {/* Vue globale résumée */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Progression mensuelle</p>
                        <p className={`mt-2 text-5xl font-black ${colors.text}`}>{progressionGlobale}%</p>
                        <p className="mt-1 text-slate-500">{totalRealise} / {totalObjectif} ventes</p>
                    </div>
                    <div className={`rounded-2xl px-4 py-2 text-sm font-black ${colors.bg} ${colors.text}`}>
                        Projection : {projectionGlobale} ventes
                    </div>
                </div>

                <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700`}
                        style={{ width: `${Math.min(progressionGlobale, 100)}%` }}
                    />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                    {progressionGlobale >= 100
                        ? "🏆 Objectif mensuel atteint — chaque vente supplémentaire est du bonus !"
                        : progressionGlobale >= 80
                        ? "🔥 Très bonne dynamique — continue sur cette lancée."
                        : progressionGlobale >= 50
                        ? "⚡ Rythme à accélérer pour terminer le mois dans les clous."
                        : "⚠️ Retard à rattraper — concentre-toi sur les produits prioritaires."}
                </p>
            </div>

            {/* Toggle vue */}
            <div className="flex gap-2">
                {(["globale", "produit"] as const).map((v) => (
                    <button
                        key={v}
                        onClick={() => setVue(v)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            vue === v ? "bg-green-600 text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}
                    >
                        {v === "globale" ? "Vue globale" : "Par produit"}
                    </button>
                ))}
            </div>

            {/* Vue globale : tableau */}
            {vue === "globale" && (
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tous les produits</p>
                    <div className="space-y-5">
                        {missions.map((m) => {
                            const c = tauxColor(m.progression);
                            const etat = etatLabel(m.etat);
                            return (
                                <div key={m.produit}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <p className="font-black text-slate-800">{m.produit}</p>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${etat.color}`}>{etat.label}</span>
                                        </div>
                                        <p className={`text-sm font-black ${c.text}`}>{m.progression}%</p>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-700`}
                                            style={{ width: `${Math.min(m.progression, 100)}%` }}
                                        />
                                    </div>
                                    <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                                        <span>{m.realise} réalisé</span>
                                        <span>{m.resteAFaire} restants · objectif/jour : {m.objectifJour}</span>
                                        <span>Obj. mensuel : {m.objectifMensuel}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Vue par produit : cartes détaillées */}
            {vue === "produit" && (
                <div className="grid gap-5 sm:grid-cols-2">
                    {missions.map((m) => {
                        const c = tauxColor(m.progression);
                        const etat = etatLabel(m.etat);
                        return (
                            <div key={m.produit} className="rounded-[20px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                                <div className="flex items-start justify-between">
                                    <p className="text-lg font-black text-slate-900">{m.produit}</p>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${etat.color}`}>{etat.label}</span>
                                </div>

                                <p className={`mt-3 text-4xl font-black ${c.text}`}>{m.progression}%</p>

                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${c.bar}`} style={{ width: `${Math.min(m.progression, 100)}%` }} />
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    {[
                                        { label: "Réalisé", val: m.realise },
                                        { label: "Objectif", val: m.objectifMensuel },
                                        { label: "Restant", val: m.resteAFaire },
                                    ].map(({ label, val }) => (
                                        <div key={label} className="rounded-xl bg-slate-50 py-2">
                                            <p className="text-lg font-black text-slate-800">{val}</p>
                                            <p className="text-xs text-slate-400">{label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-semibold text-slate-500">Projection fin de mois</p>
                                    <p className={`text-xl font-black ${m.projectionFinMois >= m.objectifMensuel ? "text-green-600" : "text-orange-500"}`}>
                                        {m.projectionFinMois} / {m.objectifMensuel}
                                    </p>
                                </div>

                                <p className="mt-3 text-xs text-slate-400">{m.message}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Historique 3 mois */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Historique — 3 derniers mois</p>

                {historique.every((h) => Object.keys(h.ventes).length === 0) ? (
                    <p className="text-slate-400">Aucune donnée disponible pour les mois précédents.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                        {historique.map((h) => {
                            const total = Object.values(h.ventes).reduce((t, v) => t + v, 0);
                            return (
                                <div key={h.label} className="rounded-2xl bg-slate-50 p-5">
                                    <p className="text-sm font-bold text-slate-500">{h.label}</p>
                                    <p className="mt-1 text-3xl font-black text-slate-800">{total}</p>
                                    <p className="text-xs text-slate-400">ventes totales</p>
                                    <div className="mt-3 space-y-1.5">
                                        {Object.entries(h.ventes).map(([produit, nb]) => (
                                            <div key={produit} className="flex justify-between text-xs">
                                                <span className="text-slate-500">{produit}</span>
                                                <span className="font-bold text-slate-700">{nb}</span>
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
