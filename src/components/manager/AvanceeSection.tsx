"use client";

import AnneauObjectif, { etatAnneau } from "@/components/ui/AnneauObjectif";

export type AvanceeProduit = { code: string; label: string; emoji: string; realise: number; objectif: number };

/** Avancée équipe en anneaux — même code couleur que l'Accueil conseiller (bleu / vert / or). */
export default function AvanceeSection({ titre, badge, produits }: { titre: string; badge: string; produits: AvanceeProduit[] }) {
    // Canal+ ne compte pas dans le total (comme sur l'Accueil conseiller).
    const comptes       = produits.filter((p) => p.code !== "canal_plus");
    const totalRealise  = comptes.reduce((t, p) => t + p.realise, 0);
    const totalObjectif = comptes.reduce((t, p) => t + p.objectif, 0);
    const tauxGlobal    = totalObjectif > 0 ? Math.round((totalRealise / totalObjectif) * 100) : 0;
    const etat          = etatAnneau(totalRealise, totalObjectif);
    const avecObjectif  = produits.filter((p) => p.objectif > 0);
    const atteints      = avecObjectif.filter((p) => p.realise >= p.objectif).length;

    return (
        <div className="carte-accueil rounded-[24px] border-2 border-slate-900 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{badge}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900">{titre}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {avecObjectif.length > 0 && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{atteints} / {avecObjectif.length} atteints</span>
                    )}
                    <div className="text-right">
                        <p className={`text-3xl font-black tabular-nums ${etat === "depasse" ? "text-amber-500" : etat === "atteint" ? "text-emerald-600" : "text-blue-600"}`}>{tauxGlobal}%</p>
                        <p className="text-xs text-slate-400">{totalRealise} / {totalObjectif} ventes</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
                {produits.map((p) => (
                    <AnneauObjectif key={p.code} realise={p.realise} objectif={p.objectif} emoji={p.emoji} label={p.label} />
                ))}
            </div>
        </div>
    );
}
