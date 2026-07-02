"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import PlanningCalendrier from "@/components/manager/PlanningCalendrier";
import ResetVentesCard from "@/components/manager/ResetVentesCard";

import {
    getObjectifsManager,
    updateObjectifMensuel,
    ObjectifManagerRow,
} from "@/services/objectifs";

const colonnesProduits: { label: string; code: string }[] = [
    { label: "Box", code: "box" },
    { label: "Forfaits", code: "forfaits" },
    { label: "Téléphones", code: "telephones" },
    { label: "McAfee", code: "mcafee" },
    { label: "Assurance", code: "assurance" },
];

type LigneConseiller = {
    conseillerId: string;
    nom: string;
    cellules: Record<string, { id: string; objectif: number } | undefined>;
};

function regrouperParConseiller(rows: ObjectifManagerRow[]): LigneConseiller[] {
    const lignes = new Map<string, LigneConseiller>();

    rows.forEach((row) => {
        if (!lignes.has(row.conseiller_id)) {
            lignes.set(row.conseiller_id, {
                conseillerId: row.conseiller_id,
                nom: row.conseillers?.nom ?? "Conseiller",
                cellules: {},
            });
        }

        const ligne = lignes.get(row.conseiller_id)!;
        const code = row.produits?.code;

        if (code) {
            ligne.cellules[code] = { id: row.id, objectif: row.objectif };
        }
    });

    return Array.from(lignes.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}

export default function ObjectifsPage() {
    const [rows, setRows] = useState<ObjectifManagerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [edits, setEdits] = useState<Record<string, number>>({});
    const [enregistrement, setEnregistrement] = useState(false);
    const [confirmation, setConfirmation] = useState<string | null>(null);

    async function charger() {
        setLoading(true);
        const data = await getObjectifsManager();
        setRows(data);
        setEdits({});
        setLoading(false);
    }

    useEffect(() => {
        charger();
    }, []);

    if (loading) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center">
                Chargement...
            </main>
        );
    }

    const lignes = regrouperParConseiller(rows);
    const aDesModifications = Object.keys(edits).length > 0;

    async function handleEnregistrer() {
        setEnregistrement(true);

        try {
            await Promise.all(
                Object.entries(edits).map(([id, objectif]) =>
                    updateObjectifMensuel(id, objectif)
                )
            );

            setConfirmation("Objectifs mis à jour avec succès.");
            await charger();
        } finally {
            setEnregistrement(false);
        }
    }

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">
                KPILOTE MANAGER
            </p>

            <h1 className="mt-4 text-5xl font-black text-slate-900">
                Objectifs
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-slate-500">
                Saisis ou ajuste les objectifs mensuels de chaque conseiller, produit par produit.
            </p>

            {confirmation && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                    {confirmation}
                </div>
            )}

            <div className="mt-10">
                <Card>
                    <SectionTitle badge="Objectifs mensuels" titre="Par conseiller et par produit" color="text-emerald-600" />

                    {lignes.length === 0 ? (
                        <p className="text-slate-500">Aucun objectif enregistré pour le moment.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-3">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                                        <th className="px-4 pb-2">Conseiller</th>
                                        {colonnesProduits.map((colonne) => (
                                            <th key={colonne.code} className="px-4 pb-2 text-center">
                                                {colonne.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {lignes.map((ligne) => (
                                        <tr key={ligne.conseillerId} className="bg-slate-100 align-middle">
                                            <td className="rounded-l-2xl px-4 py-4 text-lg font-black text-slate-800">
                                                {ligne.nom}
                                            </td>

                                            {colonnesProduits.map((colonne, index) => {
                                                const cellule = ligne.cellules[colonne.code];
                                                const estDerniere = index === colonnesProduits.length - 1;

                                                return (
                                                    <td
                                                        key={colonne.code}
                                                        className={`px-4 py-4 text-center ${estDerniere ? "rounded-r-2xl" : ""}`}
                                                    >
                                                        {cellule ? (
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                defaultValue={cellule.objectif}
                                                                onChange={(e) =>
                                                                    setEdits((prev) => ({
                                                                        ...prev,
                                                                        [cellule.id]: Number(e.target.value),
                                                                    }))
                                                                }
                                                                className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-lg font-black text-slate-800 outline-none focus:border-emerald-500"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button
                        onClick={handleEnregistrer}
                        disabled={!aDesModifications || enregistrement}
                        className="btn-premium mt-8 rounded-2xl px-8 py-4 text-lg font-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
                    </button>
                </Card>
            </div>

            {/* ── Calendrier des présences ── */}
            {lignes.length > 0 && (
                <div className="mt-8">
                    <PlanningCalendrier
                        conseillers={lignes.map((l) => ({
                            id: l.conseillerId,
                            nom: l.nom,
                        }))}
                    />
                </div>
            )}

            {/* ── Réinitialisation des ventes ── */}
            {lignes.length > 0 && (
                <div className="mt-8">
                    <ResetVentesCard
                        conseillers={lignes.map((l) => ({
                            id: l.conseillerId,
                            nom: l.nom,
                        }))}
                    />
                </div>
            )}

        </main>
    );
}
