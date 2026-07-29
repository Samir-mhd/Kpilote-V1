"use client";

import { couleurTaux } from "@/utils/periodes";
import type { ProduitCode } from "@/utils/produits";

export type AvanceeProduit = { code: ProduitCode; label: string; emoji: string; realise: number; objectif: number };

export default function AvanceeSection({ titre, badge, produits }: { titre: string; badge: string; produits: AvanceeProduit[] }) {
    const totalRealise  = produits.reduce((t, p) => t + p.realise, 0);
    const totalObjectif = produits.reduce((t, p) => t + p.objectif, 0);
    const tauxGlobal     = totalObjectif > 0 ? Math.round((totalRealise / totalObjectif) * 100) : 0;
    const couleurGlobal  = couleurTaux(totalRealise, totalObjectif);

    return (
        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{badge}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900">{titre}</h3>
                </div>
                <div className="text-right">
                    <p className={`text-3xl font-black ${couleurGlobal.text}`}>{tauxGlobal}%</p>
                    <p className="text-xs text-slate-400">{totalRealise} / {totalObjectif} ventes</p>
                </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${couleurGlobal.bar}`}
                    style={{ width: `${Math.min(tauxGlobal, 100)}%` }}
                />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {produits.map((p) => {
                    const taux = p.objectif > 0 ? Math.round((p.realise / p.objectif) * 100) : 0;
                    const cp = couleurTaux(p.realise, p.objectif);
                    return (
                        <div key={p.code} className={`rounded-2xl border p-4 ${cp.bg} ${cp.border}`}>
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">{p.emoji}</span>
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{p.label}</span>
                            </div>
                            <p className={`mt-2 text-2xl font-black ${cp.text}`}>{p.realise}<span className="text-sm font-normal text-slate-400">/{p.objectif}</span></p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
                                <div className={`h-full rounded-full ${cp.bar}`} style={{ width: `${Math.min(taux, 100)}%` }} />
                            </div>
                            <p className={`mt-1 text-right text-xs font-black ${cp.text}`}>{taux}%</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
