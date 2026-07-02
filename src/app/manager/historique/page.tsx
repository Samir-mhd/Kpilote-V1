"use client";

import { useEffect, useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";

import { construireClassementPeriode, Periode } from "@/services/historiqueManager";
import { ConseillerClassement } from "@/services/classementManager";

type Produit = "tous" | "box" | "forfaits" | "telephones" | "mcafee" | "assurance";

const periodes: { label: string; valeur: Periode }[] = [
    { label: "Jour", valeur: "jour" },
    { label: "Semaine", valeur: "semaine" },
    { label: "Mois", valeur: "mois" },
];

const produits: { label: string; valeur: Produit }[] = [
    { label: "Tous les produits", valeur: "tous" },
    { label: "Box", valeur: "box" },
    { label: "Forfaits", valeur: "forfaits" },
    { label: "Téléphones", valeur: "telephones" },
    { label: "McAfee", valeur: "mcafee" },
    { label: "Assurance", valeur: "assurance" },
];

function trierParProduit(classement: ConseillerClassement[], produit: Produit) {
    if (produit === "tous") return classement;

    return [...classement].sort((a, b) => b[produit] - a[produit]);
}

export default function HistoriquePage() {
    const [periode, setPeriode] = useState<Periode>("jour");
    const [produit, setProduit] = useState<Produit>("tous");
    const [classement, setClassement] = useState<ConseillerClassement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let actif = true;

        setLoading(true);

        construireClassementPeriode(periode).then((data) => {
            if (actif) {
                setClassement(data);
                setLoading(false);
            }
        });

        return () => {
            actif = false;
        };
    }, [periode]);

    const classementAffiche = useMemo(
        () => trierParProduit(classement, produit),
        [classement, produit]
    );

    return (
        <main>
            <p className="text-slate-400 font-black uppercase tracking-[0.35em]">
                KPILOTE MANAGER
            </p>

            <h1 className="mt-4 text-5xl font-black text-slate-900">
                Historique
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-slate-500">
                Le classement de l'équipe sur la période de ton choix, filtrable par produit.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
                {periodes.map((item) => (
                    <button
                        key={item.valeur}
                        onClick={() => setPeriode(item.valeur)}
                        className={`rounded-2xl px-6 py-3 text-sm font-black transition-all ${
                            periode === item.valeur
                                ? "bg-slate-950 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                {produits.map((item) => (
                    <button
                        key={item.valeur}
                        onClick={() => setProduit(item.valeur)}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                            produit === item.valeur
                                ? "bg-violet-600 text-white"
                                : "bg-white text-slate-500 border border-slate-200 hover:border-violet-300"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mt-10">
                <Card>
                    <SectionTitle badge="Classement" titre="Performance de l'équipe" color="text-slate-600" />

                    {loading ? (
                        <p className="text-slate-500">Chargement...</p>
                    ) : classementAffiche.length === 0 ? (
                        <p className="text-slate-500">Aucune vente sur cette période.</p>
                    ) : (
                        <div className="space-y-4">
                            {classementAffiche.map((conseiller, index) => (
                                <div
                                    key={conseiller.id}
                                    className="flex items-center justify-between rounded-2xl bg-slate-100 p-5 hover:bg-slate-200 transition-all"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="text-4xl">
                                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                                        </div>

                                        <div>
                                            <p className="font-black text-2xl">{conseiller.prenom}</p>

                                            <p className="text-slate-500 mt-1">
                                                📦 {conseiller.box}
                                                {" • "}
                                                📱 {conseiller.forfaits}
                                                {" • "}
                                                📲 {conseiller.telephones}
                                                {" • "}
                                                🛡️ {conseiller.mcafee}
                                                {" • "}
                                                ✅ {conseiller.assurance}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-4xl font-black">
                                            {produit === "tous" ? conseiller.ventes : conseiller[produit]}
                                        </p>

                                        <p className="text-slate-500">
                                            {produit === "tous" ? "ventes" : produits.find((p) => p.valeur === produit)?.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </main>
    );
}
