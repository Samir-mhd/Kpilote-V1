"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DetailVariable, BaremeVariable, ContributionAssurance, getContributionAssuranceMoisAffiche } from "@/services/variableConseiller";
import { ContributionBoxMoisPaiement, getContributionBoxMoisPaiement, nomMois } from "@/services/boxRaccordement";
import { ContributionForfait4P, getContributionForfait4PMoisPaiement } from "@/services/forfait4P";

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function moisPlus(mois: string, delta: number) {
    const [y, m] = mois.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Ligne = { label: string; montant: number };
type Famille = { id: string; emoji: string; titre: string; provenance: string; lignes: Ligne[] };

/**
 * "D'où vient ta variable" : le détail regroupé par famille, une barre par famille (part du
 * total), chaque famille dépliable. Une seule couleur : la barre dit "combien", le libellé dit "quoi".
 */
export function CompositionVariable({
    detail, contributionBox, contributionForfait4P, contributionAssurance, moisVenteBox, moisVenteAssurance,
}: {
    detail: DetailVariable;
    contributionBox: ContributionBoxMoisPaiement | null;
    contributionForfait4P: ContributionForfait4P | null;
    contributionAssurance: ContributionAssurance | null;
    moisVenteBox: string;
    moisVenteAssurance: string;
}) {
    const [ouverte, setOuverte] = useState<string | null>(null);
    const cb = contributionBox;
    const familles: Famille[] = [
        {
            id: "forfaits", emoji: "📱", titre: "Forfaits", provenance: "vendus ce mois-ci", lignes: [
                { label: "Prime forfait", montant: detail.prime_forfait },
                { label: "Boost individuel forfait", montant: detail.boost_individuel_forfait },
                { label: "Boost collectif forfait", montant: detail.boost_collectif_forfait },
                { label: "Up-sell forfait (migration)", montant: detail.prime_migration_forfait },
            ],
        },
        {
            id: "smartphones", emoji: "📲", titre: "Smartphones", provenance: "vendus ce mois-ci", lignes: [
                { label: "Prime smartphone", montant: detail.prime_smartphone },
                { label: "Boost individuel smartphone", montant: detail.boost_individuel_smartphone },
                { label: "Boost collectif smartphone", montant: detail.boost_collectif_smartphone },
            ],
        },
        {
            id: "box", emoji: "📦", titre: "Box", provenance: `vendues en ${nomMois(moisVenteBox)}, raccordées`, lignes: [
                { label: `${cb?.nbRaccordees ? `${cb.nbRaccordees} box raccordées` : "Box raccordées"}`, montant: cb?.primeBox ?? 0 },
                { label: "Boost individuel box", montant: cb?.boostIndividuel ?? 0 },
                { label: "Prime box (déclarée)", montant: detail.prime_box },
                { label: "Boost box (déclaré)", montant: detail.boost_individuel_box + detail.boost_collectif_box },
            ],
        },
        {
            id: "4p", emoji: "🔀", titre: "4P", provenance: `vendus en ${nomMois(moisVenteBox)}`, lignes: [
                { label: `${(cb?.nb4P ?? 0) + (contributionForfait4P?.nb ?? 0)} abonnés 4P (box + forfait)`, montant: (cb?.prime4P ?? 0) + (contributionForfait4P?.montantTotal ?? 0) },
                { label: "Cross-sell / vente rebond 4P", montant: detail.prime_cross_sell },
            ],
        },
        {
            id: "assurances", emoji: "🛡️", titre: "Assurances", provenance: `vendues en ${nomMois(moisVenteAssurance)}`, lignes: [
                { label: `Nouveau Mobile${contributionAssurance?.nbNouveauMobile ? ` — ${contributionAssurance.nbNouveauMobile}` : ""}`, montant: contributionAssurance?.montantNouveauMobile ?? 0 },
                { label: `Essentielle${contributionAssurance?.nbEssentielle ? ` — ${contributionAssurance.nbEssentielle}` : ""}`, montant: contributionAssurance?.montantEssentielle ?? 0 },
                { label: "Assurance (déclarée)", montant: detail.prime_assurance },
            ],
        },
        {
            id: "options", emoji: "📺", titre: "McAfee & Canal+", provenance: "options", lignes: [
                { label: `McAfee sur box${cb?.nbMcafee ? ` — ${cb.nbMcafee}` : ""}`, montant: cb?.primeMcafee ?? 0 },
                { label: "Canal+ sur box", montant: cb?.primeCanal ?? 0 },
                { label: "McAfee (déclaré)", montant: detail.prime_mcafee },
                { label: "Canal+ (déclaré)", montant: detail.prime_canal },
            ],
        },
        {
            id: "qualite", emoji: "⭐", titre: "Qualité & collectif", provenance: "notes et présence", lignes: [
                { label: "SatisFD individuelle", montant: detail.prime_satisfd_individuelle },
                { label: "Rémunération collective", montant: detail.prime_collective },
                { label: "Actes AST", montant: detail.prime_actes_ast },
            ],
        },
        {
            id: "bonus", emoji: "🎁", titre: "Bonus & autres", provenance: "boosts constructeur, leads…", lignes: [
                { label: "Boosts constructeur / déstockage", montant: detail.prime_bonus_manuel },
                { label: "Lead Free Pro", montant: detail.prime_lead_free_pro },
                { label: "Migration ADSL → Fibre", montant: detail.prime_migration_adsl },
            ],
        },
    ];

    const avecMontant = familles
        .map((f) => ({ ...f, lignes: f.lignes.filter((l) => l.montant > 0), total: f.lignes.reduce((t, l) => t + l.montant, 0) }))
        .filter((f) => f.total > 0)
        .sort((a, b) => b.total - a.total);
    const total = avecMontant.reduce((t, f) => t + f.total, 0);
    const detailOuvert = avecMontant.find((f) => f.id === ouverte);

    // Mosaïque : une tuile par famille, triées par montant ; la première (la plus grosse) est mise
    // en avant sur deux colonnes. Le détail de la tuile choisie s'ouvre sous la mosaïque.
    return (
        <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-black text-slate-900">D&apos;où vient ta variable</h2>
                <p className="text-lg font-black tabular-nums text-violet-700">{fmtEuro(total)}</p>
            </div>
            {avecMontant.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Pas encore de montant ce mois-ci.</p>
            ) : (
                <>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {avecMontant.map((f, i) => {
                            const estOuverte = ouverte === f.id;
                            const part = total > 0 ? Math.round((f.total / total) * 100) : 0;
                            const premiere = i === 0;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setOuverte(estOuverte ? null : f.id)}
                                    aria-expanded={estOuverte}
                                    className={`rounded-2xl p-3.5 text-left transition-all ${premiere ? "col-span-2" : ""} ${
                                        estOuverte ? "bg-violet-600 text-white ring-2 ring-violet-300"
                                        : premiere ? "bg-violet-50 ring-1 ring-violet-200 hover:bg-violet-100"
                                        : "bg-slate-50 ring-1 ring-slate-100 hover:bg-slate-100"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-black ${estOuverte ? "text-white" : "text-slate-800"}`}>
                                            <span aria-hidden="true">{f.emoji}</span> {f.titre}
                                        </p>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${estOuverte ? "bg-white/20 text-white" : "bg-white text-violet-700"}`}>
                                            {part} %
                                        </span>
                                    </div>
                                    <p className={`mt-1.5 font-black tabular-nums ${premiere ? "text-3xl" : "text-xl"} ${estOuverte ? "text-white" : "text-slate-900"}`}>
                                        {fmtEuro(f.total)}
                                    </p>
                                    <p className={`mt-0.5 flex items-center justify-between gap-1 text-[11px] font-semibold ${estOuverte ? "text-white/75" : "text-slate-400"}`}>
                                        <span className="truncate">{f.provenance}</span>
                                        <ChevronDown size={13} className={`shrink-0 transition-transform ${estOuverte ? "rotate-180" : ""}`} />
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {detailOuvert && (
                        <div className="mt-3 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-violet-700">
                                {detailOuvert.emoji} {detailOuvert.titre} · détail
                            </p>
                            <ul className="space-y-1">
                                {detailOuvert.lignes.map((l, i) => (
                                    <li key={i} className="flex justify-between gap-3 text-sm">
                                        <span className="text-slate-600">{l.label}</span>
                                        <span className="font-black tabular-nums text-slate-900">{fmtEuro(l.montant)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

/**
 * "Déjà en route" : ce que les ventes de ce mois rapporteront plus tard (assurances à M+1, box
 * raccordées et 4P à M+2). Mêmes calculs que la page du mois de paiement concerné.
 */
export function DejaEnRoute({ conseillerId, mois, bareme }: { conseillerId: string; mois: string; bareme: BaremeVariable }) {
    const [data, setData] = useState<{ assurance: number; nbAssurance: number; box: number; nbBox: number; quatreP: number } | null>(null);

    useEffect(() => {
        if (!conseillerId) return;
        const m1 = moisPlus(mois, 1);
        const m2 = moisPlus(mois, 2);
        Promise.all([
            getContributionAssuranceMoisAffiche(conseillerId, m1, bareme).catch(() => null),
            getContributionBoxMoisPaiement(conseillerId, m2).catch(() => null),
            getContributionForfait4PMoisPaiement(conseillerId, m2).catch(() => null),
        ]).then(([a, b, f]) => {
            setData({
                assurance: (a?.montantNouveauMobile ?? 0) + (a?.montantEssentielle ?? 0),
                nbAssurance: (a?.nbNouveauMobile ?? 0) + (a?.nbEssentielle ?? 0),
                box: b?.total ?? 0,
                nbBox: b?.nbRaccordees ?? 0,
                quatreP: f?.montantTotal ?? 0,
            });
        });
    }, [conseillerId, mois, bareme]);

    const m1 = nomMois(moisPlus(mois, 1));
    const m2 = nomMois(moisPlus(mois, 2));
    const total = data ? data.assurance + data.box + data.quatreP : 0;

    return (
        <section className="rounded-[24px] bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200/70 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-black text-slate-900">🚚 Déjà en route</h2>
                {data && <p className="text-lg font-black tabular-nums text-amber-700">+{fmtEuro(total)}</p>}
            </div>
            <p className="text-xs font-semibold text-slate-500">Ce que tes ventes de ce mois te rapporteront plus tard.</p>
            {data && (
                <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex justify-between gap-3 rounded-xl bg-white/70 px-3 py-2">
                        <span className="text-slate-600">🛡️ {data.nbAssurance} assurance{data.nbAssurance > 1 ? "s" : ""} <span className="text-slate-400">· payé en {m1}</span></span>
                        <span className="font-black tabular-nums text-slate-900">{fmtEuro(data.assurance)}</span>
                    </li>
                    <li className="flex justify-between gap-3 rounded-xl bg-white/70 px-3 py-2">
                        <span className="text-slate-600">📦 {data.nbBox} box déjà raccordée{data.nbBox > 1 ? "s" : ""} <span className="text-slate-400">· payé en {m2}</span></span>
                        <span className="font-black tabular-nums text-slate-900">{fmtEuro(data.box)}</span>
                    </li>
                    {data.quatreP > 0 && (
                        <li className="flex justify-between gap-3 rounded-xl bg-white/70 px-3 py-2">
                            <span className="text-slate-600">🔀 4P sur forfait <span className="text-slate-400">· payé en {m2}</span></span>
                            <span className="font-black tabular-nums text-slate-900">{fmtEuro(data.quatreP)}</span>
                        </li>
                    )}
                </ul>
            )}
            <p className="mt-2 text-[11px] text-slate-400">Les box non encore raccordées seront comptées à leur raccordement.</p>
        </section>
    );
}
