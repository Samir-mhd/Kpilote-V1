"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { construireClassementPeriode } from "@/services/classementService";
import { getObjectifsBoutique } from "@/services/objectifs";
import LancerDefiCard from "@/components/manager/LancerDefiCard";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ConseillerHier = {
    id: string; nom: string; prenom: string;
    total: number; produits: Record<string, number>;
};
type ProduitHier  = { code: string; label: string; emoji: string; total: number };
type ProduitMois  = { code: string; label: string; emoji: string; ventes: number; objectif: number; taux: number; dailyTarget: number };
type Proposition  = { type: "feliciter" | "encourager" | "focus" | "alerte" | "defi"; emoji: string; titre: string; detail: string };

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
    propositions: Proposition[];
    conseillers: { id: string; prenom: string }[];
};

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

function genererScript(data: Omit<BriefData, "scriptOral" | "propositions" | "conseillers">): string {
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

/* ─── Génération propositions ────────────────────────────────────────────── */

function genererPropositions(data: Omit<BriefData, "scriptOral" | "propositions" | "conseillers">): Proposition[] {
    const props: Proposition[] = [];

    if (data.topPerformers.length > 0) {
        const top = data.topPerformers[0];
        props.push({
            type: "feliciter", emoji: "🏆",
            titre: `Féliciter ${top.prenom} devant l'équipe`,
            detail: `${top.prenom} a réalisé ${top.total} vente${top.total > 1 ? "s" : ""} hier — la meilleure performance. Invitez-le·la à partager sa technique : un pitch, un argument, une approche qui a fonctionné.`,
        });
    }

    const zero = data.enDifficulte.filter(c => c.total === 0);
    if (zero.length > 0) {
        const noms = zero.slice(0, 2).map(c => c.prenom).join(", ");
        const plural = zero.length > 1;
        props.push({
            type: "encourager", emoji: "💬",
            titre: `Check-in 5 min avec ${noms}`,
            detail: `${plural ? "Ces conseillers n'ont" : `${noms} n'a`} enregistré aucune vente hier. Avant l'ouverture : identifier les freins (objections clients ? difficulté produit ?), proposer un accompagnement et fixer un mini-objectif pour la matinée.`,
        });
    } else if (data.enDifficulte.length > 0) {
        const pen = data.enDifficulte[0];
        props.push({
            type: "encourager", emoji: "💬",
            titre: `Mobiliser ${pen.prenom}`,
            detail: `${pen.prenom} a fait ${pen.total} vente${pen.total > 1 ? "s" : ""} hier — en dessous du rythme. Un mot d'encouragement personnalisé et un objectif concret pour la journée peuvent changer la dynamique.`,
        });
    }

    const prodFaible = [...data.produitsMois]
        .filter(p => p.objectif > 0)
        .sort((a, b) => a.taux - b.taux)[0];
    if (prodFaible && prodFaible.taux < 75) {
        props.push({
            type: "focus", emoji: "🎯",
            titre: `Sprint ${prodFaible.emoji} ${prodFaible.label} — 1 vente par conseiller avant 14h`,
            detail: `${prodFaible.label} est à ${prodFaible.taux}% de l'objectif mensuel — le plus en retard. Annoncer un mini-challenge collectif : chaque conseiller vise 1 vente ${prodFaible.label} avant 14h. Cible journalière boutique : ${prodFaible.dailyTarget}.`,
        });
    }

    if (data.tauxMois < 60 && data.joursRestants <= 12) {
        props.push({
            type: "alerte", emoji: "🚨",
            titre: `Sprint final — ${data.rythmeNecessaire} ventes/jour nécessaires`,
            detail: `Avec ${data.joursRestants} jours ouvrés restants et ${data.tauxMois}% de l'objectif atteint, la situation est tendue. Communiquer clairement la cible collective : ${data.rythmeNecessaire} ventes par jour. Afficher le compteur en temps réel sur KPILOTE.`,
        });
    } else if (data.rythmeNecessaire > 0 && data.rythmeActuel > 0 && data.rythmeNecessaire > data.rythmeActuel * 1.15) {
        props.push({
            type: "alerte", emoji: "📈",
            titre: `Accélérer — cible ${data.rythmeNecessaire} ventes/jour`,
            detail: `Rythme actuel : ${Math.round(data.rythmeActuel * 10) / 10} ventes/jour. Rythme nécessaire : ${data.rythmeNecessaire}. Partager cet écart à l'équipe pour créer la prise de conscience et l'élan collectif.`,
        });
    }

    if (data.topPerformers.length >= 2) {
        const [c1, c2] = data.topPerformers;
        const prod = prodFaible?.label ?? "Forfaits";
        const prodEmoji = prodFaible?.emoji ?? "📱";
        props.push({
            type: "defi", emoji: "⚔️",
            titre: `Défi ${prodEmoji} ${prod} : ${c1.prenom} vs ${c2.prenom}`,
            detail: `Les deux meilleurs vendeurs d'hier s'affrontent sur le produit prioritaire. Un défi visible stimule toute l'équipe — utilisez le bouton ci-dessous pour le lancer en 30 secondes.`,
        });
    }

    return props.slice(0, 5);
}

/* ─── Couleurs ───────────────────────────────────────────────────────────── */

const PROP_STYLE: Record<Proposition["type"], { bg: string; border: string; label: string; labelColor: string; numBg: string }> = {
    feliciter: { bg: "bg-amber-50",   border: "border-amber-200",  label: "Reconnaissance",  labelColor: "text-amber-600",  numBg: "bg-amber-500"   },
    encourager:{ bg: "bg-blue-50",    border: "border-blue-200",   label: "Coaching",        labelColor: "text-blue-600",   numBg: "bg-blue-500"    },
    focus:     { bg: "bg-violet-50",  border: "border-violet-200", label: "Focus produit",   labelColor: "text-violet-600", numBg: "bg-violet-500"  },
    alerte:    { bg: "bg-red-50",     border: "border-red-200",    label: "Urgence",         labelColor: "text-red-600",    numBg: "bg-red-500"     },
    defi:      { bg: "bg-slate-900",  border: "border-slate-700",  label: "Challenge",       labelColor: "text-violet-400", numBg: "bg-violet-600"  },
};

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
            const ventesHier = (resV.data ?? []).filter((v: any) => v.source !== "cerebro_check");

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
            const parProduitHier: ProduitHier[] = PRODUITS_ORDRE.map(p => ({
                code: p.code, label: p.label, emoji: p.emoji, total: prodHierMap[p.code] ?? 0,
            }));

            // Mensuel par produit (boutique)
            const totalMoisMap: Record<string, number> = {};
            moisData.forEach(c => {
                PRODUITS_ORDRE.forEach(p => {
                    totalMoisMap[p.code] = (totalMoisMap[p.code] ?? 0) + (c.produits[p.key] ?? 0);
                });
            });

            const joursRestants = workingDaysRemaining();
            const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
            const yestD         = new Date(now); yestD.setDate(yestD.getDate() - 1);
            const joursEcoules  = Math.max(workingDaysInRange(monthStart, yestD), 1);

            const totalMois     = moisData.reduce((t, c) => t + c.total, 0);
            const totalObjectif = PRODUITS_ORDRE.reduce((t, p) => t + (objMap[p.code] ?? 0), 0);
            const tauxMois      = totalObjectif > 0 ? Math.min(Math.round((totalMois / totalObjectif) * 100), 100) : 0;
            const rythmeActuel  = totalMois / joursEcoules;
            const rythmeNecessaire = joursRestants > 0 ? Math.ceil(Math.max(totalObjectif - totalMois, 0) / joursRestants) : 0;

            const produitsMois: ProduitMois[] = PRODUITS_ORDRE.map(p => {
                const ventes   = totalMoisMap[p.code] ?? 0;
                const objectif = objMap[p.code] ?? 0;
                const taux     = objectif > 0 ? Math.min(Math.round((ventes / objectif) * 100), 100) : ventes > 0 ? 100 : 0;
                const dailyTarget = joursRestants > 0 ? Math.ceil(Math.max(objectif - ventes, 0) / joursRestants) : 0;
                return { code: p.code, label: p.label, emoji: p.emoji, ventes, objectif, taux, dailyTarget };
            });

            const partial = {
                dateHierLabel: dateLabel(yest), totalHier, topPerformers, enDifficulte,
                parProduitHier, produitsMois, totalMois, totalObjectif, tauxMois,
                joursRestants, rythmeNecessaire, rythmeActuel,
            };

            setData({
                ...partial,
                scriptOral: genererScript(partial),
                propositions: genererPropositions(partial),
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

            {/* ── Situation du mois ─────────────────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Situation du mois</p>
                        <p className="mt-1 text-2xl font-black text-slate-900">{data.totalMois} / {data.totalObjectif} <span className="text-base font-normal text-slate-400">objectif global</span></p>
                    </div>
                    <div className="text-right">
                        <p className={`text-4xl font-black ${data.tauxMois >= 100 ? "text-emerald-500" : data.tauxMois >= 70 ? "text-amber-500" : "text-red-500"}`}>{data.tauxMois}%</p>
                        <p className="text-xs text-slate-400">J-{data.joursRestants} · rythme {data.rythmeNecessaire}/jour</p>
                    </div>
                </div>

                {/* Barre globale */}
                <div className="mb-6 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${data.tauxMois >= 100 ? "bg-emerald-500" : data.tauxMois >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${data.tauxMois}%` }}
                    />
                </div>

                {/* Par produit */}
                <div className="space-y-4">
                    {data.produitsMois.map(p => {
                        const barColor = p.taux >= 100 ? "bg-emerald-500" : p.taux >= 70 ? "bg-amber-400" : "bg-red-400";
                        const textColor = p.taux >= 100 ? "text-emerald-600" : p.taux >= 70 ? "text-amber-600" : "text-red-500";
                        return (
                            <div key={p.code}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-bold text-slate-700">{p.emoji} {p.label}</span>
                                    <div className="flex items-center gap-3">
                                        {p.dailyTarget > 0 && (
                                            <span className="text-[10px] font-bold text-slate-400">cible/jour : {p.dailyTarget}</span>
                                        )}
                                        <span className="text-sm font-black text-slate-700">{p.ventes}<span className="font-normal text-slate-400">/{p.objectif}</span></span>
                                        <span className={`w-10 text-right text-xs font-black ${textColor}`}>{p.taux}%</span>
                                    </div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                        style={{ width: `${p.taux}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Propositions d'action ─────────────────────────────────────── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400">⚡ Propositions d'action pour aujourd'hui</p>
                <div className="space-y-3">
                    {data.propositions.map((prop, i) => {
                        const style = PROP_STYLE[prop.type];
                        const isDefi = prop.type === "defi";
                        return (
                            <div key={i} className={`flex items-start gap-5 rounded-[20px] border p-5 ${style.bg} ${style.border}`}>
                                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${style.numBg}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-base">{prop.emoji}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDefi ? style.labelColor : style.labelColor}`}>
                                            {style.label}
                                        </span>
                                    </div>
                                    <p className={`font-black text-sm ${isDefi ? "text-white" : "text-slate-900"}`}>{prop.titre}</p>
                                    <p className={`mt-1 text-xs leading-relaxed ${isDefi ? "text-white/60" : "text-slate-500"}`}>{prop.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Lancer un défi ───────────────────────────────────────────── */}
            {data.conseillers.length >= 2 && (
                <LancerDefiCard conseillers={data.conseillers} />
            )}

        </main>
    );
}
