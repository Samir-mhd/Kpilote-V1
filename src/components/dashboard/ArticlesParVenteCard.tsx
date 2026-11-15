"use client";

import { Info } from "lucide-react";
import { StatsTransactionsMois } from "@/services/ventesTransactions";

const PRODUITS_COMPTES = "Box, forfait, téléphone, McAfee (produit + mobile), assurance (nouveau mobile + essentielle)";

function fmt(n: number, decimales = 0) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/**
 * Articles par vente (mois en cours) : moyenne et part de ventes combo en chiffres clés, puis la
 * répartition 1 / 2 / 3 / 4 / 5+ articles en barres horizontales libellées. Une seule
 * distinction de couleur : vente solo (gris) vs vente combo (sarcelle) — chaque ligne porte
 * aussi son libellé, la couleur n'est jamais seule à porter l'information.
 */
export default function ArticlesParVenteCard({ stats, sombre = false }: { stats: StatsTransactionsMois; sombre?: boolean }) {
    const lignes = [1, 2, 3, 4, 5].map((n) => ({ n, val: stats.parNbArticles[n] ?? 0 }));
    const total = stats.totalVentes;
    const max = Math.max(...lignes.map((l) => l.val), 1);
    const tauxCombo = total > 0 ? Math.round((stats.totalCombo / total) * 100) : 0;

    // Levier concret : 1 vente solo sur 5 transformée en vente à 2 articles.
    const solo = stats.parNbArticles[1] ?? 0;
    const gain = Math.round(solo * 0.2);
    const moyenneCible = total > 0 ? (stats.moyenneArticles * total + gain) / total : 0;

    const c = sombre
        ? { fond: "bg-slate-900", titre: "text-white", sous: "text-white/45", chiffre: "text-white", label: "text-white/60", piste: "bg-white/[0.06]", solo: "bg-slate-600", combo: "bg-teal-600", bord: "border-white/10", astuce: "bg-teal-400/10 text-teal-100" }
        : { fond: "bg-white", titre: "text-slate-900", sous: "text-slate-400", chiffre: "text-slate-900", label: "text-slate-600", piste: "bg-slate-100", solo: "bg-slate-300", combo: "bg-teal-600", bord: "border-slate-100", astuce: "bg-teal-50 text-teal-900" };

    return (
        <section className={`rounded-[24px] p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6 ${c.fond}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className={`text-base font-black ${c.titre}`}>🛒 Articles par vente</h2>
                    <p className={`text-xs font-semibold ${c.sous}`}>Ce mois-ci</p>
                </div>
                <span title={`Articles comptés : ${PRODUITS_COMPTES}`} className={`flex h-7 w-7 items-center justify-center rounded-full ${c.sous}`} aria-label={`Articles comptés : ${PRODUITS_COMPTES}`}>
                    <Info size={16} />
                </span>
            </div>

            {total === 0 ? (
                <p className={`py-6 text-center text-sm ${c.sous}`}>Pas encore de vente ce mois-ci.</p>
            ) : (
                <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr] md:items-center">
                    {/* Chiffres clés */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                        <div>
                            <p className={`text-4xl font-black leading-none tabular-nums ${c.chiffre}`}>{fmt(stats.moyenneArticles, 2)}</p>
                            <p className={`mt-1 text-xs font-semibold ${c.sous}`}>articles en moyenne par vente</p>
                        </div>
                        <div>
                            <p className={`text-4xl font-black leading-none tabular-nums ${c.chiffre}`}>{tauxCombo} %</p>
                            <p className={`mt-1 text-xs font-semibold ${c.sous}`}>
                                de ventes combo · {stats.totalCombo} sur {total}
                            </p>
                        </div>
                    </div>

                    {/* Répartition */}
                    <div className="space-y-2">
                        {lignes.map(({ n, val }) => {
                            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                            const libelle = `${n}${n === 5 ? "+" : ""} article${n > 1 ? "s" : ""}`;
                            return (
                                <div key={n} className="flex items-center gap-3" title={`${libelle} : ${val} vente${val > 1 ? "s" : ""} (${pct} %)`}>
                                    <span className={`w-20 shrink-0 text-xs font-bold ${c.label}`}>
                                        {libelle}
                                    </span>
                                    <div className={`h-3 flex-1 rounded ${c.piste}`}>
                                        {val > 0 && (
                                            <div
                                                className={`h-full rounded ${n === 1 ? c.solo : c.combo} transition-all duration-700`}
                                                style={{ width: `${Math.max((val / max) * 100, 2)}%` }}
                                            />
                                        )}
                                    </div>
                                    <span className={`w-16 shrink-0 text-right text-xs tabular-nums ${c.label}`}>
                                        <span className={`font-black ${c.chiffre}`}>{val}</span> · {pct} %
                                    </span>
                                </div>
                            );
                        })}
                        <div className={`flex items-center gap-4 pt-1 text-[11px] font-semibold ${c.sous}`}>
                            <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${c.solo}`} />Vente solo</span>
                            <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${c.combo}`} />Vente combo (2 articles et +)</span>
                        </div>
                    </div>
                </div>
            )}

            {total > 0 && gain > 0 && (
                <p className={`mt-4 rounded-2xl px-4 py-2.5 text-xs font-semibold ${c.astuce}`}>
                    💡 Si 1 vente solo sur 5 devenait une vente à 2 articles, ta moyenne passerait de {fmt(stats.moyenneArticles, 2)} à <span className="font-black">{fmt(moyenneCible, 2)}</span>.
                </p>
            )}
        </section>
    );
}
