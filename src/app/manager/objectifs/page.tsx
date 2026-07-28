"use client";

import { useEffect, useState } from "react";

import ObjectifsBoutiqueCard from "@/components/manager/ObjectifsBoutiqueCard";
import { getObjectifsBoutique } from "@/services/objectifs";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { periodeSemaineEffective, couleurTaux } from "@/utils/periodes";
import type { ProduitCode } from "@/utils/produits";

const PRODUITS_SUIVIS: { label: string; code: ProduitCode; emoji: string }[] = [
    { label: "Box",        code: "box",        emoji: "📦" },
    { label: "Forfaits",   code: "forfaits",   emoji: "📱" },
    { label: "Téléphones", code: "telephones", emoji: "📲" },
    { label: "McAfee",     code: "mcafee",     emoji: "🔒" },
    { label: "Assurance",  code: "assurance",  emoji: "🛡️" },
];

function sommeParProduit(stats: ConseillerStats[], code: ProduitCode): number {
    return stats.reduce((t, c) => t + (c.produits[code] ?? 0), 0);
}

type AvanceeProduit = { code: ProduitCode; label: string; emoji: string; realise: number; objectif: number };

function AvanceeSection({ titre, badge, produits }: { titre: string; badge: string; produits: AvanceeProduit[] }) {
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

export default function ObjectifsBoutiquePage() {
    const [loading, setLoading]             = useState(true);
    const [semaineData, setSemaineData]     = useState<AvanceeProduit[]>([]);
    const [moisData, setMoisData]           = useState<AvanceeProduit[]>([]);

    async function chargerAvancee() {
        setLoading(true);
        try {
            const [statsSemaine, statsMois, objMoisRows] = await Promise.all([
                construireClassementPeriode("semaine"),
                construireClassementPeriode("mois"),
                getObjectifsBoutique(),
            ]);

            const objMoisMap: Record<string, number> = {};
            objMoisRows.forEach((r: any) => {
                const code = r.produits?.code;
                if (code) objMoisMap[code] = r.objectif ?? 0;
            });

            const ids = statsMois.map((c) => c.id);
            const { debut, fin } = periodeSemaineEffective();
            const figes = ids.length > 0 ? await getObjectifsSemaineFiges(ids, debut, fin).catch(() => ({})) : {};

            const objSemaineMap: Record<string, number> = {};
            PRODUITS_SUIVIS.forEach((p) => {
                objSemaineMap[p.code] = ids.reduce((t, id) => t + ((figes as any)[id]?.[p.code] ?? 0), 0);
            });

            setSemaineData(PRODUITS_SUIVIS.map((p) => ({
                ...p,
                realise: sommeParProduit(statsSemaine, p.code),
                objectif: objSemaineMap[p.code] ?? 0,
            })));
            setMoisData(PRODUITS_SUIVIS.map((p) => ({
                ...p,
                realise: sommeParProduit(statsMois, p.code),
                objectif: objMoisMap[p.code] ?? 0,
            })));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { chargerAvancee(); }, []);

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">
                KPILOTE MANAGER
            </p>

            <div className="mt-4">
                <h1 className="text-5xl font-black text-slate-900">Objectifs boutique</h1>
                <p className="mt-4 max-w-2xl text-lg text-slate-500">
                    Cible mensuelle de la boutique, indépendante des conseillers, et avancée réelle sur la semaine et le mois.
                </p>
            </div>

            <div className="mt-8">
                <ObjectifsBoutiqueCard />
            </div>

            <div className="mt-8 space-y-6">
                {loading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    </div>
                ) : (
                    <>
                        <AvanceeSection titre="Avancée de la semaine" badge="Semaine en cours" produits={semaineData} />
                        <AvanceeSection titre="Avancée du mois" badge="Mois en cours" produits={moisData} />
                    </>
                )}
            </div>
        </main>
    );
}
