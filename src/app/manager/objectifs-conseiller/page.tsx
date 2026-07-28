"use client";

import { useEffect, useState } from "react";

import PlanningCalendrier from "@/components/manager/PlanningCalendrier";
import ResetVentesCard from "@/components/manager/ResetVentesCard";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

import {
    getObjectifsManager,
    updateObjectifMensuel,
    ObjectifManagerRow,
} from "@/services/objectifs";
import { getJoursTravailTous, getJoursTravailSemaineTous } from "@/services/planningService";
import { exporterObjectifsPDF, exporterObjectifsSemainePDF } from "@/utils/exportObjectifsPDF";
import { periodeSemaineEffective } from "@/utils/periodes";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import type { ProduitCode } from "@/utils/produits";
import Link from "next/link";

const PRODUITS_MANUELS = [
    { label: "Box",        code: "box",        emoji: "📦", text: "text-emerald-600", bg: "bg-emerald-50/70", border: "border-emerald-100", focus: "focus:border-emerald-400 focus:ring-emerald-100" },
    { label: "Forfaits",   code: "forfaits",   emoji: "📱", text: "text-blue-600",    bg: "bg-blue-50/70",    border: "border-blue-100",    focus: "focus:border-blue-400 focus:ring-blue-100" },
    { label: "Téléphones", code: "telephones", emoji: "📲", text: "text-violet-600",  bg: "bg-violet-50/70",  border: "border-violet-100",  focus: "focus:border-violet-400 focus:ring-violet-100" },
    { label: "McAfee",     code: "mcafee",     emoji: "🔒", text: "text-orange-600",  bg: "bg-orange-50/70",  border: "border-orange-100",  focus: "focus:border-orange-400 focus:ring-orange-100" },
    { label: "Assurance",  code: "assurance",  emoji: "🛡️", text: "text-red-600",     bg: "bg-red-50/70",     border: "border-red-100",     focus: "focus:border-red-400 focus:ring-red-100" },
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

export default function ObjectifsConseillerPage() {
    const [rows, setRows]                         = useState<ObjectifManagerRow[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [edits, setEdits]                       = useState<Record<string, number>>({});
    const [enregistrement, setEnregistrement]     = useState(false);
    const [confirmation, setConfirmation]         = useState<string | null>(null);
    const [joursPlanifies, setJoursPlanifies]     = useState<Record<string, number>>({});
    const [coeff, setCoeff]                       = useState(25);
    const [photos, setPhotos]                     = useState<Record<string, string | null>>({});

    useEffect(() => {
        const stored = localStorage.getItem("spiderhome_coeff");
        if (stored) setCoeff(Math.max(1, Number(stored) || 25));
    }, []);

    async function charger() {
        setLoading(true);
        const data = await getObjectifsManager();

        const ids = [...new Set(data.map((r) => r.conseiller_id))];
        const now = new Date();
        const [jours, avs] = await Promise.all([
            ids.length > 0 ? getJoursTravailTous(ids, now.getFullYear(), now.getMonth() + 1) : Promise.resolve({}),
            ids.length > 0 ? getPhotosByIds(ids).catch(() => ({})) : Promise.resolve({}),
        ]);

        setRows(data);
        setJoursPlanifies(jours);
        setPhotos(avs);
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
            photoUrl: photos[l.conseillerId] ?? null,
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

    async function handleExportSemainePDF() {
        // Semaine tronquée aux bornes du mois : ne chevauche jamais un changement de mois.
        const { debut, fin } = periodeSemaineEffective();
        const ids = lignes.map((l) => l.conseillerId);
        const [joursSemaine, objSemaine] = await Promise.all([
            getJoursTravailSemaineTous(ids, debut, fin),
            getObjectifsSemaineFiges(ids, debut, fin),
        ]);

        const lignesSemaine = lignes.map((l) => {
            const cellules: LigneConseiller["cellules"] = {};
            PRODUITS_MANUELS.forEach((p) => {
                const cellule = l.cellules[p.code];
                if (cellule) {
                    cellules[p.code] = {
                        id: cellule.id,
                        objectif: objSemaine[l.conseillerId]?.[p.code as ProduitCode] ?? 0,
                    };
                }
            });
            cellules["spiderhome"] = {
                id: l.cellules["spiderhome"]?.id ?? "",
                objectif: coeff * (joursSemaine[l.conseillerId] ?? 0),
            };
            return { ...l, cellules, photoUrl: photos[l.conseillerId] ?? null };
        });

        exporterObjectifsSemainePDF(lignesSemaine, colonnesProduits, debut, fin);
    }

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">
                KPILOTE MANAGER
            </p>

            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Objectifs conseiller</h1>
                    <p className="mt-4 max-w-2xl text-lg text-slate-500">
                        Saisis ou ajuste les objectifs mensuels de chaque conseiller, produit par produit, la planification et les corrections de ventes.
                    </p>
                </div>

                {lignes.length > 0 && (
                    <div className="flex flex-shrink-0 gap-2.5">
                        <button
                            onClick={handleExportSemainePDF}
                            className="group flex items-center gap-2.5 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-5 py-3 text-sm font-black text-sky-700 shadow-sm transition-all hover:border-sky-400 hover:from-sky-100 hover:to-cyan-100 hover:shadow-md active:scale-[0.97]"
                        >
                            <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Imprimer semaine
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="group flex items-center gap-2.5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-3 text-sm font-black text-violet-700 shadow-sm transition-all hover:border-violet-400 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md active:scale-[0.97]"
                        >
                            <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="12" y1="18" x2="12" y2="12"/>
                                <polyline points="9 15 12 18 15 15"/>
                            </svg>
                            Exporter PDF
                        </button>
                    </div>
                )}
            </div>

            {confirmation && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                    {confirmation}
                </div>
            )}

            <div className="mt-10">
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_16px_48px_rgba(15,23,42,.35)]">
                    <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-violet-600/10 blur-3xl" />

                    <div className="relative p-5">
                        {/* ── Titre + réglage Spiderhome ── */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">Objectifs mensuels</p>
                                <h2 className="mt-0.5 text-base font-black text-white">Par conseiller et par produit</h2>
                            </div>

                            {/* Coefficient journalier Spiderhome */}
                            <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-1.5">
                                <span className="text-sm">🏠</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-sky-300">Spiderhome/j</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={999}
                                    value={coeff}
                                    onChange={(e) => handleCoeff(Number(e.target.value))}
                                    className="w-12 rounded-lg border border-white/15 bg-slate-950 px-1 py-1 text-center text-sm font-black text-sky-300 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                                />
                                <span className="text-[10px] font-semibold text-white/40">× jours</span>
                            </div>
                        </div>

                        {lignes.length === 0 ? (
                            <p className="mt-5 text-sm text-white/40">Aucun objectif enregistré pour le moment.</p>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {lignes.map((ligne) => {
                                    const jours = joursPlanifies[ligne.conseillerId] ?? 0;
                                    return (
                                        <div
                                            key={ligne.conseillerId}
                                            className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10"
                                        >
                                            {/* Header conseiller */}
                                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2">
                                                <div className="flex items-center gap-2">
                                                    <PhotoAvatar nom={ligne.nom} photoUrl={photos[ligne.conseillerId] ?? null} size={24} />
                                                    <h3 className="text-sm font-black text-white">
                                                        {ligne.nom}
                                                    </h3>
                                                </div>
                                                <Link
                                                    href={`/manager/entretien/${ligne.conseillerId}`}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] font-black text-violet-300 transition-all hover:bg-violet-500/25 active:scale-95"
                                                >
                                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                        <polyline points="14 2 14 8 20 8"/>
                                                    </svg>
                                                    Bilan
                                                </Link>
                                            </div>

                                            {/* Grille produits */}
                                            <div className="grid grid-cols-3 gap-1.5 p-2 sm:grid-cols-6">
                                                {PRODUITS_MANUELS.map((prod) => {
                                                    const cellule = ligne.cellules[prod.code];
                                                    return (
                                                        <div key={prod.code} className={`flex flex-col gap-1 rounded-xl border p-2 ${prod.bg} ${prod.border}`}>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs">{prod.emoji}</span>
                                                                <span className={`text-[9px] font-black uppercase tracking-wide ${prod.text}`}>
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
                                                                    className={`w-full rounded-lg border bg-white/70 px-1 py-1 text-center text-base font-black text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 ${prod.border} ${prod.focus}`}
                                                                />
                                                            ) : (
                                                                <div className="text-center text-base font-black text-slate-300">—</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Spiderhome auto */}
                                                <div className="flex flex-col gap-1 rounded-xl border border-sky-100 bg-sky-50/70 p-2">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">🏠</span>
                                                        <span className="text-[9px] font-black uppercase tracking-wide text-sky-600">Spiderhome</span>
                                                    </div>
                                                    <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-white/70 py-1">
                                                        <span className="text-base font-black text-sky-700 tabular-nums">
                                                            {coeff * jours}
                                                        </span>
                                                        <span className="text-[9px] text-sky-500">auto</span>
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
                            className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(16,185,129,.25)] transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:w-auto sm:px-8"
                        >
                            {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
                        </button>
                    </div>
                </div>
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
