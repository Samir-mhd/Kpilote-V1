"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { construireAlertes } from "@/engine/managerAI/alertesEngine";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { Periode, PERIODE_LABELS, proratiserObjectif, couleurTaux } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";

const healthLabel: Record<string, string> = {
    excellent: "Excellente dynamique",
    good: "Bonne dynamique",
    warning: "Vigilance requise",
    critical: "Action requise",
};

const niveauColor: Record<string, string> = {
    success: "bg-emerald-50 border-emerald-400 text-emerald-800",
    warning: "bg-orange-50 border-orange-400 text-orange-800",
    danger: "bg-red-50 border-red-400 text-red-800",
};

const niveauIcon: Record<string, string> = {
    success: "✅",
    warning: "⚠️",
    danger: "🔴",
};

function dateAujourdhui() {
    return new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

export default function ManagerDashboard() {
    const { dashboard, loading, refresh } = useManagerDashboard();
    const [periodeKpi, setPeriodeKpi]     = useState<Periode>("mois");
    const [kpiData, setKpiData]           = useState<ConseillerStats[]>([]);
    const [kpiLoading, setKpiLoading]     = useState(false);

    useEffect(() => {
        setKpiLoading(true);
        construireClassementPeriode(periodeKpi)
            .then(setKpiData)
            .catch(() => {})
            .finally(() => setKpiLoading(false));
    }, [periodeKpi]);

    // Agrège tous les conseillers → totaux boutique
    const boutiqueTotaux = PRODUITS_ORDRE.map(p => {
        const realise  = kpiData.reduce((t, c) => t + c.produits[p.key], 0);
        const objectif = Math.round(kpiData.reduce((t, c) => t + proratiserObjectif(c.objectifs[p.key], periodeKpi), 0));
        return { ...p, realise, objectif };
    });

    if (loading || !dashboard) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    <p className="mt-4 text-slate-400">Chargement du cockpit...</p>
                </div>
            </div>
        );
    }

    const alertes = construireAlertes(dashboard.kpis);
    const top3 = dashboard.classement.slice(0, 3);
    const health = dashboard.intelligence.health;

    const kpiTiles = [
        {
            label: "Objectif du jour",
            valeur: `${dashboard.tauxGlobal}%`,
            detail: `${dashboard.realiseGlobal} / ${dashboard.objectifGlobal} ventes`,
            couleur: "from-violet-600 to-indigo-600",
            icone: "🎯",
        },
        {
            label: "Ventes réalisées",
            valeur: `${dashboard.realiseGlobal}`,
            detail: `sur ${dashboard.objectifGlobal} attendues`,
            couleur: "from-emerald-500 to-teal-500",
            icone: "📦",
        },
        {
            label: "Restant à faire",
            valeur: `${dashboard.ventesRestantes}`,
            detail: "ventes pour l'objectif",
            couleur: dashboard.ventesRestantes > 10
                ? "from-orange-500 to-amber-500"
                : "from-emerald-500 to-teal-500",
            icone: "⚡",
        },
        {
            label: "Score IA",
            valeur: `${dashboard.intelligence.score}`,
            detail: healthLabel[health] ?? health,
            couleur: "from-slate-700 to-slate-900",
            icone: "🤖",
        },
    ];

    return (
        <main>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900">
                        Bonjour 👋
                    </h1>
                    <p className="mt-1 text-slate-400">
                        Voici votre brief du jour
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold capitalize text-slate-400">
                        {dateAujourdhui()}
                    </p>

                    <button
                        onClick={refresh}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-all"
                    >
                        Actualiser
                    </button>
                </div>
            </div>

            {/* KPI tiles */}
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {kpiTiles.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="group relative overflow-hidden rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.08)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,23,42,.14)]"
                    >
                        <div
                            className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.couleur} opacity-10 blur-2xl`}
                        />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                                    {kpi.label}
                                </p>
                                <p className="mt-3 text-4xl font-black text-slate-800">
                                    {kpi.valeur}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    {kpi.detail}
                                </p>
                            </div>

                            <div
                                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.couleur} text-2xl shadow-lg transition-all group-hover:scale-110`}
                            >
                                {kpi.icone}
                            </div>
                        </div>

                        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${kpi.couleur}`}
                                style={{
                                    width: kpi.label === "Objectif du jour"
                                        ? `${Math.min(dashboard.tauxGlobal, 100)}%`
                                        : kpi.label === "Score IA"
                                        ? `${dashboard.intelligence.score}%`
                                        : "100%",
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 3-col grid: Brief IA | Alertes | Top Performers */}
            <div className="mt-8 grid gap-6 xl:grid-cols-3">

                {/* Brief IA */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-sm">🧠</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                            Brief IA du matin
                        </p>
                    </div>

                    <h2 className="mt-3 text-xl font-black text-slate-900">
                        {dashboard.intelligence.summary}
                    </h2>

                    <div className="mt-5 space-y-3">
                        {dashboard.briefs.slice(0, 4).map((brief) => (
                            <div
                                key={brief.titre}
                                className={`flex items-start gap-3 rounded-2xl border-l-4 px-4 py-3 ${niveauColor[brief.niveau]}`}
                            >
                                <span className="text-base">{niveauIcon[brief.niveau]}</span>
                                <div>
                                    <p className="text-sm font-black">{brief.titre}</p>
                                    <p className="mt-0.5 text-xs">{brief.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alertes */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-sm">🚨</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                            Alertes
                        </p>
                    </div>

                    {alertes.length === 0 ? (
                        <div className="mt-8 rounded-2xl bg-emerald-50 p-5 text-center">
                            <p className="text-2xl">✅</p>
                            <p className="mt-2 font-semibold text-emerald-700">
                                Aucune alerte active
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {alertes.map((alerte) => (
                                <div
                                    key={alerte.titre}
                                    className="rounded-2xl bg-red-50 p-4"
                                >
                                    <p className="text-sm font-black text-red-800">
                                        {alerte.titre}
                                    </p>
                                    <p className="mt-1 text-xs text-red-600">
                                        {alerte.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Performers */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-sm">🏆</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
                            Top Performers
                        </p>
                    </div>

                    <div className="mt-5 space-y-3">
                        {top3.map((conseiller, index) => {
                            const medals = ["🥇", "🥈", "🥉"];
                            const initiale = conseiller.prenom.charAt(0).toUpperCase();

                            return (
                                <div
                                    key={conseiller.id}
                                    className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 transition-all hover:bg-slate-100"
                                >
                                    <span className="text-2xl">{medals[index]}</span>

                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow">
                                        {initiale}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 truncate">
                                            {conseiller.prenom}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {conseiller.ventes} ventes aujourd'hui
                                        </p>
                                    </div>

                                    <p className="text-lg font-black text-slate-700">
                                        {conseiller.ventes}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {dashboard.classement.length > 3 && (
                        <p className="mt-5 text-center text-xs font-semibold text-slate-400">
                            + {dashboard.classement.length - 3} autres conseillers
                        </p>
                    )}
                </div>

            </div>

            {/* Objectifs par produit */}
            <div className="mt-8 rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-sm">📊</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Objectifs boutique par produit</p>
                    </div>
                    <div className="flex gap-2">
                        {(["jour", "semaine", "mois"] as Periode[]).map(p => (
                            <button key={p} onClick={() => setPeriodeKpi(p)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                                    periodeKpi === p ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}>
                                {PERIODE_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {kpiLoading ? (
                    <div className="flex h-24 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {boutiqueTotaux.map(p => {
                            const ct   = couleurTaux(p.realise, p.objectif);
                            const pct  = p.objectif > 0 ? Math.min(Math.round((p.realise / p.objectif) * 100), 100) : 0;
                            return (
                                <div key={p.code} className={`rounded-2xl border p-4 ${ct.bg} ${ct.border}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg">{p.emoji}</span>
                                        <span className={`text-xs font-black ${ct.text}`}>{pct}%</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p.label}</p>
                                    <p className={`mt-1 text-3xl font-black ${ct.text}`}>{p.realise}</p>
                                    {p.objectif > 0 && (
                                        <>
                                            <p className="text-xs text-slate-400">/ {p.objectif} attendus</p>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
                                                <div className={`h-full rounded-full ${ct.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recommandation IA */}
            {dashboard.recommandations.length > 0 && (
                <div className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-r from-violet-600 to-indigo-600 p-7 shadow-[0_8px_32px_rgba(109,40,217,.30)]">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">💡</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
                                    Recommandation IA
                                </p>
                                <p className="mt-1 text-lg font-black text-white">
                                    {dashboard.recommandations[0].titre}
                                </p>
                                <p className="mt-1 text-violet-100">
                                    {dashboard.recommandations[0].action}
                                </p>
                            </div>
                        </div>

                        <button className="flex-shrink-0 rounded-2xl bg-white px-6 py-3 font-black text-violet-700 shadow transition-all hover:scale-105 hover:shadow-lg">
                            Lancer un challenge →
                        </button>
                    </div>
                </div>
            )}

        </main>
    );
}
