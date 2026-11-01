"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUITS_CLASSEMENT } from "@/utils/produits";
import { construireClassementPeriode } from "@/services/classementService";
import { getObjectifsBoutique } from "@/services/objectifs";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { periodeSemaineEffective } from "@/utils/periodes";
import { jourStr } from "@/services/planningService";
import { calculerStreak, STREAK_BADGES } from "@/services/streakService";
import {
    PRODUIT_BADGES, BOX_BADGES, DEFI_BADGES, PRODUIT_STREAK_BADGES,
    JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE,
} from "@/services/badgesService";
import { getBadgesDebloquesLe, BadgeDebloqueLe } from "@/services/badgesManagerService";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import LancerDefiCard from "@/components/manager/LancerDefiCard";
import AvanceeSection, { AvanceeProduit } from "@/components/manager/AvanceeSection";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ConseillerHier = {
    id: string; nom: string; prenom: string;
    total: number; produits: Record<string, number>;
};
type ProduitHier  = { code: string; label: string; emoji: string; total: number };
type ProduitMois  = { code: string; label: string; emoji: string; ventes: number; objectif: number; taux: number; dailyTarget: number };
type ClassementLigne = { id: string; nom: string; prenom: string; total: number };
type StreakLigne = { id: string; nom: string; prenom: string; streak: number; risque: boolean };

type BriefData = {
    dateHierLabel: string;
    totalHier: number;
    topPerformers: ConseillerHier[];
    enDifficulte: ConseillerHier[];
    parProduitHier: ProduitHier[];
    produitsMois: ProduitMois[];
    totalMois: number; totalObjectif: number; tauxMois: number;
    joursRestants: number; rythmeNecessaire: number; rythmeActuel: number;
    scriptOral: string;
    conseillers: { id: string; prenom: string }[];
    classementVendeur: ClassementLigne[];
    streaks: StreakLigne[];
    badgesHier: BadgeDebloqueLe[];
    semaineAvancee: AvanceeProduit[];
    moisAvancee: AvanceeProduit[];
    photos: Record<string, string | null>;
};

const BADGE_INFO: Record<string, { label: string; emoji: string }> = {};
[...STREAK_BADGES, ...PRODUIT_BADGES, ...BOX_BADGES, ...DEFI_BADGES, ...PRODUIT_STREAK_BADGES, ...JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE].forEach((b) => {
    BADGE_INFO[b.code] = { label: b.label, emoji: b.emoji };
});

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function workingDaysInRange(a: Date, b: Date): number {
    let count = 0;
    const d = new Date(a);
    while (d <= b) {
        if (d.getDay() !== 0) count++;
        d.setDate(d.getDate() + 1);
    }
    return Math.max(count, 0);
}

function workingDaysRemaining(): number {
    const now = new Date();
    return Math.max(workingDaysInRange(now, new Date(now.getFullYear(), now.getMonth() + 1, 0)), 1);
}

