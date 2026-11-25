"use client";

import { useEffect, useState } from "react";
import { getMissionsCompletes, getVentesParMois, codeDepuisNom, MissionComplete } from "@/services/missionsReelles";
import { getJoursTravail } from "@/services/planningService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { getVentesDepuisLundi } from "@/services/stats";
import { getRealiseVentesCombo } from "@/services/variableConseiller";
import { periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { COMBO_META, ComboCode } from "@/utils/classementGroupes";
import AnneauObjectif from "@/components/ui/AnneauObjectif";

/**
 * Variante "par horizon" de Mes objectifs (&objectifs=v3) : tout se lit en Semaine / Mois.
 * L'objectif du jour n'y figure pas : il est déjà sur l'Accueil.
 */

const MOIS_COURTS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_NOMS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const GROUPES: { id: string; label: string; codes: string[]; ventes: boolean }[] = [
    { id: "core", label: "Core business", codes: ["box", "forfaits", "telephones"], ventes: true },
    { id: "upsell", label: "Upsell", codes: ["mcafee", "assurance", "mcafee_mobile", "assurance_essentielle", "canal_plus"], ventes: true },
    { id: "quali", label: "Quali", codes: ["avis_google", "recap_commercial", "spiderhome"], ventes: false },
];
// Historisation : pas un objectif de vente, on n'affiche pas de rythme (avance / retard).
const SANS_RYTHME = ["spiderhome"];

function emojiDe(code: string): string {
    return PRODUITS_ORDRE.find((p) => p.code === code)?.emoji ?? COMBO_META[code as ComboCode]?.emoji ?? "•";
}

type Horizon = { realise: number; objectif: number } | null;

type Carte = {
    code: string;
    produit: string;
    semaine: Horizon;
    mois: { realise: number; objectif: number; attendu: number; projection: number; parJour: number };
    ecart: number;
    historique: { label: string; valeur: number; projection?: boolean }[];
};

function pct(h: { realise: number; objectif: number }) {
    return h.objectif > 0 ? Math.round((h.realise / h.objectif) * 100) : 0;
}





export default function MesObjectifsV3({ conseillerId }: { conseillerId: string; nom: string }) {
    const [cartes, setCartes] = useState<Carte[]>([]);
    const [jours, setJours] = useState({ ecoules: 0, total: 0, restants: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        setLoading(true);
        const now = new Date();
        const { debut, fin } = periodeSemaineEffective(now);
        const sem = joursPeriode("semaine", now);
        const moisPrecedents = [-3, -2, -1].map((delta) => {
            let m = now.getMonth() + 1 + delta;
            let a = now.getFullYear();
            if (m < 1) { m += 12; a -= 1; }
            return { m, a };
        });

        Promise.all([
            getMissionsCompletes(conseillerId),
            getJoursTravail(conseillerId, now.getFullYear(), now.getMonth() + 1),
            getObjectifsSemaineFiges([conseillerId], debut, fin).catch(() => ({} as Record<string, Record<string, number>>)),
            getVentesDepuisLundi(conseillerId, debut).catch(() => [] as any[]),
            getRealiseVentesCombo(conseillerId, sem.debut, sem.fin).catch(() => null),
            Promise.all(moisPrecedents.map(({ m, a }) =>
                getVentesParMois(conseillerId, a, m).then((v) => ({ label: MOIS_COURTS[m], ventes: v })).catch(() => ({ label: MOIS_COURTS[m], ventes: {} as Record<string, number> }))
            )),
        ]).then(([missions, jt, figes, ventesSemaine, comboSemaine, hist]) => {
            const total = jt.travailles + jt.restants;
            const objSemaine = (figes as Record<string, Record<string, number>>)[conseillerId] ?? {};

            const realiseSemaine: Record<string, number> = {};
            (ventesSemaine as any[]).forEach((v) => {
                const p = Array.isArray(v.produits) ? v.produits[0] : v.produits;
                if (p?.code) realiseSemaine[p.code] = (realiseSemaine[p.code] ?? 0) + (v.quantite ?? 1);
            });
            if (comboSemaine) Object.entries(comboSemaine).forEach(([code, n]) => { realiseSemaine[code] = n as number; });

            setCartes((missions as MissionComplete[]).map((m) => {
                const code = codeDepuisNom(m.produit);
                const attendu = total > 0 ? (m.objectifMensuel * jt.travailles) / total : 0;
                const objSem = objSemaine[code];
                return {
                    code,
                    produit: m.produit,
                    semaine: objSem !== undefined ? { realise: realiseSemaine[code] ?? 0, objectif: objSem } : null,
                    mois: { realise: m.realise, objectif: m.objectifMensuel, attendu, projection: m.projectionFinMois, parJour: m.objectifJour },
                    ecart: Math.round(m.realise - attendu),
                    historique: [
                        ...hist.map((h) => ({ label: h.label, valeur: h.ventes[m.produit] ?? 0 })),
                        { label: MOIS_COURTS[now.getMonth() + 1], valeur: m.projectionFinMois, projection: true },
                    ],
                };
            }));
            setJours({ ecoules: jt.travailles, total, restants: jt.restants });
        }).finally(() => setLoading(false));
    }, [conseillerId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    // Totaux par horizon, sur les ventes uniquement (Core + Upsell).
    const codesVentes = GROUPES.filter((g) => g.ventes).flatMap((g) => g.codes);
    const ventes = cartes.filter((c) => codesVentes.includes(c.code));
    const somme = (f: (c: Carte) => Horizon) => ventes.reduce(
        (t, c) => { const h = f(c); return h ? { realise: t.realise + h.realise, objectif: t.objectif + h.objectif } : t; },
        { realise: 0, objectif: 0 }
    );
    const totSemaine = somme((c) => c.semaine);
    const totMois = somme((c) => c.mois);
    const attenduMois = ventes.reduce((t, c) => t + c.mois.attendu, 0);
    const pctAttendu = jours.total > 0 ? Math.round((jours.ecoules / jours.total) * 100) : 0;

    const horizons = [
        {
            label: "Cette semaine", h: totSemaine, repere: null as number | null,
            sous: totSemaine.realise >= totSemaine.objectif ? "Semaine complète ✓" : `Encore ${totSemaine.objectif - totSemaine.realise}`,
        },
        { label: "Ce mois", h: totMois, repere: attenduMois as number | null, sous: `Rythme attendu ${pctAttendu} %` },
    ];

    const aRattraper = ventes.filter((c) => c.ecart < 0 && c.mois.realise < c.mois.objectif).sort((a, b) => a.ecart - b.ecart).slice(0, 3);
    const now = new Date();

    return (
        <div className="space-y-6">
            {/* ── Trois horizons ───────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,.35)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex flex-wrap items-baseline justify-between gap-2">
                    <h1 className="text-2xl font-black">Mes objectifs</h1>
                    <p className="text-sm font-semibold text-white/50">
                        {MOIS_NOMS[now.getMonth()]} · jour {jours.ecoules} sur {jours.total} planifiés
                    </p>
                </div>
                <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
                    {horizons.map((x) => {
                        const p = pct(x.h);
                        return (
                            <div key={x.label} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                                <div className="shrink-0"><AnneauObjectif realise={x.h.realise} objectif={x.h.objectif} taille={92} sousTexte={false} sombre /></div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">{x.label}</p>
                                    <p className="mt-0.5 text-2xl font-black tabular-nums">{p}%</p>
                                    <p className="text-xs font-semibold text-white/55">{x.sous}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {aRattraper.length > 0 && (
                    <p className="relative mt-4 rounded-2xl bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/20">
                        🎯 À rattraper ce mois-ci :{" "}
                        {aRattraper.map((c, i) => (
                            <span key={c.code}>{i > 0 && " · "}<span className="font-black text-amber-100">{c.produit}</span> ({c.ecart})</span>
                        ))}
                    </p>
                )}
            </section>

            {/* ── Cartes produit par groupe ────────────────────────── */}
            {GROUPES.map((g) => {
                const cartesGroupe = g.codes.map((code) => cartes.find((c) => c.code === code)).filter((c): c is Carte => !!c);
                if (cartesGroupe.length === 0) return null;
                return (
                    <section key={g.id}>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">{g.label}</h2>
                            {g.id === "core" && (
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                                    <span className="inline-block h-3 w-0.5 rounded bg-slate-700" /> où tu devrais être ce mois-ci
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {cartesGroupe.map((c) => {
                                const avecRythme = !SANS_RYTHME.includes(c.code);
                                const atteint = c.mois.objectif > 0 && c.mois.realise >= c.mois.objectif;
                                const maxHist = Math.max(...c.historique.map((h) => h.valeur), c.mois.objectif, 1);
                                return (
                                    <article key={c.code} className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)] ring-1 ring-slate-100">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="flex min-w-0 items-center gap-2 font-black text-slate-800">
                                                <span className="text-lg leading-none">{emojiDe(c.code)}</span>
                                                <span className="truncate">{c.produit}</span>
                                            </p>
                                            {avecRythme && (
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                    atteint ? "bg-violet-100 text-violet-700"
                                                    : c.ecart >= 0 ? "bg-emerald-100 text-emerald-700"
                                                    : c.mois.realise >= c.mois.attendu * 0.85 ? "bg-amber-100 text-amber-700"
                                                    : "bg-rose-100 text-rose-700"
                                                }`}>
                                                    {atteint ? "🏆 Atteint" : c.ecart > 0 ? `+${c.ecart} d'avance` : c.ecart === 0 ? "Dans les temps" : `${c.ecart} de retard`}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {c.semaine ? (
                                                <AnneauObjectif realise={c.semaine.realise} objectif={c.semaine.objectif} label="Semaine" taille={76} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center text-[11px] font-bold text-slate-300">Semaine<br />sans objectif</div>
                                            )}
                                            <AnneauObjectif realise={c.mois.realise} objectif={c.mois.objectif} label="Mois" taille={76} />
                                        </div>

                                        {/* Mini-historique : 3 mois précédents + projection du mois en cours */}
                                        <div className="mt-3 flex items-end gap-1.5 border-t border-slate-100 pt-3">
                                            {c.historique.map((h) => (
                                                <div key={h.label} className="flex flex-1 flex-col items-center gap-1">
                                                    <span className={`text-[10px] font-bold tabular-nums ${h.projection ? "text-indigo-600" : "text-slate-400"}`}>{h.valeur}</span>
                                                    <div className="flex h-8 w-full items-end">
                                                        <div
                                                            className={`w-full rounded-t ${h.projection ? "bg-indigo-200 ring-1 ring-inset ring-indigo-400 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgba(99,102,241,.25)_3px_5px)]" : "bg-slate-200"}`}
                                                            style={{ height: `${Math.max((h.valeur / maxHist) * 100, 4)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] ${h.projection ? "font-bold text-indigo-600" : "text-slate-400"}`}>{h.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {!atteint && c.mois.objectif > 0 && (
                                            <p className="mt-2.5 text-[11px] text-slate-500">
                                                Pour finir le mois : <span className="font-bold text-slate-700">{c.mois.parJour} par jour planifié</span>
                                            </p>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

        </div>
    );
}
