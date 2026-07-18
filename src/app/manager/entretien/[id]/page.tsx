"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getObjectifsMensuels } from "@/services/objectifs";
import { chargerClassementDefisEtChallenges } from "@/services/defisService";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { exporterBilanPDF, getMoisLabel, type BilanExport, type Tendance } from "@/utils/exportBilanPDF";

// ── Helpers date ──────────────────────────────────────────────────────────────

function debutMois() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function finMois() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProduitBilan = {
    code: string;
    label: string;
    emoji: string;
    ventes: number;
    objectif: number;
    taux: number;
};

type Semaine = { label: string; ventes: number };

type Bilan = {
    nom: string;
    avatarUrl: string | null;
    produits: ProduitBilan[];
    totalVentes: number;
    totalObjectif: number;
    tauxGlobal: number;
    meilleurProduit: string | null;
    produitEnRetard: string | null;
    defis: { gagne: number; perdu: number; egalite: number };
    challenges: { reussi: number; echoue: number; enCours: number };
    classement: { rang: number; total: number };
    semaines: Semaine[];
    tendance: Tendance;
};

// ── Couleurs par taux ─────────────────────────────────────────────────────────

function couleurTaux(taux: number) {
    if (taux >= 100) return { text: "text-emerald-600", bg: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Objectif atteint ✓" };
    if (taux >= 70)  return { text: "text-amber-600",   bg: "bg-amber-500",   badge: "bg-amber-100 text-amber-700",   label: "En bonne voie" };
    return                 { text: "text-red-500",       bg: "bg-red-500",     badge: "bg-red-100 text-red-700",       label: "À renforcer" };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BilanConseiller() {
    const { id } = useParams<{ id: string }>();
    const router  = useRouter();
    const [bilan,   setBilan]   = useState<Bilan | null>(null);
    const [loading, setLoading] = useState(true);
    const [erreur,  setErreur]  = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const debut = debutMois();
                const fin   = finMois();

                const [conseillerRes, objectifsData, ventesRes, classementData] = await Promise.all([
                    supabase.from("conseillers").select("id, nom, avatar").eq("id", id).single(),
                    getObjectifsMensuels(id),
                    supabase.from("ventes")
                        .select("produit_id, quantite, created_at, source, produits(code)")
                        .eq("conseiller_id", id)
                        .gte("created_at", debut)
                        .lte("created_at", fin),
                    chargerClassementDefisEtChallenges(),
                ]);

                if (conseillerRes.error || !conseillerRes.data) { setErreur(true); return; }
                const conseiller = conseillerRes.data;

                // ── Objectifs par code ──
                const objectifByCode: Record<string, number> = {};
                (objectifsData ?? []).forEach((o: any) => {
                    const code = o.produits?.code;
                    if (code) objectifByCode[code] = o.objectif ?? 0;
                });

                // ── Ventes par code + par semaine ──
                const ventesByCode: Record<string, number> = {};
                const semaines: Semaine[] = [
                    { label: "Sem 1", ventes: 0 },
                    { label: "Sem 2", ventes: 0 },
                    { label: "Sem 3", ventes: 0 },
                    { label: "Sem 4", ventes: 0 },
                ];

                (ventesRes.data ?? []).forEach((v: any) => {
                    const code = Array.isArray(v.produits) ? v.produits[0]?.code : v.produits?.code;
                    const qty  = v.quantite ?? 1;
                    if (code) ventesByCode[code] = (ventesByCode[code] ?? 0) + qty;
                    // Spiderhome = historisation → exclu du momentum et des actes commerciaux
                    if (code === "spiderhome") return;
                    // Exclure cerebro_check du momentum : backdatés au 1er, fausseraient la tendance
                    if (v.source !== "cerebro_check") {
                        const day = new Date(v.created_at).getDate();
                        const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
                        semaines[idx].ventes += qty;
                    }
                });

                // ── Produits ──
                const produits: ProduitBilan[] = PRODUITS_ORDRE
                    .filter(p => objectifByCode[p.code] !== undefined)
                    .map(p => {
                        const ventes  = ventesByCode[p.code] ?? 0;
                        const objectif = objectifByCode[p.code] ?? 0;
                        const taux    = objectif > 0 ? Math.round((ventes / objectif) * 100) : 0;
                        return { code: p.code, label: p.label, emoji: p.emoji, ventes, objectif, taux };
                    });

                // Spiderhome = historisation → exclu des totaux commerciaux
                const produitsCommerciaux = produits.filter(p => p.code !== "spiderhome");
                const totalVentes  = produitsCommerciaux.reduce((s, p) => s + p.ventes, 0);
                const totalObjectif = produitsCommerciaux.reduce((s, p) => s + p.objectif, 0);
                const tauxGlobal   = totalObjectif > 0 ? Math.round((totalVentes / totalObjectif) * 100) : 0;

                const sortedByTaux = [...produits].sort((a, b) => b.taux - a.taux);
                const meilleurProduit = sortedByTaux[0]?.taux > 0 ? sortedByTaux[0].label : null;
                const produitEnRetard = sortedByTaux[sortedByTaux.length - 1]?.taux < 100
                    ? sortedByTaux[sortedByTaux.length - 1].label : null;

                // ── Momentum ──
                const firstHalf  = semaines[0].ventes + semaines[1].ventes;
                const secondHalf = semaines[2].ventes + semaines[3].ventes;
                const tendance: Tendance = secondHalf > firstHalf * 1.25
                    ? "acceleration"
                    : firstHalf > secondHalf * 1.25
                    ? "ralentissement"
                    : "regulier";

                // ── Classement ──
                const rang  = classementData.findIndex(c => c.id === id) + 1;
                const total = classementData.length;
                const statsConseiller = classementData.find(c => c.id === id);

                setBilan({
                    nom:        conseiller.nom,
                    avatarUrl:  conseiller.avatar ?? null,
                    produits,
                    totalVentes,
                    totalObjectif,
                    tauxGlobal,
                    meilleurProduit,
                    produitEnRetard,
                    defis:      statsConseiller?.defis     ?? { gagne: 0, perdu: 0, egalite: 0 },
                    challenges: statsConseiller?.challenges ?? { reussi: 0, echoue: 0, enCours: 0 },
                    classement: { rang: rang > 0 ? rang : total, total },
                    semaines,
                    tendance,
                });
            } catch {
                setErreur(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
    );

    if (erreur || !bilan) return (
        <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
            Conseiller introuvable.
        </div>
    );

    const moisLabel = getMoisLabel();

    function handleExport() {
        const bilanExport: BilanExport = {
            nom: bilan!.nom,
            avatarUrl: bilan!.avatarUrl,
            moisLabel,
            produits: bilan!.produits.map(p => ({
                label:    p.label,
                emoji:    p.emoji,
                ventes:   p.ventes,
                objectif: p.objectif,
                taux:     p.taux,
            })),
            totalVentes:    bilan!.totalVentes,
            totalObjectif:  bilan!.totalObjectif,
            tauxGlobal:     bilan!.tauxGlobal,
            meilleurProduit: bilan!.meilleurProduit,
            produitEnRetard: bilan!.produitEnRetard,
            defis:      bilan!.defis,
            challenges: bilan!.challenges,
            classement: bilan!.classement,
            semaines:   bilan!.semaines,
            tendance:   bilan!.tendance,
        };
        exporterBilanPDF(bilanExport);
    }

    const tauxCouleur = couleurTaux(bilan.tauxGlobal);
    const momentumEmoji   = bilan.tendance === "acceleration" ? "📈" : bilan.tendance === "ralentissement" ? "📉" : "➡️";
    const momentumLabel   = bilan.tendance === "acceleration" ? "Accélération" : bilan.tendance === "ralentissement" ? "Ralentissement" : "Rythme régulier";
    const momentumCouleur = bilan.tendance === "acceleration" ? "text-emerald-600 bg-emerald-50" : bilan.tendance === "ralentissement" ? "text-red-600 bg-red-50" : "text-violet-600 bg-violet-50";
    const semainesMax = Math.max(...bilan.semaines.map(s => s.ventes), 1);

    return (
        <main>
            {/* ── Breadcrumb ── */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Entretiens
            </button>

            {/* ── Header conseiller ── */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                    {bilan.avatarUrl ? (
                        <img src={bilan.avatarUrl} alt={bilan.nom} className="h-20 w-20 rounded-full object-cover ring-4 ring-slate-100" />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-3xl font-black text-violet-600 ring-4 ring-slate-100">
                            {bilan.nom.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-500">Bilan mensuel</p>
                        <h1 className="text-4xl font-black text-slate-900">{bilan.nom}</h1>
                        <p className="text-sm text-slate-400">{moisLabel}</p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="group flex items-center gap-2.5 self-start rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-3 text-sm font-black text-violet-700 shadow-sm transition-all hover:border-violet-400 hover:shadow-md active:scale-[0.97] sm:self-auto"
                >
                    <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <polyline points="9 15 12 18 15 15"/>
                    </svg>
                    Exporter PDF
                </button>
            </div>

            {/* ── KPIs globaux ── */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Réalisation</p>
                    <p className={`mt-2 text-4xl font-black ${tauxCouleur.text}`}>{bilan.tauxGlobal}%</p>
                    <p className="mt-1 text-xs text-slate-400">{bilan.totalVentes} / {bilan.totalObjectif} ventes</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Classement</p>
                    <p className="mt-2 text-4xl font-black text-slate-800">{bilan.classement.rang}<span className="text-lg text-slate-400">/{bilan.classement.total}</span></p>
                    <p className="mt-1 text-xs text-slate-400">{bilan.classement.rang === 1 ? "🏆 Leader équipe" : `Position dans l'équipe`}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Défis</p>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-emerald-600">{bilan.defis.gagne}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-2xl font-black text-amber-500">{bilan.defis.egalite}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-2xl font-black text-red-400">{bilan.defis.perdu}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Gagné · Égalité · Perdu</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Momentum</p>
                    <p className="mt-2 text-3xl">{momentumEmoji}</p>
                    <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${momentumCouleur}`}>{momentumLabel}</p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* ── Performance produits ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="mb-5 text-xs font-black uppercase tracking-[0.3em] text-violet-500">Performance par produit</p>
                    <div className="space-y-5">
                        {bilan.produits.map(p => {
                            const c = couleurTaux(p.taux);
                            return (
                                <div key={p.code}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{p.emoji}</span>
                                            <span className="text-sm font-bold text-slate-700">{p.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${c.badge}`}>{c.label}</span>
                                            <span className={`text-sm font-black tabular-nums ${c.text}`}>{p.taux}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div className={`h-full rounded-full transition-all ${c.bg}`} style={{ width: `${Math.min(p.taux, 100)}%` }} />
                                        </div>
                                        <span className="w-20 text-right text-xs text-slate-400 tabular-nums">{p.ventes} / {p.objectif}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Colonne droite ── */}
                <div className="flex flex-col gap-5">

                    {/* Momentum */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-500">Momentum du mois</p>
                            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${momentumCouleur}`}>
                                {momentumEmoji} {momentumLabel}
                            </span>
                        </div>
                        <div className="flex items-end gap-3">
                            {bilan.semaines.map((s, i) => {
                                const h = semainesMax > 0 ? Math.max(Math.round((s.ventes / semainesMax) * 80), 4) : 4;
                                const estDerniere = i === bilan.semaines.length - 1;
                                const estPremiere = i === 0;
                                const highlight =
                                    (bilan.tendance === "acceleration" && estDerniere) ||
                                    (bilan.tendance === "ralentissement" && estPremiere);
                                return (
                                    <div key={s.label} className="flex flex-1 flex-col items-center gap-1.5">
                                        <span className="text-sm font-black text-slate-700">{s.ventes}</span>
                                        <div className="w-full rounded-t-lg bg-slate-100" style={{ height: 80 }}>
                                            <div
                                                className={`w-full rounded-t-lg transition-all ${highlight ? (bilan.tendance === "acceleration" ? "bg-emerald-500" : "bg-red-400") : "bg-violet-400"}`}
                                                style={{ height: h, marginTop: 80 - h }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{s.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Défis & Challenges */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-violet-500">Défis & Challenges</p>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="rounded-xl bg-emerald-50 p-3 text-center">
                                <p className="text-2xl font-black text-emerald-600">{bilan.defis.gagne}</p>
                                <p className="text-[10px] font-bold text-emerald-500">Gagné</p>
                            </div>
                            <div className="rounded-xl bg-amber-50 p-3 text-center">
                                <p className="text-2xl font-black text-amber-600">{bilan.defis.egalite}</p>
                                <p className="text-[10px] font-bold text-amber-500">Égalité</p>
                            </div>
                            <div className="rounded-xl bg-red-50 p-3 text-center">
                                <p className="text-2xl font-black text-red-500">{bilan.defis.perdu}</p>
                                <p className="text-[10px] font-bold text-red-400">Perdu</p>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-3 text-sm text-slate-500">
                            Challenges KPILOTE :{" "}
                            <span className="font-black text-emerald-600">{bilan.challenges.reussi} réussi{bilan.challenges.reussi > 1 ? "s" : ""}</span>
                            {" · "}
                            <span className="font-black text-red-500">{bilan.challenges.echoue} échoué{bilan.challenges.echoue > 1 ? "s" : ""}</span>
                            {bilan.challenges.enCours > 0 && <> · <span className="font-black text-violet-600">{bilan.challenges.enCours} en cours</span></>}
                        </div>
                    </div>

                    {/* Synthèse auto */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-violet-500">Synthèse automatique</p>
                        <div className="space-y-4">
                            <div>
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">Points forts</p>
                                <ul className="space-y-1.5">
                                    {bilan.meilleurProduit && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-emerald-500 font-black">✓</span>
                                            Meilleure performance sur {bilan.meilleurProduit}
                                        </li>
                                    )}
                                    {bilan.tauxGlobal >= 100 && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-emerald-500 font-black">✓</span>
                                            Objectif global mensuel atteint
                                        </li>
                                    )}
                                    {bilan.defis.gagne > 0 && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-emerald-500 font-black">✓</span>
                                            {bilan.defis.gagne} défi{bilan.defis.gagne > 1 ? "s" : ""} remporté{bilan.defis.gagne > 1 ? "s" : ""}
                                        </li>
                                    )}
                                    {bilan.tendance === "acceleration" && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-emerald-500 font-black">✓</span>
                                            Accélération notable en fin de mois
                                        </li>
                                    )}
                                    {bilan.tauxGlobal < 100 && !bilan.defis.gagne && bilan.tendance !== "acceleration" && (
                                        <li className="flex gap-2 text-sm text-slate-400 italic">
                                            <span className="mt-0.5 font-black">–</span>
                                            À identifier pendant l'entretien
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-violet-600">Axes de travail</p>
                                <ul className="space-y-1.5">
                                    {bilan.produitEnRetard && bilan.produitEnRetard !== bilan.meilleurProduit && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-violet-500 font-black">→</span>
                                            Renforcer les ventes {bilan.produitEnRetard}
                                        </li>
                                    )}
                                    {bilan.tauxGlobal < 70 && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-violet-500 font-black">→</span>
                                            Volume global en retard — analyser les freins
                                        </li>
                                    )}
                                    {bilan.tendance === "ralentissement" && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-violet-500 font-black">→</span>
                                            Tendance à la baisse — maintenir le rythme
                                        </li>
                                    )}
                                    {bilan.defis.perdu > bilan.defis.gagne && bilan.defis.perdu > 0 && (
                                        <li className="flex gap-2 text-sm text-slate-600">
                                            <span className="mt-0.5 text-violet-500 font-black">→</span>
                                            Ratio défis défavorable — travailler la régularité
                                        </li>
                                    )}
                                    {bilan.tauxGlobal >= 70 && !bilan.produitEnRetard && bilan.tendance !== "ralentissement" && (
                                        <li className="flex gap-2 text-sm text-slate-400 italic">
                                            <span className="mt-0.5 font-black">–</span>
                                            Maintenir le niveau et viser la régularité
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