function dateLabel(d: Date) {
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/* ─── Génération script oral ─────────────────────────────────────────────── */

function genererScript(data: Omit<BriefData, "scriptOral" | "conseillers">): string {
    const segs: string[] = ["Bonjour l'équipe !"];

    if (data.totalHier === 0) {
        segs.push("Pas de ventes enregistrées hier.");
    } else {
        segs.push(`Bilan d'hier : ${data.totalHier} vente${data.totalHier > 1 ? "s" : ""} au total.`);
        if (data.topPerformers.length > 0) {
            const top = data.topPerformers[0];
            segs.push(`Bravo à ${top.prenom} — ${top.total} vente${top.total > 1 ? "s" : ""}, meilleure performance d'hier !`);
            if (data.topPerformers.length >= 2) {
                const s = data.topPerformers[1];
                segs.push(`Bravo aussi à ${s.prenom} avec ${s.total} vente${s.total > 1 ? "s" : ""}.`);
            }
        }
        const zero = data.enDifficulte.filter(c => c.total === 0);
        if (zero.length > 0) {
            const noms = zero.slice(0, 2).map(c => c.prenom).join(" et ");
            segs.push(`${noms} — on se fait un point rapide ce matin avant l'ouverture.`);
        } else if (data.enDifficulte.length > 0) {
            segs.push(`${data.enDifficulte[0].prenom}, on va voir ensemble comment accélérer.`);
        }
    }

    const prodFaible = [...data.produitsMois]
        .filter(p => p.objectif > 0)
        .sort((a, b) => a.taux - b.taux)[0];
    if (prodFaible && prodFaible.taux < 75) {
        segs.push(`Notre priorité du jour : ${prodFaible.emoji} ${prodFaible.label} — seulement ${prodFaible.taux}% de l'objectif mensuel atteint.`);
    }

    if (data.tauxMois >= 100) {
        segs.push(`Sur le mois, on a dépassé l'objectif — exceptionnel ! 🎉 Continuons sur cette lancée.`);
    } else {
        segs.push(`Sur le mois on est à ${data.tauxMois}% — il reste ${data.joursRestants} jour${data.joursRestants > 1 ? "s" : ""} ouvrés.`);
        if (data.rythmeNecessaire > 0) {
            segs.push(`Objectif collectif du jour : ${data.rythmeNecessaire} vente${data.rythmeNecessaire > 1 ? "s" : ""} pour tenir le rythme.`);
        }
    }

    segs.push("C'est parti pour une belle journée ! 🚀");
    return segs.join(" ");
}

/* ─── Composant principal ────────────────────────────────────────────────── */

export default function BriefPage() {
    const [data, setData]     = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState(false);

    useEffect(() => { charger(); }, []);

    async function charger() {
        setLoading(true);
        try {
            const now  = new Date();
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
            const yEnd   = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);

            const [resC, resV, moisData, resObj] = await Promise.all([
                supabase.from("conseillers").select("id, nom"),
                supabase.from("ventes")
                    .select("conseiller_id, quantite, source, produits(nom, code)")
                    .gte("created_at", yStart.toISOString())
                    .lte("created_at", yEnd.toISOString()),
                construireClassementPeriode("mois"),
                getObjectifsBoutique(),
            ]);

            const tousConseillers = resC.data ?? [];
            // Spiderhome = historisation, pas une vente commerciale → exclu du bilan d'hier
            const ventesHier = (resV.data ?? []).filter((v: any) => {
                if (v.source === "cerebro_check") return false;
                const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
                return code !== "spiderhome";
            });

            // Objectifs boutique par code produit
            const objMap: Record<string, number> = {};
            (resObj ?? []).forEach((r: any) => {
                const code = r.produits?.code;
                if (code) objMap[code] = r.objectif ?? 0;
            });

            // Hier par conseiller
            const conseMap: Record<string, ConseillerHier> = {};
            tousConseillers.forEach((c: any) => {
                conseMap[c.id] = { id: c.id, nom: c.nom, prenom: c.nom.split(" ")[0], total: 0, produits: {} };
            });
            ventesHier.forEach((v: any) => {
                const row = conseMap[v.conseiller_id];
                if (!row) return;
                const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code ?? "";
                const qty  = v.quantite ?? 1;
                row.total += qty;
                row.produits[code] = (row.produits[code] ?? 0) + qty;
            });

            const parConseiller = Object.values(conseMap).sort((a, b) => b.total - a.total);
            const totalHier     = parConseiller.reduce((t, c) => t + c.total, 0);
            const topPerformers = parConseiller.filter(c => c.total > 0).slice(0, 3);
            const avgHier       = parConseiller.length > 0 ? totalHier / parConseiller.length : 0;
            const enDifficulte  = parConseiller
                .filter(c => c.total < Math.max(avgHier * 0.6, 1) || c.total === 0)
                .sort((a, b) => a.total - b.total)
                .slice(0, 3);

            // Hier par produit
            const prodHierMap: Record<string, number> = {};
            ventesHier.forEach((v: any) => {
                const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code ?? "";
                prodHierMap[code] = (prodHierMap[code] ?? 0) + (v.quantite ?? 1);
            });
            const parProduitHier: ProduitHier[] = PRODUITS_CLASSEMENT.map(p => ({
                code: p.code, label: p.label, emoji: p.emoji, total: prodHierMap[p.code] ?? 0,
            }));

            // Mensuel par produit (boutique)
            const totalMoisMap: Record<string, number> = {};
            moisData.forEach(c => {
                PRODUITS_CLASSEMENT.forEach(p => {
                    totalMoisMap[p.code] = (totalMoisMap[p.code] ?? 0) + (c.produits[p.key] ?? 0);
                });
            });

            const joursRestants = workingDaysRemaining();
            const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
            const yestD         = new Date(now); yestD.setDate(yestD.getDate() - 1);
            const joursEcoules  = Math.max(workingDaysInRange(monthStart, yestD), 1);

            const totalMois     = moisData.reduce((t, c) => t + c.total, 0);
            const totalObjectif = PRODUITS_CLASSEMENT.reduce((t, p) => t + (objMap[p.code] ?? 0), 0);
            const tauxMois      = totalObjectif > 0 ? Math.min(Math.round((totalMois / totalObjectif) * 100), 100) : 0;
            const rythmeActuel  = totalMois / joursEcoules;
            const rythmeNecessaire = joursRestants > 0 ? Math.ceil(Math.max(totalObjectif - totalMois, 0) / joursRestants) : 0;

            const produitsMois: ProduitMois[] = PRODUITS_CLASSEMENT.map(p => {
                const ventes   = totalMoisMap[p.code] ?? 0;
                const objectif = objMap[p.code] ?? 0;
                const taux     = objectif > 0 ? Math.min(Math.round((ventes / objectif) * 100), 100) : ventes > 0 ? 100 : 0;
                const dailyTarget = joursRestants > 0 ? Math.ceil(Math.max(objectif - ventes, 0) / joursRestants) : 0;
                return { code: p.code, label: p.label, emoji: p.emoji, ventes, objectif, taux, dailyTarget };
            });

            // Classement vendeur (mois en cours)
            const classementVendeur: ClassementLigne[] = moisData
                .map(c => ({ id: c.id, nom: c.nom, prenom: c.nom.split(" ")[0], total: c.total }))
                .sort((a, b) => b.total - a.total);

            // Avancée semaine / mois (même logique que "Objectifs boutique")
            const ids = tousConseillers.map((c: any) => c.id);
            const { debut, fin } = periodeSemaineEffective();
            const [semaineData, figes, badgesHierRaw, streaksRaw, photos] = await Promise.all([
                construireClassementPeriode("semaine"),
                ids.length > 0 ? getObjectifsSemaineFiges(ids, debut, fin).catch(() => ({})) : Promise.resolve({}),
                getBadgesDebloquesLe(jourStr(yest)),
                Promise.all(ids.map((id: string) => calculerStreak(id).catch(() => null))),
                ids.length > 0 ? getPhotosByIds(ids).catch(() => ({})) : Promise.resolve({}),
            ]);

            const objSemaineMap: Record<string, number> = {};
            PRODUITS_CLASSEMENT.forEach(p => {
                objSemaineMap[p.code] = ids.reduce((t: number, id: string) => t + ((figes as any)[id]?.[p.code] ?? 0), 0);
            });
            const semaineAvancee: AvanceeProduit[] = PRODUITS_CLASSEMENT.map(p => ({
                code: p.code, label: p.label, emoji: p.emoji,
                realise: semaineData.reduce((t, c) => t + (c.produits[p.key] ?? 0), 0),
                objectif: objSemaineMap[p.code] ?? 0,
            }));
            const moisAvancee: AvanceeProduit[] = PRODUITS_CLASSEMENT.map(p => ({
                code: p.code, label: p.label, emoji: p.emoji,
                realise: totalMoisMap[p.code] ?? 0,
                objectif: objMap[p.code] ?? 0,
            }));

            const streaks: StreakLigne[] = tousConseillers
                .map((c: any, i: number) => {
                    const s = streaksRaw[i];
                    return { id: c.id, nom: c.nom, prenom: c.nom.split(" ")[0], streak: s?.streakActuel ?? 0, risque: s?.risqueAujourdhui ?? false };
                })
                .sort((a: StreakLigne, b: StreakLigne) => b.streak - a.streak);

            const partial = {
                dateHierLabel: dateLabel(yest), totalHier, topPerformers, enDifficulte,
                parProduitHier, produitsMois, totalMois, totalObjectif, tauxMois,
                joursRestants, rythmeNecessaire, rythmeActuel,
                classementVendeur, streaks, badgesHier: badgesHierRaw, semaineAvancee, moisAvancee, photos,
            };

            setData({
                ...partial,
                scriptOral: genererScript(partial),
                conseillers: tousConseillers.map((c: any) => ({ id: c.id, prenom: c.nom.split(" ")[0] })),
            });
        } catch {
            setErreur(true);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    if (erreur || !data) {
        return (
            <main>
                <h1 className="text-4xl font-black text-slate-900">Brief du matin</h1>
                <p className="mt-4 text-red-500">Impossible de charger les données. Réessayez.</p>
            </main>
        );
    }

    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const tauxColor = data.tauxMois >= 100 ? "text-emerald-300" : data.tauxMois >= 70 ? "text-amber-300" : "text-red-400";

    return (
        <main className="space-y-8">

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-9 shadow-[0_20px_60px_rgba(15,23,42,.30)]">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-fuchsia-600/8 blur-3xl" />
                <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-400">KPILOTE Manager</p>
                    <h1 className="mt-2 text-4xl font-black text-white">Brief du matin</h1>
                    <p className="mt-1 text-sm font-medium capitalize text-white/40">{today}</p>

                    <div className="mt-7 grid grid-cols-3 gap-4">
                        <div className="rounded-2xl bg-white/6 px-5 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Ventes hier</p>
                            <p className="mt-1 text-4xl font-black text-white">{data.totalHier}</p>
                            <p className="text-xs text-white/30 capitalize">{data.dateHierLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-white/6 px-5 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Mois en cours</p>
                            <p className={`mt-1 text-4xl font-black ${tauxColor}`}>{data.tauxMois}%</p>
                            <p className="text-xs text-white/30">{data.totalMois} / {data.totalObjectif} obj.</p>
                        </div>
                        <div className="rounded-2xl bg-white/6 px-5 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Rythme du jour</p>
                            <p className="mt-1 text-4xl font-black text-white">{data.rythmeNecessaire}</p>
                            <p className="text-xs text-white/30">ventes nécessaires · J-{data.joursRestants}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Script oral ──────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-8 shadow-[0_12px_48px_rgba(109,40,217,.30)]">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/8 blur-2xl" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl backdrop-blur">💬</span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200">Script à lire à l'équipe</p>
                            <p className="text-[11px] text-white/40">Copiez et lisez ce texte à voix haute lors de votre brief matinal</p>
                        </div>
                    </div>
                    <blockquote className="rounded-2xl bg-white/10 px-7 py-6 text-base leading-8 text-white backdrop-blur">
                        <span className="text-white/40 text-2xl leading-none mr-1">"</span>
                        {data.scriptOral}
                        <span className="text-white/40 text-2xl leading-none ml-1">"</span>
                    </blockquote>
                </div>
            </div>

            {/* ── Bilan d'hier ─────────────────────────────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-2">

                {/* Top performers */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-500 mb-5">🏆 Top vendeurs — {data.dateHierLabel}</p>
                    {data.topPerformers.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                            <span className="text-4xl">📭</span>
                            <p className="mt-3 font-black text-slate-400">Aucune vente enregistrée hier</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.topPerformers.map((c, i) => {
                                const medals = ["🥇", "🥈", "🥉"];
                                const maxTotal = data.topPerformers[0].total;
                                const pct = maxTotal > 0 ? Math.round((c.total / maxTotal) * 100) : 0;
                                return (
                                    <div key={c.id} className={`flex items-center gap-4 rounded-2xl p-4 ${i === 0 ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}>
                                        <span className="text-xl w-7 flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="font-black text-slate-900 text-sm">{c.prenom}</p>
                                                <p className="text-lg font-black text-slate-800">{c.total} <span className="text-xs font-normal text-slate-400">vente{c.total > 1 ? "s" : ""}</span></p>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${i === 0 ? "bg-amber-400" : "bg-slate-400"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* En difficulté + produits hier */}
                <div className="space-y-5">

                    {/* En difficulté */}
                    {data.enDifficulte.length > 0 && (
                        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500 mb-4">🆘 En difficulté hier</p>
                            <div className="space-y-2.5">
                                {data.enDifficulte.map(c => (
                                    <div key={c.id} className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                                        <p className="font-black text-red-800 text-sm">{c.prenom}</p>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${c.total === 0 ? "bg-red-200 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                            {c.total === 0 ? "Aucune vente" : `${c.total} vente${c.total > 1 ? "s" : ""}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Produits hier */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-4">Produits — {data.dateHierLabel}</p>
                        <div className="space-y-3">
                            {data.parProduitHier.map(p => {
                                const max = Math.max(...data.parProduitHier.map(x => x.total), 1);
                                const pct = Math.round((p.total / max) * 100);
                                return (
                                    <div key={p.code}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold text-slate-700">{p.emoji} {p.label}</span>
                                            <span className="text-sm font-black text-slate-800">{p.total}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${p.total === 0 ? "bg-slate-200" : pct >= 80 ? "bg-violet-500" : pct >= 50 ? "bg-violet-400" : "bg-violet-300"}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Classement vendeur & Séries en cours ──────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-2">

                {/* Classement vendeur */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-500 mb-5">🏆 Classement vendeur — mois en cours</p>
                    {data.classementVendeur.length === 0 ? (
                        <p className="text-sm text-slate-400">Aucune donnée pour le moment.</p>
                    ) : (
                        <div className="space-y-2">
                            {data.classementVendeur.slice(0, 8).map((c, i) => {
                                const medals = ["🥇", "🥈", "🥉"];
                                return (
                                    <div key={c.id} className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${i === 0 ? "bg-violet-50" : "bg-slate-50"}`}>
                                        <span className="w-6 flex-shrink-0 text-center text-sm">{medals[i] ?? i + 1}</span>
                                        <PhotoAvatar nom={c.nom} photoUrl={data.photos[c.id]} size={30} />
                                        <span className="flex-1 truncate font-black text-sm text-slate-800">{c.prenom}</span>
                                        <span className="text-sm font-black text-slate-700">{c.total}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Séries en cours */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500 mb-5">🔥 Séries en cours</p>
                    {data.streaks.every(s => s.streak === 0) ? (
                        <p className="text-sm text-slate-400">Personne n'a de série en cours.</p>
                    ) : (
                        <div className="space-y-2">
                            {data.streaks.filter(s => s.streak > 0).slice(0, 8).map(s => (
                                <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2.5">
                                    <PhotoAvatar nom={s.nom} photoUrl={data.photos[s.id]} size={30} />
                                    <span className="flex-1 truncate font-black text-sm text-slate-800">{s.prenom}</span>
                                    {s.risque && <span className="text-xs font-bold text-amber-500">⚠️ en jeu</span>}
                                    <span className="text-sm font-black text-orange-600">🔥 {s.streak}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Badges débloqués hier ──────────────────────────────────────── */}
            {data.badgesHier.length > 0 && (
                <div className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-7">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600 mb-4">🏅 Trophées débloqués hier</p>
                    <div className="flex flex-wrap gap-3">
                        {data.badgesHier.map((b, i) => {
                            const info = BADGE_INFO[b.badgeCode] ?? { label: b.badgeCode, emoji: "🏅" };
                            return (
                                <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-2.5 shadow-sm">
                                    <PhotoAvatar nom={b.nom} photoUrl={data.photos[b.conseillerId]} size={28} />
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{b.nom.split(" ")[0]}</p>
                                        <p className="text-[10px] text-slate-400">{info.emoji} {info.label}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Avancée semaine & mois ─────────────────────────────────────── */}
            <div className="space-y-6">
                <AvanceeSection titre="Avancée de la semaine" badge="Semaine en cours" produits={data.semaineAvancee} />
                <AvanceeSection titre="Avancée du mois" badge="Mois en cours" produits={data.moisAvancee} />
            </div>

            {/* ── Lancer un défi ───────────────────────────────────────────── */}
            {data.conseillers.length >= 2 && (
                <LancerDefiCard conseillers={data.conseillers} />
            )}

        </main>
    );
}
