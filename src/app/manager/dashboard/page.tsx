"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { PRODUITS_ORDRE, PRODUITS_CLASSEMENT } from "@/utils/produits";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsBoutique } from "@/services/objectifs";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { periodeSemaineEffective } from "@/utils/periodes";
import { getRealiseVentesCombo } from "@/services/variableConseiller";
import { chargerDefisActifsManager, DefiActifManager } from "@/services/challengeRepository";
import { cloturerChallengesExpires } from "@/services/defisService";
import MeteoEquipe from "@/components/manager/MeteoEquipe";
import TeamFeed from "@/components/dashboard/TeamFeed";
import LancerDefiCard from "@/components/manager/LancerDefiCard";
import CarteDefiActif from "@/components/manager/CarteDefiActif";
import AvanceeSection, { AvanceeProduit } from "@/components/manager/AvanceeSection";

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

function jourStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// McAfee Mobile / Assurance essentielle / Canal+ : ventes combo, pas de ligne dans `ventes`
// (voir services/variableConseiller.ts getRealiseVentesCombo) — traités à part des PRODUITS_ORDRE.
const ITEMS_COMBO = [
    { code: "mcafee_mobile", label: "McAfee Mobile", emoji: "📶" },
    { code: "assurance_essentielle", label: "Assurance Essentielle", emoji: "🧩" },
    { code: "canal_plus", label: "Canal+", emoji: "📺" },
] as const;

type Tab = "objectifs" | "activite" | "defis";
const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "objectifs", label: "Objectifs", emoji: "🎯" },
    { id: "activite", label: "Activité équipe", emoji: "⚡" },
    { id: "defis", label: "Défis", emoji: "⚔️" },
];

