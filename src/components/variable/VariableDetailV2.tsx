"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DetailVariable, BaremeVariable, VenteConseiller, ContributionAssurance, getContributionAssuranceMoisAffiche } from "@/services/variableConseiller";
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
/** Couleur fixe par famille (barre découpée + pastille de légende). */
const COULEURS_FAMILLE: Record<string, string> = {
    smartphones: "#7c3aed", forfaits: "#2563eb", box: "#059669", "4p": "#d97706",
    assurances: "#0891b2", options: "#db2777", qualite: "#ca8a04", bonus: "#64748b",
};
type Famille = { id: string; emoji: string; titre: string; provenance: string; lignes: Ligne[] };

/**
 * "D'où vient ta variable" : le détail regroupé par famille, une barre par famille (part du
 * total), chaque famille dépliable. Une seule couleur : la barre dit "combien", le libellé dit "quoi".
 */
export function CompositionVariable({
    detail, contributionBox, contributionForfait4P, contributionAssurance, moisVenteBox, moisVenteAssurance, ventes,
}: {
    detail: DetailVariable;
    /** Volumes du mois, pour afficher les quantités dans le détail. */
    ventes?: VenteConseiller;
    contributionBox: ContributionBoxMoisPaiement | null;
    contributionForfait4P: ContributionForfait4P | null;
    contributionAssurance: ContributionAssurance | null;
    moisVenteBox: string;
    moisVenteAssurance: string;
}) {
    const [detailVisible, setDetailVisible] = useState(false);
    const cb = contributionBox;
    const familles: Famille[] = [
        {
            id: "forfaits", emoji: "📶", titre: "Forfaits", provenance: "vendus ce mois-ci", lignes: [
                { label: ventes ? `Prime forfait — ${ventes.forfait_free_serie} Free / Série Free · ${ventes.forfait_free_max} Free Max` : "Prime forfait", montant: detail.prime_forfait },
                { label: "Boost individuel forfait", montant: detail.boost_individuel_forfait },
                { label: "Boost collectif forfait", montant: detail.boost_collectif_forfait },
                { label: "Up-sell forfait (migration)", montant: detail.prime_migration_forfait },
            ],
        },
        {
            id: "smartphones", emoji: "📲", titre: "Smartphones", provenance: "vendus ce mois-ci", lignes: [
                { label: ventes ? `Prime smartphone — ${ventes.smartphones} smartphone${ventes.smartphones > 1 ? "s" : ""}` : "Prime smartphone", montant: detail.prime_smartphone },
                { label: "Boost individuel smartphone", montant: detail.boost_individuel_smartphone },
                { label: "Boost collectif smartphone", montant: detail.boost_collectif_smartphone },
            ],
        },
        {
            id: "box", emoji: "💻", titre: "Box", provenance: `vendues en ${nomMois(moisVenteBox)}, raccordées`, lignes: [
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
            id: "options", emoji: "📺", titre: "McAfee & Canal+", provenance: `vendus en ${nomMois(moisVenteBox)}`, lignes: [
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

    // Barre découpée par famille (couleur fixe par famille, toujours accompagnée de son libellé),
    // puis une ligne par famille. Un clic sur la carte déplie le détail de toutes les familles.
    return (
        <section
            role="button"
            tabIndex={0}
            aria-expanded={detailVisible}
            onClick={() => setDetailVisible((v) => !v)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailVisible((v) => !v); } }}
            className={`cursor-pointer rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] transition-all hover:shadow-[0_8px_30px_rgba(15,23,42,.12)] sm:p-6 ${detailVisible ? "ring-2 ring-violet-300" : "ring-1 ring-slate-200"}`}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-slate-900">D&apos;où viennent tes {fmtEuro(total)}</h2>
                {avecMontant.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                        {detailVisible ? "Masquer le détail" : "Voir le détail"}
                        <ChevronDown size={13} className={`transition-transform ${detailVisible ? "rotate-180" : ""}`} />
                    </span>
                )}
            </div>
            {avecMontant.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Pas encore de montant ce mois-ci.</p>
            ) : (
                <>
                    <div className="mt-4 flex h-4 gap-[2px] overflow-hidden rounded-full">
                        {avecMontant.map((f) => (
                            <div key={f.id} style={{ width: `${(f.total / total) * 100}%`, background: COULEURS_FAMILLE[f.id] ?? "#64748b" }} title={`${f.titre} : ${fmtEuro(f.total)}`} />
                        ))}
                    </div>
                    <div className={`mt-4 ${detailVisible ? "space-y-3" : "space-y-2.5"}`}>
                        {avecMontant.map((f) => (
                            <div key={f.id}>
                                <div className="flex items-center gap-3">
                                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COULEURS_FAMILLE[f.id] ?? "#64748b" }} />
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                                        <span aria-hidden="true">{f.emoji}</span> {f.titre} <span className="text-xs font-semibold text-slate-400">· {f.provenance}</span>
                                    </span>
                                    <span className="text-xs font-bold tabular-nums text-slate-400">{Math.round((f.total / total) * 100)} %</span>
                                    <span className="w-24 text-right text-sm font-black tabular-nums text-slate-900">{fmtEuro(f.total)}</span>
                                </div>
                                {detailVisible && (
                                    <ul className="ml-6 mt-1.5 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-100">
                                        {f.lignes.map((l, i) => (
                                            <li key={i} className="flex items-center justify-between gap-3 py-1 text-[13px]">
                                                <span className="font-semibold text-slate-600">{l.label}</span>
                                                <span className="font-bold tabular-nums text-slate-700">{fmtEuro(l.montant)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
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
                        <span className="text-slate-600">💻 {data.nbBox} box déjà raccordée{data.nbBox > 1 ? "s" : ""} <span className="text-slate-400">· payé en {m2}</span></span>
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
