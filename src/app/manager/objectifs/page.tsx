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
import { getJoursTravailTous } from "@/services/planningService";
import { exporterObjectifsPDF } from "@/utils/exportObjectifsPDF";
import Link from "next/link";

const PRODUITS_MANUELS = [
    { label: "Box",        code: "box",        emoji: "📦", accent: "#10b981" },
    { label: "Forfaits",   code: "forfaits",   emoji: "📱", accent: "#3b82f6" },
    { label: "Téléphones", code: "telephones", emoji: "📲", accent: "#8b5cf6" },
    { label: "McAfee",     code: "mcafee",     emoji: "🔒", accent: "#f97316" },
    { label: "Assurance",  code: "assurance",  emoji: "🛡️", accent: "#ef4444" },
];

const colonnesProduits = [
    ...PRODUITS_MANUELS.map((p) => ({ label: p.label, code: p.code })),
    { label: "Spiderhome", code: "spiderhome", auto: true },
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
        if (code) ligne.cellules[code] = { id: row.id, objectif: row.objectif };
    });

    return Array.from(lignes.values()).sort((a, b) => a.nom.localeCompare(b.nom));
}

export default function ObjectifsPage() {
    const [rows, setRows]                         = useState<ObjectifManagerRow[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [edits, setEdits]                       = useState<Record<string, number>>({});
    const [enregistrement, setEnregistrement]     = useState(false);
    const [confirmation, setConfirmation]         = useState<string | null>(null);
    const [joursPlanifies, setJoursPlanifies]     = useState<Record<string, number>>({});
    const [coeff, setCoeff]                       = useState(25);

    useEffect(() => {
        const stored = localStorage.getItem("spiderhome_coeff");
        if (stored) setCoeff(Math.max(1, Number(stored) || 25));
    }, []);

    async function charger() {
        setLoading(true);
        const data = await getObjectifsManager();

        const ids = [...new Set(data.map((r) => r.conseiller_id))];
        const now = new Date();
        const jours = ids.length > 0
            ? await getJoursTravailTous(ids, now.getFullYear(), now.getMonth() + 1)
            : {};

        setRows(data);
        setJoursPlanifies(jours);
        setEdits({});
        setLoading(false);
    }

    useEffect(() => { charger(); }, []);

    function handleCoeff(val: number) {
        const v = Math.max(1, Math.min(999, isNaN(val) ? 25 : val));
        setCoeff(v);
        localStorage.setItem("spiderhome_coeff", String(v));
    }

    if (loading) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center text-slate-400 font-semibold">
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
                Object.entries(edits).map(([id, objectif]) => updateObjectifMensuel(id, objectif))
            );
            setConfirmation("Objectifs mis à jour avec succès.");
            await charger();
        } finally {
            setEnregistrement(false);
        }
    }

    function handleExportPDF() {
        const lignesAvecSpider = lignes.map((l) => ({
            ...l,
            cellules: {
                ...l.cellules,
                spiderhome: {
                    id: l.cellules["spiderhome"]?.id ?? "",
                    objectif: coeff * (joursPlanifies[l.conseillerId] ?? 0),
                },
            },
        }));
        exporterObjectifsPDF(lignesAvecSpider, colonnesProduits);
    }

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">
                KPILOTE MANAGER
            </p>

            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Objectifs</h1>
                    <p className="mt-4 max-w-2xl text-lg text-slate-500">
                        Saisis ou ajuste les objectifs mensuels de chaque conseiller, produit par produit.
                    </p>
                </div>

                {lignes.length > 0 && (
                    <button
                        onClick={handleExportPDF}
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
                    {/* ── Titre + réglage Spiderhome ── */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <SectionTitle
                            badge="Objectifs mensuels"
                            titre="Par conseiller et par produit"
                            color="text-emerald-600"
                        />

                        {/* Coefficient journalier Spiderhome */}
                        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
                            <span className="text-xl">🏠</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 mb-1">
                                    Objectif / jour Spiderhome
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={999}
                                        value={coeff}
                                        onChange={(e) => handleCoeff(Number(e.target.value))}
                                        className="w-16 rounded-xl border border-sky-300 bg-white px-2 py-1.5 text-center text-xl font-black text-sky-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                    />
                                    <span className="text-sm font-semibold text-sky-500">× jours planifiés</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {lignes.length === 0 ? (
                        <p className="mt-6 text-slate-500">Aucun objectif enregistré pour le moment.</p>
                    ) : (
                        <div className="mt-8 space-y-4">
                            {lignes.map((ligne) => {
                                const jours = joursPlanifies[ligne.conseillerId] ?? 0;
                                return (
                                    <div
                                        key={ligne.conseillerId}
                                        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                                    >
                                        {/* Header conseiller */}
                                        <div className="flex items-center justify-between gap-4 bg-slate-50 border-b border-slate-100 px-5 py-3.5">
                                            <h3 className="text-lg font-black text-slate-800">
                                                {ligne.nom}
                                            </h3>
                                            <Link
                                                href={`/manager/entretien/${ligne.conseillerId}`}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-600 transition-all hover:border-violet-400 hover:bg-violet-100 active:scale-95"
                                            >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                </svg>
                                                Bilan
                                            </Link>
                                        </div>

                                        {/* Grille produits */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 divide-x divide-slate-100">
                                            {PRODUITS_MANUELS.map((prod) => {
                                                const cellule = ligne.cellules[prod.code];
                                                return (
                                                    <div key={prod.code} className="flex flex-col gap-2.5 p-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm">{prod.emoji}</span>
                                                            <span
                                                                className="text-[10px] font-black uppercase tracking-wide"
                                                                style={{ color: prod.accent }}
                                                            >
                                                                {prod.label}
                                                            </span>
                                                        </div>
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
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center text-2xl font-black text-slate-800 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-50 transition-all"
                                                            />
                                                        ) : (
                                                            <div className="text-center text-2xl font-black text-slate-200">—</div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Spiderhome auto */}
                                            <div className="flex flex-col gap-2.5 p-4 bg-gradient-to-b from-sky-50/60 to-transparent">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm">🏠</span>
                                                    <span className="text-[10px] font-black uppercase tracking-wide text-sky-500">
                                                        Spiderhome
                                                    </span>
                                                    <span className="ml-auto rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-black text-sky-600">
                                                        Auto
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center justify-center flex-1 rounded-xl bg-sky-50 border border-sky-100 py-2">
                                                    <span className="text-2xl font-black text-sky-700 tabular-nums">
                                                        {coeff * jours}
                                                    </span>
                                                    <span className="text-[10px] text-sky-400 mt-0.5">
                                                        {coeff} × {jours} j
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

            {lignes.length > 0 && (
                <div className="mt-8">
                    <PlanningCalendrier
                        conseillers={lignes.map((l) => ({ id: l.conseillerId, nom: l.nom }))}
                    />
                </div>
            )}

            {lignes.length > 0 && (
                <div className="mt-8">
                    <ResetVentesCard
                        conseillers={lignes.map((l) => ({ id: l.conseillerId, nom: l.nom }))}
                    />
                </div>
            )}
        </main>
    );
}
