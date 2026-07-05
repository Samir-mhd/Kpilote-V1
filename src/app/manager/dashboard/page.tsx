"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsBoutique } from "@/services/objectifs";
import MeteoEquipe from "@/components/manager/MeteoEquipe";
import TeamFeed from "@/components/dashboard/TeamFeed";
import AlertesLive from "@/components/manager/AlertesLive";
import LancerDefiCard from "@/components/manager/LancerDefiCard";

function dateAujourdhui() {
    return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// Jours restants dans le mois, aujourd'hui inclus, dimanches exclus
function workingDaysRemaining(): number {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let count = 0;
    for (const d = new Date(now); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) count++;
    }
    return Math.max(count, 1);
}

export default function ManagerDashboard() {
    const { dashboard, loading } = useManagerDashboard();

    const [kpiDataJour,    setKpiDataJour]    = useState<ConseillerStats[]>([]);
    const [kpiDataSemaine, setKpiDataSemaine] = useState<ConseillerStats[]>([]);
    const [kpiDataMois,    setKpiDataMois]    = useState<ConseillerStats[]>([]);
    const [kpiLoad, setKpiLoad]               = useState(false);
    const [objMensuels, setObjMensuels]       = useState<Record<string, number>>({});

    useEffect(() => {
        getObjectifsBoutique()
            .then(rows => {
                const map: Record<string, number> = {};
                rows.forEach((r: any) => {
                    const code = r.produits?.code;
                    if (code) map[code] = r.objectif ?? 0;
                });
                setObjMensuels(map);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        setKpiLoad(true);
        Promise.all([
            construireClassementPeriode("jour"),
            construireClassementPeriode("semaine"),
            construireClassementPeriode("mois"),
        ])
            .then(([jour, semaine, mois]) => {
                setKpiDataJour(jour);
                setKpiDataSemaine(semaine);
                setKpiDataMois(mois);
            })
            .catch(() => {})
            .finally(() => setKpiLoad(false));

        // Rafraîchir les données du jour et de la semaine toutes les minutes
        const id = setInterval(() => {
            construireClassementPeriode("jour").then(setKpiDataJour).catch(() => {});
            construireClassementPeriode("semaine").then(setKpiDataSemaine).catch(() => {});
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    // ── Race bars data ────────────────────────────────────────────────────────
    const daysLeft = workingDaysRemaining();

    const raceBars = PRODUITS_ORDRE.map(p => {
        const venteJour    = kpiDataJour.reduce((t, c) => t + c.produits[p.key], 0);
        const venteSemaine = kpiDataSemaine.reduce((t, c) => t + c.produits[p.key], 0);
        const venteMois    = kpiDataMois.reduce((t, c) => t + c.produits[p.key], 0);
        const objMois      = objMensuels[p.code] ?? 0;

        // Rythme dynamique jour : (obj restant avant aujourd'hui) / jours restants
        const doneAvantAujourdhui = Math.max(venteMois - venteJour, 0);
        const remaining           = Math.max(objMois - doneAvantAujourdhui, 0);
        const dailyTarget         = Math.ceil(remaining / daysLeft);

        // Rythme dynamique semaine : taux journalier × 6 jours ouvrés/semaine
        const doneAvantCetteSemaine = Math.max(venteMois - venteSemaine, 0);
        const remainingSemaine      = Math.max(objMois - doneAvantCetteSemaine, 0);
        const weeklyTarget          = Math.ceil(remainingSemaine / daysLeft * 6);

        const pct     = dailyTarget > 0 ? Math.min((venteJour / dailyTarget) * 100, 100) : venteJour > 0 ? 100 : 0;
        const isAhead = dailyTarget > 0 && venteJour >= dailyTarget;
        const bonus   = isAhead ? venteJour - dailyTarget : 0;

        return { ...p, venteJour, venteSemaine, venteMois, objMois, weeklyTarget, dailyTarget, pct: Math.round(pct), isAhead, bonus };
    });

    const totalJour      = raceBars.reduce((t, p) => t + p.venteJour, 0);
    const totalTarget    = raceBars.reduce((t, p) => t + p.dailyTarget, 0);
    const totalSemaine   = raceBars.reduce((t, p) => t + p.venteSemaine, 0);
    const totalObjSem    = raceBars.reduce((t, p) => t + p.weeklyTarget, 0);
    const totalMois      = raceBars.reduce((t, p) => t + p.venteMois, 0);
    const totalObjM      = raceBars.reduce((t, p) => t + p.objMois, 0);
    const tauxJour       = totalTarget  > 0 ? Math.min(Math.round((totalJour    / totalTarget) * 100), 100) : 0;
    const tauxSemaine    = totalObjSem  > 0 ? Math.min(Math.round((totalSemaine / totalObjSem) * 100), 100) : 0;
    const tauxMois       = totalObjM    > 0 ? Math.min(Math.round((totalMois    / totalObjM)   * 100), 100) : 0;

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

    return (
        <main className="space-y-7">

            {/* ── Hero — Objectifs du jour ──────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_64px_rgba(15,23,42,.40)]">

                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

                <div className="relative p-8">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-400">KPILOTE Manager</p>
                            <h1 className="mt-2 text-4xl font-black text-white">Objectifs du jour</h1>
                            <p className="mt-1 text-sm font-medium capitalize text-white/40">{dateAujourdhui()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <span className="rounded-2xl bg-white/8 px-4 py-2 text-xs font-black text-white/60">
                                J-{daysLeft} avant fin de mois
                            </span>
                            <span className="rounded-2xl bg-white/8 px-4 py-2 text-xs font-semibold text-white/40">
                                Cible = rythme dynamique
                            </span>
                        </div>
                    </div>

                    {/* Race bars */}
                    {kpiLoad ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {raceBars.map(p => {
                                const barColor = p.isAhead
                                    ? "bg-emerald-400"
                                    : p.pct >= 60 ? "bg-amber-400" : "bg-red-400";
                                const glowColor = p.isAhead
                                    ? "shadow-[0_0_12px_rgba(52,211,153,.4)]"
                                    : p.pct >= 60 ? "shadow-[0_0_12px_rgba(251,191,36,.3)]" : "";
                                const pctColor = p.isAhead
                                    ? "text-emerald-300"
                                    : p.pct >= 60 ? "text-amber-300" : "text-red-400";

                                return (
                                    <div key={p.code}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xl">{p.emoji}</span>
                                                <span className="text-sm font-bold text-white/70">{p.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {p.bonus > 0 && (
                                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                                                        +{p.bonus} bonus
                                                    </span>
                                                )}
                                                <span className="text-2xl font-black text-white tabular-nums">{p.venteJour}</span>
                                                <span className="text-sm text-white/30">/ {p.dailyTarget} obj</span>
                                                <span className={`w-10 text-right text-xs font-black ${pctColor}`}>{p.pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${barColor} ${glowColor}`}
                                                style={{ width: `${p.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer — résumé du jour + semaine + mois */}
                    {!kpiLoad && (
                        <div className="mt-7 grid grid-cols-3 gap-4">

                            {/* Aujourd'hui */}
                            <div className="rounded-2xl bg-white/6 px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-1">
                                    Aujourd'hui
                                </p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-black text-white">{totalJour}</p>
                                    <p className="mb-0.5 text-sm text-white/30">/ {totalTarget} cible</p>
                                    <p className={`mb-0.5 ml-auto text-sm font-black ${tauxJour >= 100 ? "text-emerald-300" : tauxJour >= 60 ? "text-amber-300" : "text-red-400"}`}>
                                        {tauxJour}%
                                    </p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${tauxJour >= 100 ? "bg-emerald-400" : tauxJour >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                        style={{ width: `${tauxJour}%` }}
                                    />
                                </div>
                            </div>

                            {/* Semaine en cours */}
                            <div className="rounded-2xl bg-white/6 px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-1">
                                    Semaine
                                </p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-black text-white">{totalSemaine}</p>
                                    <p className="mb-0.5 text-sm text-white/30">/ {totalObjSem} obj</p>
                                    <p className={`mb-0.5 ml-auto text-sm font-black ${tauxSemaine >= 100 ? "text-emerald-300" : tauxSemaine >= 60 ? "text-amber-300" : "text-red-400"}`}>
                                        {tauxSemaine}%
                                    </p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${tauxSemaine >= 100 ? "bg-emerald-400" : tauxSemaine >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                        style={{ width: `${tauxSemaine}%` }}
                                    />
                                </div>
                            </div>

                            {/* Mois en cours */}
                            <div className="rounded-2xl bg-white/6 px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-1">
                                    Mois en cours
                                </p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-black text-white">{totalMois}</p>
                                    <p className="mb-0.5 text-sm text-white/30">/ {totalObjM} obj</p>
                                    <p className={`mb-0.5 ml-auto text-sm font-black ${tauxMois >= 100 ? "text-emerald-300" : tauxMois >= 60 ? "text-amber-300" : "text-red-400"}`}>
                                        {tauxMois}%
                                    </p>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${tauxMois >= 100 ? "bg-emerald-400" : tauxMois >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                        style={{ width: `${tauxMois}%` }}
                                    />
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>

            {/* ── Météo équipe + Feed ──────────────────────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <MeteoEquipe />
                <TeamFeed conseillerId="" />
            </div>

            {/* ── Alertes live ─────────────────────────────────────────────── */}
            <AlertesLive />

            {/* ── Lancer un défi / challenge ───────────────────────────────── */}
            {dashboard.classement.length >= 2 && (
                <LancerDefiCard
                    conseillers={dashboard.classement.map(c => ({ id: c.id, prenom: c.prenom }))}
                />
            )}

            {/* ── Recommandation IA ────────────────────────────────────────── */}
            {dashboard.recommandations.length > 0 && (
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-violet-600 to-indigo-600 p-7 shadow-[0_8px_32px_rgba(109,40,217,.30)]">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl flex-shrink-0">💡</span>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200 mb-1">Recommandation IA</p>
                                <p className="text-lg font-black text-white">{dashboard.recommandations[0].titre}</p>
                                <p className="mt-1 text-sm text-violet-100">{dashboard.recommandations[0].action}</p>
                            </div>
                        </div>
                        <button className="flex-shrink-0 rounded-2xl bg-white px-6 py-3 font-black text-violet-700 shadow transition-all hover:scale-[1.02]">
                            Lancer un challenge →
                        </button>
                    </div>
                </div>
            )}

        </main>
    );
}
