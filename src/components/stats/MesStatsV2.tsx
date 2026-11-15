"use client";

import { useEffect, useMemo, useState } from "react";
import { getVentesConseillerDepuis, getPlanningPlage, getCombosParJour, estJourTravaille, VenteStat } from "@/services/statsConseillerService";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getRealiseVentesComboParConseiller, getObjectifsComboParConseiller, RealiseVentesCombo } from "@/services/variableConseiller";
import { getJoursTravailPlageTous, StatutJour } from "@/services/planningService";
import { PRODUITS_HORS_ACTES, ProduitCode } from "@/utils/produits";
import { getStatsTransactionsMois, StatsTransactionsMois } from "@/services/ventesTransactions";
import ArticlesParVenteCard from "@/components/dashboard/ArticlesParVenteCard";

/**
 * "Mes stats" (variante &stats=v2) : heatmap en moyenne par jour travaillé (filtrable par produit),
 * ce mois vs le mois dernier à la même date, moi vs l'équipe (par jour travaillé), records,
 * évolution sur 8 semaines. Actes = ventes hors Spiderhome / Avis Google / Récap Co, + McAfee
 * Mobile et Assurance essentielle (comme les totaux du classement).
 */

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const HEURES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const HEAT = ["bg-slate-100 text-slate-300", "bg-violet-100 text-violet-500", "bg-violet-300 text-violet-800", "bg-violet-500 text-white", "bg-violet-700 text-white"];

const PRODUITS: { code: string; label: string; emoji: string }[] = [
    { code: "box", label: "Box", emoji: "📦" },
    { code: "forfaits", label: "Forfaits", emoji: "📱" },
    { code: "telephones", label: "Téléphones", emoji: "📲" },
    { code: "mcafee", label: "McAfee", emoji: "🛡️" },
    { code: "assurance", label: "Assurance", emoji: "✅" },
    { code: "mcafee_mobile", label: "McAfee Mobile", emoji: "📶" },
    { code: "assurance_essentielle", label: "Assurance Ess.", emoji: "🧩" },
    { code: "canal_plus", label: "Canal+", emoji: "📺" },
];
// Comptés dans les actes (comme le classement). Canal+ : affiché par produit, hors total d'actes.
const COMBOS = ["mcafee_mobile", "assurance_essentielle"] as const;
const COMBOS_TOUS: string[] = ["mcafee_mobile", "assurance_essentielle", "canal_plus"];
// Moyenne par jour travaillé ; sous 1, deux décimales pour que les ventes rares ne tombent pas à 0,0.
function fmtMoy(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: n < 1 && n > 0 ? 2 : 1, maximumFractionDigits: n < 1 ? 2 : 1 });
}

function jourLocal(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateDe(jour: string) {
    const [y, m, d] = jour.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function lundiDe(d: Date) {
    const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
    return l;
}
function fmt1(n: number) {
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: n > 0 && n < 10 ? 1 : 0 });
}
function estActe(code: string) {
    return !!code && !PRODUITS_HORS_ACTES.includes(code as ProduitCode);
}

type Donnees = {
    ventes: VenteStat[];
    planning: Record<string, StatutJour>;
    combos: Record<string, { mcafee_mobile: number; assurance_essentielle: number; canal_plus: number }>;
    articles: StatsTransactionsMois | null;
    equipe: ConseillerStats[];
    comboEquipe: Record<string, RealiseVentesCombo>;
    objectifsCombo: Record<string, RealiseVentesCombo>;
    joursEquipe: Record<string, number>;
};

