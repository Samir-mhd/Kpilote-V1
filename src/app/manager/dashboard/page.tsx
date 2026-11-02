"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { PRODUITS_CLASSEMENT } from "@/utils/produits";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsEquipeMois } from "@/services/objectifsEquipe";
import { periodeSemaineEffective } from "@/utils/periodes";
import { getRealiseVentesCombo } from "@/services/variableConseiller";
import { chargerDefisActifsManager, DefiActifManager } from "@/services/challengeRepository";
import { cloturerChallengesExpires } from "@/services/defisService";
import MeteoEquipe from "@/components/manager/MeteoEquipe";
import TeamFeed from "@/components/dashboard/TeamFeed";
import LancerDefiCard from "@/components/manager/LancerDefiCard";
import CarteDefiActif from "@/components/manager/CarteDefiActif";
import AvanceeSection, { AvanceeProduit } from "@/components/manager/AvanceeSection";

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
// (voir services/variableConseiller.ts getRealiseVentesCombo) — traités à part de PRODUITS_CLASSEMENT.
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

    // Ventes combo équipe (McAfee Mobile / Assurance essentielle / Canal+), jour / semaine / mois
    const [comboJour, setComboJour]       = useState<Record<string, number>>({});
    const [comboSemaine, setComboSemaine] = useState<Record<string, number>>({});
    const [comboMois, setComboMois]       = useState<Record<string, number>>({});

    // Défis actifs (onglet Défis)
    const [defisActifs, setDefisActifs]   = useState<DefiActifManager[]>([]);
    const [defisLoading, setDefisLoading] = useState(true);

    useEffect(() => {
        getObjectifsEquipeMois().then(setObjMensuels).catch(() => {});
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

    // Rythme dynamique : reste à faire (obj mensuel - déjà fait avant la période) / jours
    // restants du mois, × 6 pour la semaine — même formule que le classement (jour/semaine/mois
    // toujours cohérents entre eux et avec la vue classement).
    function cible(objMois: number, venteJour: number, venteSemaine: number, venteMois: number) {
        const dailyTarget  = Math.ceil(Math.max(objMois - Math.max(venteMois - venteJour, 0), 0) / daysLeft);
        const weeklyTarget = Math.ceil(Math.max(objMois - Math.max(venteMois - venteSemaine, 0), 0) / daysLeft * 6);
        return { dailyTarget, weeklyTarget };
    }

    const produitsAvancee = [
        ...PRODUITS_CLASSEMENT.map(p => {
            const venteJour    = kpiDataJour.reduce((t, c) => t + c.produits[p.key], 0);
            const venteSemaine = kpiDataSemaine.reduce((t, c) => t + c.produits[p.key], 0);
            const venteMois    = kpiDataMois.reduce((t, c) => t + c.produits[p.key], 0);
            const objMois      = objMensuels[p.code] ?? 0;
            return { code: p.code, label: p.label, emoji: p.emoji, venteJour, venteSemaine, venteMois, objMois, ...cible(objMois, venteJour, venteSemaine, venteMois) };
        }),
        ...ITEMS_COMBO.map(p => {
            const venteJour    = comboJour[p.code] ?? 0;
            const venteSemaine = comboSemaine[p.code] ?? 0;
            const venteMois    = comboMois[p.code] ?? 0;
            const objMois      = objMensuels[p.code] ?? 0;
            return { code: p.code, label: p.label, emoji: p.emoji, venteJour, venteSemaine, venteMois, objMois, ...cible(objMois, venteJour, venteSemaine, venteMois) };
        }),
    ];

    const jourAvancee: AvanceeProduit[]    = produitsAvancee.map(p => ({ code: p.code, label: p.label, emoji: p.emoji, realise: p.venteJour, objectif: p.dailyTarget }));
    const semaineAvancee: AvanceeProduit[] = produitsAvancee.map(p => ({ code: p.code, label: p.label, emoji: p.emoji, realise: p.venteSemaine, objectif: p.weeklyTarget }));
    const moisAvancee: AvanceeProduit[]    = produitsAvancee.map(p => ({ code: p.code, label: p.label, emoji: p.emoji, realise: p.venteMois, objectif: p.objMois }));

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
                <div className="space-y-6">
                    {kpiLoad ? (
                        <div className="flex h-48 items-center justify-center rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            <AvanceeSection titre="Avancée du jour" badge="Aujourd'hui" produits={jourAvancee} />
                            <AvanceeSection titre="Avancée de la semaine" badge="Semaine en cours" produits={semaineAvancee} />
                            <AvanceeSection titre="Avancée du mois" badge="Mois en cours" produits={moisAvancee} />
                        </>
                    )}
                </div>
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
