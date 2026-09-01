"use client";

import { useEffect, useState } from "react";

import ObjectifsBoutiqueCard from "@/components/manager/ObjectifsBoutiqueCard";
import { getObjectifsBoutique } from "@/services/objectifs";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { periodeSemaineEffective } from "@/utils/periodes";
import type { ProduitCode } from "@/utils/produits";
import AvanceeSection, { AvanceeProduit } from "@/components/manager/AvanceeSection";

const PRODUITS_SUIVIS: { label: string; code: ProduitCode; emoji: string }[] = [
    { label: "Box",        code: "box",        emoji: "📦" },
    { label: "Forfaits",   code: "forfaits",   emoji: "📱" },
    { label: "Téléphones", code: "telephones", emoji: "📲" },
    { label: "McAfee",     code: "mcafee",     emoji: "🔒" },
    { label: "Assurance",  code: "assurance",  emoji: "🛡️" },
    { label: "Avis Google", code: "avis_google", emoji: "⭐" },
];

function sommeParProduit(stats: ConseillerStats[], code: ProduitCode): number {
    return stats.reduce((t, c) => t + (c.produits[code] ?? 0), 0);
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
