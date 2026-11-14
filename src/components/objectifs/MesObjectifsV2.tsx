"use client";

import { useEffect, useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getMissionsCompletes, getVentesParMois, codeDepuisNom, MissionComplete } from "@/services/missionsReelles";
import { getStatsTransactionsMois, StatsTransactionsMois } from "@/services/ventesTransactions";
import { getJoursTravail } from "@/services/planningService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { getVentesDepuisLundi } from "@/services/stats";
import { getRealiseVentesCombo } from "@/services/variableConseiller";
import { periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import ArticlesParVenteCard from "@/components/dashboard/ArticlesParVenteCard";

const MOIS_COURTS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Mêmes groupes que le Classement ; Spiderhome (historisation) rejoint "Quali".
const GROUPES_OBJECTIFS: { id: string; label: string; codes: string[]; ventes: boolean }[] = [
    { id: "core", label: "Core business", codes: ["box", "forfaits", "telephones"], ventes: true },
    { id: "upsell", label: "Upsell", codes: ["mcafee", "assurance", "mcafee_mobile", "assurance_essentielle", "canal_plus"], ventes: true },
    { id: "quali", label: "Quali", codes: ["avis_google", "recap_commercial", "spiderhome"], ventes: false },
];
const CODES_COMBO = ["mcafee_mobile", "assurance_essentielle", "canal_plus"];

type Rythme = "atteint" | "avance" | "juste" | "retard";

// Une seule logique de couleur : le rythme (réalisé vs où on devrait être aujourd'hui).
const STYLE_RYTHME: Record<Rythme, { label: string; texte: string; texteSombre: string; barre: string; pastille: string }> = {
    atteint: { label: "🏆 Atteint", texte: "text-violet-600", texteSombre: "text-violet-300", barre: "bg-gradient-to-r from-violet-500 to-fuchsia-500", pastille: "bg-violet-100 text-violet-700" },
    avance: { label: "Dans les temps", texte: "text-emerald-600", texteSombre: "text-emerald-300", barre: "bg-gradient-to-r from-emerald-500 to-green-400", pastille: "bg-emerald-100 text-emerald-700" },
    juste: { label: "Un peu juste", texte: "text-amber-600", texteSombre: "text-amber-300", barre: "bg-gradient-to-r from-amber-400 to-orange-400", pastille: "bg-amber-100 text-amber-700" },
    retard: { label: "En retard", texte: "text-red-600", texteSombre: "text-red-300", barre: "bg-gradient-to-r from-red-500 to-rose-400", pastille: "bg-red-100 text-red-700" },
};

type Ligne = MissionComplete & {
    code: string;
    attendu: number;          // où il devrait être aujourd'hui (réalisé attendu, non arrondi)
    ecart: number;            // réalisé - attendu, arrondi
    rythme: Rythme;
    parJourPlanifie: number;  // pour finir le mois
    semaine: { realise: number; objectif: number } | null;
};

function calculerRythme(realise: number, objectif: number, attendu: number): Rythme {
    if (objectif > 0 && realise >= objectif) return "atteint";
    if (attendu <= 0 || realise >= attendu) return "avance";
    if (realise >= attendu * 0.85) return "juste";
    return "retard";
}

function pluriel(n: number, mot: string) {
    return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

export default function MesObjectifsV2({ conseillerId, nom }: { conseillerId: string; nom: string }) {
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [jours, setJours] = useState({ ecoules: 0, total: 0, restants: 0 });
    const [historique, setHistorique] = useState<{ label: string; ventes: Record<string, number> }[]>([]);
    const [statsArticles, setStatsArticles] = useState<StatsTransactionsMois | null>(null);
    const [ouverte, setOuverte] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        setLoading(true);
        const now = new Date();
        const { debut, fin } = periodeSemaineEffective(now);
        const sem = joursPeriode("semaine", now);

        Promise.all([
            getMissionsCompletes(conseillerId),
            getJoursTravail(conseillerId, now.getFullYear(), now.getMonth() + 1),
            getObjectifsSemaineFiges([conseillerId], debut, fin).catch(() => ({} as Record<string, Record<string, number>>)),
            getVentesDepuisLundi(conseillerId, debut).catch(() => [] as any[]),
            getRealiseVentesCombo(conseillerId, sem.debut, sem.fin).catch(() => null),
            getStatsTransactionsMois(conseillerId, now.getFullYear(), now.getMonth() + 1).catch(() => null),
            Promise.all([-3, -2, -1].map((delta) => {
                let m = now.getMonth() + 1 + delta;
                let a = now.getFullYear();
                if (m < 1) { m += 12; a -= 1; }
                return getVentesParMois(conseillerId, a, m).then((v) => ({ label: MOIS_COURTS[m], ventes: v })).catch(() => ({ label: MOIS_COURTS[m], ventes: {} }));
            })),
        ]).then(([missions, jt, figes, ventesSemaine, comboSemaine, stats, hist]) => {
            // "travailles" inclut aujourd'hui : on compte la journée en cours comme commencée.
            const total = jt.travailles + jt.restants;
            const objSemaine = (figes as Record<string, Record<string, number>>)[conseillerId] ?? {};

            const realiseSemaine: Record<string, number> = {};
            (ventesSemaine as any[]).forEach((v) => {
                const p = Array.isArray(v.produits) ? v.produits[0] : v.produits;
                if (p?.code) realiseSemaine[p.code] = (realiseSemaine[p.code] ?? 0) + (v.quantite ?? 1);
            });
            if (comboSemaine) Object.entries(comboSemaine).forEach(([code, n]) => { realiseSemaine[code] = n as number; });

            setLignes((missions as MissionComplete[]).map((m) => {
                const code = codeDepuisNom(m.produit);
                const attendu = total > 0 ? (m.objectifMensuel * jt.travailles) / total : 0;
                const objectifSem = objSemaine[code];
                return {
                    ...m,
                    code,
                    attendu,
                    ecart: Math.round(m.realise - attendu),
                    rythme: calculerRythme(m.realise, m.objectifMensuel, attendu),
                    parJourPlanifie: m.objectifJour,
                    // Récap Co / Spiderhome : objectif auto hors cascade semaine → pas de ligne semaine.
                    semaine: objectifSem !== undefined ? { realise: realiseSemaine[code] ?? 0, objectif: objectifSem } : null,
                };
            }));
            setJours({ ecoules: jt.travailles, total, restants: jt.restants });
            setStatsArticles(stats as StatsTransactionsMois | null);
            setHistorique(hist);
        }).finally(() => setLoading(false));
    }, [conseillerId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const codesVentes = GROUPES_OBJECTIFS.filter((g) => g.ventes).flatMap((g) => g.codes);
    const lignesVentes = lignes.filter((l) => codesVentes.includes(l.code));
    const totalRealise = lignesVentes.reduce((t, l) => t + l.realise, 0);
    const totalObjectif = lignesVentes.reduce((t, l) => t + l.objectifMensuel, 0);
    const projection = lignesVentes.reduce((t, l) => t + l.projectionFinMois, 0);
    const pct = totalObjectif > 0 ? Math.round((totalRealise / totalObjectif) * 100) : 0;
    const pctAttendu = jours.total > 0 ? Math.round((jours.ecoules / jours.total) * 100) : 0;
    const rythmeGlobal = calculerRythme(totalRealise, totalObjectif, (totalObjectif * pctAttendu) / 100);
    const styleGlobal = STYLE_RYTHME[rythmeGlobal];

    const aRattraper = lignesVentes
        .filter((l) => l.rythme === "retard" || l.rythme === "juste")
        .sort((a, b) => a.ecart - b.ecart)
        .slice(0, 3);

    const now = new Date();

    return (
        <div className="space-y-6">
            {/* ── En-tête : où j'en suis ─────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,.35)] sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">Mes objectifs · {MOIS_NOMS[now.getMonth()]} {now.getFullYear()}</p>
                    <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                        Jour {jours.ecoules} sur {jours.total} planifiés · tu es à <span className={styleGlobal.texteSombre}>{pct} %</span> de tes ventes
                    </h1>
                    <p className="mt-1 text-sm text-white/60">
                        À cette date, le rythme attendu est de {pctAttendu} %.{" "}
                        {rythmeGlobal === "atteint" ? "Objectif du mois atteint, bravo !"
                            : pct >= pctAttendu ? "Tu es dans les temps 💪"
                            : `Il te manque ${pctAttendu - pct} points pour être dans les temps.`}
                    </p>

                    {/* Barre globale avec repère "aujourd'hui" */}
                    <div className="relative mt-5 h-3 rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${styleGlobal.barre} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        <div className="absolute -top-1.5 h-6 w-0.5 rounded bg-white" style={{ left: `${Math.min(pctAttendu, 100)}%` }} title="Où tu devrais être aujourd'hui" />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-white/40">
                        <span>0</span>
                        <span>▲ rythme attendu aujourd&apos;hui</span>
                        <span>{totalObjectif}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                        {[
                            { label: "Ventes réalisées", val: `${totalRealise}`, sous: `sur ${totalObjectif}` },
                            { label: "Fin de mois à ton rythme", val: `${projection}`, sous: projection >= totalObjectif ? "objectif atteint ✓" : `${totalObjectif - projection} sous l'objectif` },
                            { label: "Jours planifiés restants", val: `${jours.restants}`, sous: "après aujourd'hui" },
                        ].map((k) => (
                            <div key={k.label} className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">{k.label}</p>
                                <p className="mt-1 text-2xl font-black tabular-nums">{k.val}</p>
                                <p className="text-[11px] font-semibold text-white/45">{k.sous}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Là où tu peux rattraper le plus ───────────────────── */}
            {aRattraper.length > 0 && (
                <section className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">🎯 Là où tu peux rattraper le plus</p>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                        {aRattraper.map((l) => (
                            <div key={l.code} className="rounded-2xl bg-white p-3.5 shadow-sm">
                                <p className="font-black text-slate-900">{l.produit}</p>
                                <p className="mt-0.5 text-sm font-bold text-red-600">{pluriel(-l.ecart, "vente")} de retard</p>
                                <p className="mt-1 text-xs text-slate-500">Pour finir le mois : {l.parJourPlanifie} par jour planifié</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Objectifs par groupe ─────────────────────────────── */}
            {GROUPES_OBJECTIFS.map((g) => {
                const lignesGroupe = g.codes.map((c) => lignes.find((l) => l.code === c)).filter((l): l is Ligne => !!l);
                if (lignesGroupe.length === 0) return null;
                return (
                    <section key={g.id} className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{g.label}</p>
                            {g.id === "core" && (
                                <p className="hidden items-center gap-1.5 text-[11px] font-semibold text-slate-400 sm:flex">
                                    <span className="inline-block h-3 w-0.5 rounded bg-slate-700" /> = où tu devrais être aujourd&apos;hui
                                </p>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {lignesGroupe.map((l) => {
                                const st = STYLE_RYTHME[l.rythme];
                                const pctAttenduLigne = l.objectifMensuel > 0 ? Math.min((l.attendu / l.objectifMensuel) * 100, 100) : 0;
                                const estOuverte = ouverte === l.code;
                                return (
                                    <div key={l.code} className="py-3.5">
                                        <button onClick={() => setOuverte(estOuverte ? null : l.code)} className="w-full text-left" aria-expanded={estOuverte}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <p className="truncate font-black text-slate-800">{l.produit}</p>
                                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.pastille}`}>
                                                        {l.rythme === "atteint" ? st.label
                                                            : l.ecart >= 0 ? (l.ecart > 0 ? `+${l.ecart} d'avance` : st.label)
                                                            : `${l.ecart} de retard`}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <p className={`text-lg font-black tabular-nums ${st.texte}`}>{l.progression}%</p>
                                                    <ChevronDown size={16} className={`text-slate-300 transition-transform ${estOuverte ? "rotate-180" : ""}`} />
                                                </div>
                                            </div>

                                            <div className="relative mt-2 h-2.5 rounded-full bg-slate-100">
                                                <div className={`h-full rounded-full ${st.barre} transition-all duration-700`} style={{ width: `${Math.min(l.progression, 100)}%` }} />
                                                {l.objectifMensuel > 0 && l.rythme !== "atteint" && (
                                                    <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-slate-700" style={{ left: `${pctAttenduLigne}%` }} />
                                                )}
                                            </div>

                                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                                <span>Mois <span className="font-bold text-slate-700">{l.realise} / {l.objectifMensuel}</span></span>
                                                {l.semaine && (
                                                    <span>Semaine <span className="font-bold text-slate-700">{l.semaine.realise} / {l.semaine.objectif}</span></span>
                                                )}
                                            </div>
                                        </button>

                                        {estOuverte && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {[
                                                    { label: "Reste à faire", val: `${l.resteAFaire}` },
                                                    { label: "Pour finir le mois", val: `${l.parJourPlanifie} / jour planifié` },
                                                    { label: "Attendu aujourd'hui", val: `${Math.round(l.attendu)}` },
                                                    { label: "Fin de mois à ton rythme", val: `${l.projectionFinMois} / ${l.objectifMensuel}` },
                                                ].map((d) => (
                                                    <div key={d.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{d.label}</p>
                                                        <p className="mt-0.5 text-sm font-black text-slate-800">{d.val}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {/* ── Historique comparable ─────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Historique — comparaison sur 4 mois</p>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                                <th className="pb-2 font-bold">Produit</th>
                                {historique.map((h) => <th key={h.label} className="pb-2 text-right font-bold">{h.label}</th>)}
                                <th className="pb-2 text-right font-bold text-violet-600">{MOIS_COURTS[now.getMonth() + 1]} (projection)</th>
                                <th className="w-8 pb-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {GROUPES_OBJECTIFS.filter((g) => g.ventes).flatMap((g) => g.codes).map((code) => {
                                const l = lignes.find((x) => x.code === code);
                                if (!l) return null;
                                const moisPrec = historique.length > 0 ? historique[historique.length - 1].ventes[l.produit] ?? 0 : 0;
                                const tendance = l.projectionFinMois - moisPrec;
                                return (
                                    <tr key={code}>
                                        <td className="py-2 font-bold text-slate-700">{l.produit}</td>
                                        {historique.map((h) => (
                                            <td key={h.label} className="py-2 text-right tabular-nums text-slate-500">{h.ventes[l.produit] ?? 0}</td>
                                        ))}
                                        <td className="py-2 text-right font-black tabular-nums text-violet-700">
                                            {l.realise} <span className="font-semibold text-slate-400">→ {l.projectionFinMois}</span>
                                        </td>
                                        <td className="py-2 pl-2 text-right">
                                            {tendance > 0 ? <TrendingUp size={15} className="ml-auto text-emerald-500" aria-label="en hausse" />
                                                : tendance < 0 ? <TrendingDown size={15} className="ml-auto text-rose-500" aria-label="en baisse" />
                                                : <Minus size={15} className="ml-auto text-slate-300" aria-label="stable" />}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">La flèche compare ta fin de mois projetée au mois dernier.</p>
            </section>

            {statsArticles && <ArticlesParVenteCard stats={statsArticles} />}
        </div>
    );
}
