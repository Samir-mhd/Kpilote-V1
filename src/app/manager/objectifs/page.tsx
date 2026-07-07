"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import PlanningCalendrier from "@/components/manager/PlanningCalendrier";
import ResetVentesCard from "@/components/manager/ResetVentesCard";
import ObjectifsBoutiqueCard from "@/components/manager/ObjectifsBoutiqueCard";

import {
    getObjectifsManager,
    updateObjectifMensuel,
    ObjectifManagerRow,
} from "@/services/objectifs";
import { exporterObjectifsPDF } from "@/utils/exportObjectifsPDF";
import Link from "next/link";

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

            <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Objectifs</h1>
                    <p className="mt-4 max-w-2xl text-lg text-slate-500">
                        Saisis ou ajuste les objectifs mensuels de chaque conseiller, produit par produit.
                    </p>
                </div>

                {lignes.length > 0 && (
                    <button
                        onClick={() => exporterObjectifsPDF(lignes, colonnesProduits)}
                        className="group flex flex-shrink-0 items-center gap-2.5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-3 text-sm font-black text-violet-700 shadow-sm transition-all hover:border-violet-400 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md active:scale-[0.97]"
                    >
                        <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/>
                            <polyline points="9 15 12 18 15 15"/>
                        </svg>
                        Exporter PDF
                    </button>
                )}
            </div>

            {/* ── Objectifs Boutique ── */}
            <div className="mt-8">
                <ObjectifsBoutiqueCard />
            </div>

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
                                        <th className="px-4 pb-2 text-center">Bilan</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {lignes.map((ligne) => (
                                        <tr key={ligne.conseillerId} className="bg-slate-100 align-middle">
                                            <td className="rounded-l-2xl px-4 py-4 text-lg font-black text-slate-800">
                                                {ligne.nom}
                                            </td>

                                            {colonnesProduits.map((colonne) => {
                                                const cellule = ligne.cellules[colonne.code];

                                                return (
                                                    <td
                                                        key={colonne.code}
                                                        className="px-4 py-4 text-center"
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
                                            <td className="rounded-r-2xl px-4 py-4 text-center">
                                                <Link
                                                    href={`/manager/entretien/${ligne.conseillerId}`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-600 transition-all hover:border-violet-400 hover:bg-violet-100"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                        <polyline points="14 2 14 8 20 8"/>
                                                    </svg>
                                                    Bilan
                                                </Link>
                                            </td>
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