export default function MesStatsV2({ conseillerId }: { conseillerId: string }) {
    const [d, setD] = useState<Donnees | null>(null);
    const [produitHeat, setProduitHeat] = useState<string>("tous");

    useEffect(() => {
        if (!conseillerId) return;
        const now = new Date();
        const debut = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 mois (records)
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        Promise.all([
            getVentesConseillerDepuis(conseillerId, debut),
            getPlanningPlage(conseillerId, debut, now),
            getCombosParJour(conseillerId, debut, now),
            construireClassementPeriode("mois"),
            getRealiseVentesComboParConseiller(jourLocal(debutMois), jourLocal(now)).catch(() => ({} as Record<string, RealiseVentesCombo>)),
            getObjectifsComboParConseiller().catch(() => ({} as Record<string, RealiseVentesCombo>)),
            getStatsTransactionsMois(conseillerId, now.getFullYear(), now.getMonth() + 1).catch(() => null),
        ]).then(async ([ventes, planning, combos, equipe, comboEquipe, objectifsCombo, articles]) => {
            const joursEquipe = await getJoursTravailPlageTous(equipe.map((c) => c.id), debutMois, now).catch(() => ({} as Record<string, number>));
            setD({ ventes, planning, combos, equipe, comboEquipe, objectifsCombo, joursEquipe, articles });
        });
    }, [conseillerId]);

    // Actes par jour, et par jour × produit (combos inclus).
    const parJour = useMemo(() => {
        const total: Record<string, number> = {};
        const produit: Record<string, Record<string, number>> = {};
        if (!d) return { total, produit };
        const add = (jour: string, code: string, n: number, dansTotal = true) => {
            if (dansTotal) total[jour] = (total[jour] ?? 0) + n;
            (produit[jour] ??= {})[code] = (produit[jour][code] ?? 0) + n;
        };
        d.ventes.forEach((v) => { if (estActe(v.code)) add(v.jour, v.code, v.quantite); });
        Object.entries(d.combos).forEach(([jour, c]) => {
            COMBOS.forEach((code) => { if (c[code]) add(jour, code, c[code]); });
            if (c.canal_plus) add(jour, "canal_plus", c.canal_plus, false);
        });
        return { total, produit };
    }, [d]);

    if (!d) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const now = new Date();
    const aujourdhui = jourLocal(now);

    // ── 1. Heatmap : moyenne par jour travaillé, 30 derniers jours ───────────────
    const debut30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const joursTravailles = Array(7).fill(0);
    for (let x = new Date(debut30); x <= now; x.setDate(x.getDate() + 1)) {
        if (estJourTravaille(x, d.planning[jourLocal(x)])) joursTravailles[(x.getDay() + 6) % 7]++;
    }
    const grille = Array.from({ length: 7 }, () => Array(HEURES.length).fill(0));
    d.ventes.forEach((v) => {
        if (v.ajustement || !estActe(v.code) || v.jour < jourLocal(debut30)) return;
        if (produitHeat !== "tous" && v.code !== produitHeat) return;
        const hi = HEURES.indexOf(v.heure);
        if (hi >= 0) grille[(dateDe(v.jour).getDay() + 6) % 7][hi] += v.quantite;
    });
    const moyennes = grille.map((ligne, j) => ligne.map((n) => (joursTravailles[j] > 0 ? n / joursTravailles[j] : 0)));
    const maxHeat = Math.max(...moyennes.flat(), 0.0001);
    const cellules = moyennes.flatMap((ligne, j) => ligne.map((v, h) => ({ j, h, v }))).filter((c) => joursTravailles[c.j] > 0);
    const forts = [...cellules].sort((a, b) => b.v - a.v).slice(0, 2).filter((c) => c.v > 0);
    const creux = [...cellules].sort((a, b) => a.v - b.v).slice(0, 2);
    const creneau = (c: { j: number; h: number }) => `le ${JOURS_LONG[c.j]} à ${HEURES[c.h]}h`;

    // ── 2. Ce mois vs le mois dernier, à la même date ─────────────────────────────
    const jourDuMois = now.getDate();
    const finMoisDernier = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const prefixeMois = aujourdhui.slice(0, 8);
    const moisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prefixeMoisDernier = jourLocal(moisDernier).slice(0, 8);
    const sommeMois = (prefixe: string, jusqua: number, code?: string) =>
        code
            ? Object.entries(parJour.produit).reduce((t, [jour, p]) => (jour.startsWith(prefixe) && Number(jour.slice(8)) <= jusqua ? t + (p[code] ?? 0) : t), 0)
            : Object.entries(parJour.total).reduce((t, [jour, n]) => (jour.startsWith(prefixe) && Number(jour.slice(8)) <= jusqua ? t + n : t), 0);
    const comparaison = [
        { code: "total", label: "Tous les actes", emoji: "🔥", ceMois: sommeMois(prefixeMois, jourDuMois), avant: sommeMois(prefixeMoisDernier, Math.min(jourDuMois, finMoisDernier)) },
        ...PRODUITS.map((p) => ({ ...p, ceMois: sommeMois(prefixeMois, jourDuMois, p.code), avant: sommeMois(prefixeMoisDernier, Math.min(jourDuMois, finMoisDernier), p.code) })),
    ];

    // ── 3. Moi vs l'équipe (ce mois, par jour travaillé) ──────────────────────────
    const valeurDe = (c: ConseillerStats, code: string) =>
        COMBOS_TOUS.includes(code) ? (d.comboEquipe[c.id]?.[code as keyof RealiseVentesCombo] ?? 0) : (c.produits[code as ProduitCode] ?? 0);
    const objectifDe = (c: ConseillerStats, code: string) =>
        COMBOS_TOUS.includes(code) ? (d.objectifsCombo[c.id]?.[code as keyof RealiseVentesCombo] ?? 0) : (c.objectifs[code as ProduitCode] ?? 0);
    const moi = d.equipe.find((c) => c.id === conseillerId);
    const versusEquipe = moi ? PRODUITS.map((p) => {
        // Seuls les conseillers qui ont un objectif sur ce produit (ex. pas de profil Téléphone exclu).
        const concernes = d.equipe.filter((c) => (d.joursEquipe[c.id] ?? 0) > 0 && objectifDe(c, p.code) > 0);
        if (!concernes.some((c) => c.id === conseillerId)) return null;
        const parJ = concernes.map((c) => ({ id: c.id, v: valeurDe(c, p.code) / (d.joursEquipe[c.id] || 1) })).sort((a, b) => b.v - a.v);
        const mien = parJ.find((x) => x.id === conseillerId)!;
        const autres = parJ.filter((x) => x.id !== conseillerId);
        const moyenne = autres.length ? autres.reduce((t, x) => t + x.v, 0) / autres.length : 0;
        const rang = parJ.findIndex((x) => x.id === conseillerId) + 1;
        const statut = moyenne === 0 ? "neutre" : mien.v >= moyenne * 1.15 ? "fort" : mien.v <= moyenne * 0.85 ? "faible" : "neutre";
        return { ...p, mien: mien.v, moyenne, rang, nb: parJ.length, statut };
    }).filter((x): x is NonNullable<typeof x> => !!x) : [];

    // ── 4. Records (6 derniers mois) ─────────────────────────────────────────────
    const jours = Object.entries(parJour.total).filter(([, n]) => n > 0);
    const meilleurJour = jours.reduce<[string, number] | null>((b, j) => (!b || j[1] > b[1] ? j : b), null);
    const parSemaine: Record<string, number> = {};
    const parMois: Record<string, number> = {};
    jours.forEach(([jour, n]) => {
        const l = jourLocal(lundiDe(dateDe(jour)));
        parSemaine[l] = (parSemaine[l] ?? 0) + n;
        parMois[jour.slice(0, 7)] = (parMois[jour.slice(0, 7)] ?? 0) + n;
    });
    const meilleure = (r: Record<string, number>) => Object.entries(r).reduce<[string, number] | null>((b, x) => (!b || x[1] > b[1] ? x : b), null);
    const meilleureSemaine = meilleure(parSemaine);
    const meilleurMois = meilleure(parMois);
    // Plus longue série de jours travaillés consécutifs avec au moins une vente.
    let serie = 0, serieMax = 0;
    for (let x = new Date(now.getFullYear(), now.getMonth() - 5, 1); x <= now; x.setDate(x.getDate() + 1)) {
        const k = jourLocal(x);
        if (!estJourTravaille(x, d.planning[k])) continue;
        if ((parJour.total[k] ?? 0) > 0) { serie++; serieMax = Math.max(serieMax, serie); }
        else if (k !== aujourdhui) serie = 0;
    }

    // ── 5. Évolution sur 8 semaines ──────────────────────────────────────────────
    const lundiCourant = lundiDe(now);
    const semaines = Array.from({ length: 8 }, (_, i) => {
        const l = new Date(lundiCourant);
        l.setDate(l.getDate() - 7 * (7 - i));
        const cle = jourLocal(l);
        return { cle, label: `${String(l.getDate()).padStart(2, "0")}/${String(l.getMonth() + 1).padStart(2, "0")}`, total: parSemaine[cle] ?? 0, enCours: i === 7 };
    });
    const maxSemaine = Math.max(...semaines.map((s) => s.total), 1);

    const fmtJourCourt = (jour: string) => dateDe(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="space-y-5">
            {/* ── Articles par vente : donnée clé, en haut ─────────────── */}
            {d.articles && <ArticlesParVenteCard stats={d.articles} />}

            {/* ── 1. Heatmap ─────────────────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-black text-slate-900">Quand tu vends le plus</h2>
                        <p className="text-xs font-semibold text-slate-400">30 derniers jours · moyenne par jour travaillé (selon ton planning)</p>
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-black">
                        {[{ code: "tous", label: "Tous" }, ...PRODUITS.filter((p) => !COMBOS_TOUS.includes(p.code))].map((p) => (
                            <button key={p.code} onClick={() => setProduitHeat(p.code)} aria-pressed={produitHeat === p.code} className={`rounded-lg px-2.5 py-1 transition-all ${produitHeat === p.code ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="border-separate border-spacing-1 text-[11px]">
                        <thead>
                            <tr>
                                <th />
                                {HEURES.map((h) => <th key={h} className="w-11 font-bold text-slate-400">{h}h</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {JOURS.map((jour, j) => (
                                <tr key={jour}>
                                    <th className="pr-2 text-right font-bold text-slate-400">
                                        {jour}
                                        <span className="block text-[9px] font-semibold text-slate-300">{joursTravailles[j]} j</span>
                                    </th>
                                    {moyennes[j].map((v, h) => {
                                        const idx = v === 0 ? 0 : Math.min(Math.ceil((v / maxHeat) * (HEAT.length - 1)), HEAT.length - 1);
                                        return (
                                            <td
                                                key={h}
                                                title={joursTravailles[j] ? `${JOURS_LONG[j]} ${HEURES[h]}h : ${fmt1(v)} vente(s) en moyenne sur ${joursTravailles[j]} jour(s) travaillé(s)` : `${JOURS_LONG[j]} : pas travaillé`}
                                                className={`h-9 w-11 rounded-lg text-center font-black tabular-nums ${joursTravailles[j] === 0 ? "bg-slate-50 text-slate-200" : HEAT[idx]}`}
                                            >
                                                {joursTravailles[j] === 0 ? "" : v > 0 ? fmt1(v) : ""}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {forts.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">
                            🔥 Tes créneaux forts : <span className="font-black">{forts.map(creneau).join(" et ")}</span>
                        </p>
                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                            🧊 Tes créneaux creux : <span className="font-black">{creux.map(creneau).join(" et ")}</span>
                        </p>
                    </div>
                )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                {/* ── 2. Ce mois vs le mois dernier ───────────────────── */}
                <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                    <h2 className="text-base font-black text-slate-900">Ce mois-ci vs le mois dernier</h2>
                    <p className="text-xs font-semibold text-slate-400">Du 1er au {jourDuMois} de chaque mois</p>
                    <ul className="mt-3 divide-y divide-slate-100">
                        {comparaison.map((l) => {
                            const delta = l.ceMois - l.avant;
                            return (
                                <li key={l.code} className={`flex items-center gap-3 py-2 ${l.code === "total" ? "font-black" : ""}`}>
                                    <span className="w-6 text-center" aria-hidden="true">{l.emoji}</span>
                                    <span className="flex-1 text-sm text-slate-700">{l.label}</span>
                                    <span className="text-sm tabular-nums text-slate-400">{l.avant} →</span>
                                    <span className="w-10 text-right text-sm font-black tabular-nums text-slate-900">{l.ceMois}</span>
                                    <span className={`w-14 text-right text-xs font-black tabular-nums ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                        {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : "="}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* ── 3. Moi vs l'équipe ───────────────────────────────── */}
                <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                    <h2 className="text-base font-black text-slate-900">Toi vs l&apos;équipe</h2>
                    <p className="text-xs font-semibold text-slate-400">Ce mois-ci · moyenne par jour travaillé · conseillers ayant l&apos;objectif</p>
                    <ul className="mt-3 divide-y divide-slate-100">
                        {versusEquipe.map((l) => (
                            <li key={l.code} className="flex items-center gap-3 py-2">
                                <span className="w-6 text-center" aria-hidden="true">{l.emoji}</span>
                                <span className="flex-1 text-sm text-slate-700">{l.label}</span>
                                <span className="text-xs tabular-nums text-slate-400">équipe {fmtMoy(l.moyenne)}</span>
                                <span className="w-10 text-right text-sm font-black tabular-nums text-slate-900">{fmtMoy(l.mien)}</span>
                                <span className={`w-36 shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[11px] font-black ${
                                    l.statut === "fort" ? "bg-emerald-100 text-emerald-700" : l.statut === "faible" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                }`}>
                                    {l.statut === "fort" ? "💪 point fort" : l.statut === "faible" ? "🎯 à travailler" : "dans la moyenne"} · {l.rang}/{l.nb}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
                {/* ── 4. Records ───────────────────────────────────────── */}
                <section className="rounded-[24px] bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200/70 sm:p-6">
                    <h2 className="text-base font-black text-slate-900">🏆 Mes records</h2>
                    <p className="text-xs font-semibold text-slate-500">Sur les 6 derniers mois</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                            { label: "Meilleure journée", val: meilleurJour?.[1], sous: meilleurJour ? fmtJourCourt(meilleurJour[0]) : "" },
                            { label: "Meilleure semaine", val: meilleureSemaine?.[1], sous: meilleureSemaine ? `semaine du ${dateDe(meilleureSemaine[0]).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "" },
                            { label: "Meilleur mois", val: meilleurMois?.[1], sous: meilleurMois ? dateDe(`${meilleurMois[0]}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "" },
                            { label: "Plus longue série", val: serieMax, sous: "jours travaillés d'affilée avec au moins une vente" },
                        ].map((r) => (
                            <div key={r.label} className="rounded-2xl bg-white/80 p-3 ring-1 ring-white">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">{r.label}</p>
                                <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{r.val ?? "–"}{r.label !== "Plus longue série" && r.val ? <span className="ml-1 text-xs font-bold text-slate-400">actes</span> : null}</p>
                                <p className="text-[11px] font-semibold text-slate-500">{r.sous}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 5. Évolution sur 8 semaines ──────────────────────── */}
                <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                    <h2 className="text-base font-black text-slate-900">Mes 8 dernières semaines</h2>
                    <p className="text-xs font-semibold text-slate-400">Actes par semaine (lundi → dimanche)</p>
                    <div className="mt-4 flex h-44 items-end gap-2" role="img" aria-label={`Actes par semaine : ${semaines.map((s) => `${s.label} ${s.total}`).join(", ")}`}>
                        {semaines.map((s) => (
                            <div key={s.cle} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Semaine du ${s.label} : ${s.total} actes${s.enCours ? " (en cours)" : ""}`}>
                                <span className={`text-[11px] font-black tabular-nums ${s.enCours ? "text-violet-500" : "text-slate-700"}`}>{s.total}</span>
                                <div
                                    className={`w-full rounded-t-[4px] ${s.enCours ? "bg-violet-200 ring-1 ring-inset ring-violet-400 [background-image:repeating-linear-gradient(135deg,transparent_0_4px,rgba(139,92,246,.25)_4px_7px)]" : "bg-violet-500 group-hover:bg-violet-600"}`}
                                    style={{ height: `${Math.max((s.total / maxSemaine) * 100, s.total > 0 ? 3 : 0)}%` }}
                                />
                                <span className="text-[10px] font-semibold text-slate-400">{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Barre hachurée : semaine en cours.</p>
                </section>
            </div>

        </div>
    );
}