export default function ManagerDashboard() {
    const { dashboard, loading } = useManagerDashboard();
    const [tab, setTab] = useState<Tab>("objectifs");

    const [kpiDataJour,    setKpiDataJour]    = useState<ConseillerStats[]>([]);
    const [kpiDataSemaine, setKpiDataSemaine] = useState<ConseillerStats[]>([]);
    const [kpiDataMois,    setKpiDataMois]    = useState<ConseillerStats[]>([]);
    const [kpiLoad, setKpiLoad]               = useState(false);
    const [objMensuels, setObjMensuels]       = useState<Record<string, number>>({});
    const [objSemaineMap, setObjSemaineMap]   = useState<Record<string, number>>({});

    // Ventes combo équipe (McAfee Mobile / Assurance essentielle / Canal+), jour / semaine / mois
    const [comboJour, setComboJour]       = useState<Record<string, number>>({});
    const [comboSemaine, setComboSemaine] = useState<Record<string, number>>({});
    const [comboMois, setComboMois]       = useState<Record<string, number>>({});

    // Défis actifs (onglet Défis)
    const [defisActifs, setDefisActifs]   = useState<DefiActifManager[]>([]);
    const [defisLoading, setDefisLoading] = useState(true);

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
        const today = new Date();
        const todayStr = jourStr(today);
        const { debut: semaineDebut, fin: semaineFin } = periodeSemaineEffective(today);
        const semaineDebutStr = jourStr(semaineDebut);
        const semaineFinStr   = jourStr(semaineFin);
        const moisDebutStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
        const moisFinStr   = jourStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));

        function chargerTout() {
            setKpiLoad(true);
            Promise.all([
                construireClassementPeriode("jour"),
                construireClassementPeriode("semaine"),
                construireClassementPeriode("mois"),
                getRealiseVentesCombo(null, todayStr, todayStr),
                getRealiseVentesCombo(null, semaineDebutStr, semaineFinStr),
                getRealiseVentesCombo(null, moisDebutStr, moisFinStr),
            ])
                .then(([jour, semaine, mois, cJour, cSemaine, cMois]) => {
                    setKpiDataJour(jour);
                    setKpiDataSemaine(semaine);
                    setKpiDataMois(mois);
                    setComboJour(cJour);
                    setComboSemaine(cSemaine);
                    setComboMois(cMois);
                })
                .catch(() => {})
                .finally(() => setKpiLoad(false));
        }
        chargerTout();

        // Rafraîchir les données du jour et de la semaine toutes les minutes
        const id = setInterval(() => {
            construireClassementPeriode("jour").then(setKpiDataJour).catch(() => {});
            construireClassementPeriode("semaine").then(setKpiDataSemaine).catch(() => {});
            getRealiseVentesCombo(null, todayStr, todayStr).then(setComboJour).catch(() => {});
            getRealiseVentesCombo(null, semaineDebutStr, semaineFinStr).then(setComboSemaine).catch(() => {});
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    // Objectifs semaine figés, pour tous les produits affichés (core + combo)
    useEffect(() => {
        if (!dashboard) return;
        const ids = dashboard.classement.map((c) => c.id);
        if (ids.length === 0) return;
        const { debut, fin } = periodeSemaineEffective();
        getObjectifsSemaineFiges(ids, debut, fin)
            .then((figes) => {
                const codes = [...PRODUITS_CLASSEMENT.map(p => p.code), ...ITEMS_COMBO.map(i => i.code)];
                const map: Record<string, number> = {};
                codes.forEach((code) => {
                    map[code] = ids.reduce((t: number, id: string) => t + ((figes as any)[id]?.[code] ?? 0), 0);
                });
                setObjSemaineMap(map);
            })
            .catch(() => {});
    }, [dashboard]);

    async function chargerDefis() {
        try {
            await cloturerChallengesExpires().catch(() => {});
            const actifs = await chargerDefisActifsManager();
            setDefisActifs(actifs);
        } catch { /* silencieux */ }
        finally { setDefisLoading(false); }
    }

    useEffect(() => {
        chargerDefis();
        const id = setInterval(chargerDefis, 30_000);
        return () => clearInterval(id);
    }, []);

    // ── Race bars (jour) : produits principaux + items combo ──────────────────
    const daysLeft = workingDaysRemaining();

    const raceBarsCore = PRODUITS_ORDRE.map(p => {
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

        return { code: p.code, label: p.label, emoji: p.emoji, venteJour, venteSemaine, venteMois, objMois, weeklyTarget, dailyTarget, pct: Math.round(pct), isAhead, bonus };
    });

    const raceBarsCombo = ITEMS_COMBO.map(p => {
        const venteJour    = comboJour[p.code] ?? 0;
        const venteSemaine = comboSemaine[p.code] ?? 0;
        const venteMois    = comboMois[p.code] ?? 0;
        const objMois      = objMensuels[p.code] ?? 0;

        const doneAvantAujourdhui = Math.max(venteMois - venteJour, 0);
        const remaining           = Math.max(objMois - doneAvantAujourdhui, 0);
        const dailyTarget         = Math.ceil(remaining / daysLeft);

        const doneAvantCetteSemaine = Math.max(venteMois - venteSemaine, 0);
        const remainingSemaine      = Math.max(objMois - doneAvantCetteSemaine, 0);
        const weeklyTarget          = Math.ceil(remainingSemaine / daysLeft * 6);

        const pct     = dailyTarget > 0 ? Math.min((venteJour / dailyTarget) * 100, 100) : venteJour > 0 ? 100 : 0;
        const isAhead = dailyTarget > 0 && venteJour >= dailyTarget;
        const bonus   = isAhead ? venteJour - dailyTarget : 0;

        return { code: p.code, label: p.label, emoji: p.emoji, venteJour, venteSemaine, venteMois, objMois, weeklyTarget, dailyTarget, pct: Math.round(pct), isAhead, bonus };
    });

    const raceBars = [...raceBarsCore, ...raceBarsCombo];

    const totalJour      = raceBars.reduce((t, p) => t + p.venteJour, 0);
    const totalTarget    = raceBars.reduce((t, p) => t + p.dailyTarget, 0);
    const totalSemaine   = raceBars.reduce((t, p) => t + p.venteSemaine, 0);
    const totalObjSem    = raceBars.reduce((t, p) => t + p.weeklyTarget, 0);
    const totalMois      = raceBars.reduce((t, p) => t + p.venteMois, 0);
    const totalObjM      = raceBars.reduce((t, p) => t + p.objMois, 0);
    const tauxJour       = totalTarget  > 0 ? Math.min(Math.round((totalJour    / totalTarget) * 100), 100) : 0;
    const tauxSemaine    = totalObjSem  > 0 ? Math.min(Math.round((totalSemaine / totalObjSem) * 100), 100) : 0;
    const tauxMois       = totalObjM    > 0 ? Math.min(Math.round((totalMois    / totalObjM)   * 100), 100) : 0;

    // ── Avancée semaine / mois (produits principaux + combo) ──────────────────
    const semaineAvancee: AvanceeProduit[] = [
        ...PRODUITS_CLASSEMENT.map(p => ({
            code: p.code, label: p.label, emoji: p.emoji,
            realise: kpiDataSemaine.reduce((t, c) => t + (c.produits[p.key] ?? 0), 0),
            objectif: objSemaineMap[p.code] ?? 0,
        })),
        ...ITEMS_COMBO.map(p => ({
            code: p.code, label: p.label, emoji: p.emoji,
            realise: comboSemaine[p.code] ?? 0,
            objectif: objSemaineMap[p.code] ?? 0,
        })),
    ];
    const moisAvancee: AvanceeProduit[] = [
        ...PRODUITS_CLASSEMENT.map(p => ({
            code: p.code, label: p.label, emoji: p.emoji,
            realise: kpiDataMois.reduce((t, c) => t + (c.produits[p.key] ?? 0), 0),
            objectif: objMensuels[p.code] ?? 0,
        })),
        ...ITEMS_COMBO.map(p => ({
            code: p.code, label: p.label, emoji: p.emoji,
            realise: comboMois[p.code] ?? 0,
            objectif: objMensuels[p.code] ?? 0,
        })),
    ];

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

            {/* ── Header + onglets ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-500">KPILOTE Manager</p>
                    <h1 className="mt-2 text-4xl font-black text-slate-900">Dashboard</h1>
                </div>

                <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-[0_4px_16px_rgba(15,23,42,.06)]">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition-all ${
                                tab === t.id ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                            }`}
                        >
                            <span>{t.emoji}</span> {t.label}
                            {t.id === "defis" && defisActifs.length > 0 && (
                                <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] text-white">
                                    {defisActifs.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Onglet Objectifs ─────────────────────────────────────────── */}
            {tab === "objectifs" && (
                <>
                    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_64px_rgba(15,23,42,.40)]">

                        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                        <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

                        <div className="relative p-8">

                            <div className="mb-8">
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-400">Objectifs du jour</p>
                                <p className="mt-1 text-sm font-medium capitalize text-white/40">{dateAujourdhui()}</p>
                            </div>

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

                            {!kpiLoad && (
                                <div className="mt-7 grid grid-cols-3 gap-4">

                                    <div className="rounded-2xl bg-white/6 px-5 py-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-1">
                                            Aujourd&apos;hui
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

                    <div className="mt-7 space-y-6">
                        <AvanceeSection titre="Avancée de la semaine" badge="Semaine en cours" produits={semaineAvancee} />
                        <AvanceeSection titre="Avancée du mois" badge="Mois en cours" produits={moisAvancee} />
                    </div>
                </>
            )}

            {/* ── Onglet Activité équipe ───────────────────────────────────── */}
            {tab === "activite" && (
                <div className="space-y-6">
                    <MeteoEquipe />
                    <TeamFeed conseillerId="" grand />
                </div>
            )}

            {/* ── Onglet Défis ─────────────────────────────────────────────── */}
            {tab === "defis" && (
                <div className="space-y-6">
                    {dashboard.classement.length >= 2 && (
                        <LancerDefiCard
                            conseillers={dashboard.classement.map(c => ({ id: c.id, prenom: c.prenom }))}
                        />
                    )}

                    {defisLoading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                        </div>
                    ) : defisActifs.length > 0 ? (
                        <div className="space-y-4">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                ⚔️ En cours maintenant
                            </p>
                            {defisActifs.map((d) => (
                                <CarteDefiActif key={d.id} defi={d} onCloture={chargerDefis} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[24px] bg-white p-10 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="mb-3 text-4xl">⚔️</p>
                            <p className="font-black text-slate-700">Aucun défi en cours</p>
                            <p className="mt-1 text-sm text-slate-400">Lance-en un ci-dessus pour dynamiser l&apos;équipe.</p>
                        </div>
                    )}
                </div>
            )}

        </main>
    );
}
