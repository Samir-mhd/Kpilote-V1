"use client";

import { useEffect, useState, useCallback } from "react";
import { getPlanningMois, savePlanning, StatutJour } from "@/services/planningService";

type Conseiller = {
    id: string;
    nom: string;
};

type Props = {
    conseillers: Conseiller[];
};

// ─── Config des statuts ────────────────────────────────────────────────────────

const STATUTS: {
    value: StatutJour;
    label: string;
    abbrev: string;
    bg: string;
    text: string;
    border: string;
    btn: string;
}[] = [
    {
        value: "present",
        label: "Planifié",
        abbrev: "P",
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-400",
        btn: "bg-emerald-500 hover:bg-emerald-600 text-white",
    },
    {
        value: "off",
        label: "Jour off",
        abbrev: "OFF",
        bg: "bg-slate-100",
        text: "text-slate-500",
        border: "border-slate-300",
        btn: "bg-slate-500 hover:bg-slate-600 text-white",
    },
    {
        value: "formation",
        label: "Formation",
        abbrev: "F",
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-400",
        btn: "bg-blue-500 hover:bg-blue-600 text-white",
    },
    {
        value: "arret_maladie",
        label: "Arrêt maladie",
        abbrev: "AM",
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-400",
        btn: "bg-red-500 hover:bg-red-600 text-white",
    },
];

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

// ─── Helpers calendrier ────────────────────────────────────────────────────────

function premierJourDuMois(annee: number, mois: number): number {
    // 0=lun ... 6=dim (calendrier lundi-premier)
    const js = new Date(annee, mois - 1, 1).getDay(); // 0=dim
    return (js + 6) % 7; // conversion dimanche-premier → lundi-premier
}

function nombreJoursDansMois(annee: number, mois: number): number {
    return new Date(annee, mois, 0).getDate();
}

function dateStr(annee: number, mois: number, jour: number): string {
    return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

function labelMois(annee: number, mois: number): string {
    return new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
    });
}

function isWeekend(annee: number, mois: number, jour: number): boolean {
    const d = new Date(annee, mois - 1, jour).getDay();
    return d === 0 || d === 6;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PlanningCalendrier({ conseillers }: Props) {
    const today = new Date();
    const [annee, setAnnee] = useState(today.getFullYear());
    const [mois, setMois] = useState(today.getMonth() + 1);
    const [conseillerId, setConseillerId] = useState(conseillers[0]?.id ?? "");
    const [modeActif, setModeActif] = useState<StatutJour>("present");
    const [planning, setPlanning] = useState<Record<string, StatutJour>>({});
    const [modifications, setModifications] = useState<Record<string, StatutJour | null>>({});
    const [chargement, setChargement] = useState(false);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [confirmation, setConfirmation] = useState<string | null>(null);

    // Charge le planning du mois sélectionné
    const charger = useCallback(async () => {
        if (!conseillerId) return;
        setChargement(true);
        setModifications({});
        try {
            const data = await getPlanningMois(conseillerId, annee, mois);
            setPlanning(data);
        } catch {
            // Table planning_conseillers absente ou erreur réseau — on affiche un calendrier vide
            setPlanning({});
        } finally {
            setChargement(false);
        }
    }, [conseillerId, annee, mois]);

    useEffect(() => {
        charger();
    }, [charger]);

    // Vue fusionnée : planning chargé + modifications locales non encore sauvegardées
    const vueJours: Record<string, StatutJour | null> = { ...planning, ...modifications };

    function toggleJour(jour: number) {
        const date = dateStr(annee, mois, jour);
        const statutActuel = vueJours[date];

        setModifications((prev) => {
            const next = { ...prev };
            if (statutActuel === modeActif) {
                // Même statut → désélectionner (supprimer)
                next[date] = null;
            } else {
                next[date] = modeActif;
            }
            return next;
        });

        setConfirmation(null);
    }

    async function handleSauvegarder() {
        if (!conseillerId || Object.keys(modifications).length === 0) return;
        setSauvegarde(true);
        try {
            await savePlanning(conseillerId, modifications);
            const nom = conseillers.find((c) => c.id === conseillerId)?.nom ?? "";
            setConfirmation(`Planning de ${nom} sauvegardé pour ${labelMois(annee, mois)}.`);
            await charger();
        } finally {
            setSauvegarde(false);
        }
    }

    function naviguerMois(delta: number) {
        let m = mois + delta;
        let a = annee;
        if (m < 1) { m = 12; a -= 1; }
        if (m > 12) { m = 1; a += 1; }
        setMois(m);
        setAnnee(a);
    }

    // Construction de la grille
    const offset = premierJourDuMois(annee, mois);
    const nbJours = nombreJoursDansMois(annee, mois);
    const cellules: (number | null)[] = [
        ...Array(offset).fill(null),
        ...Array.from({ length: nbJours }, (_, i) => i + 1),
    ];
    while (cellules.length % 7 !== 0) cellules.push(null);

    const aDesModifs = Object.keys(modifications).length > 0;
    const statutConfig = STATUTS.find((s) => s.value === modeActif)!;

    return (
        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">
                        Planification
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                        Calendrier des présences
                    </h2>
                </div>

                {/* Sélecteur conseiller */}
                <select
                    value={conseillerId}
                    onChange={(e) => setConseillerId(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                    {conseillers.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.nom}
                        </option>
                    ))}
                </select>
            </div>

            {/* ── Modes ── */}
            <div className="mt-6 flex flex-wrap gap-2">
                {STATUTS.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => setModeActif(s.value)}
                        className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                            modeActif === s.value
                                ? s.btn + " shadow-md scale-[1.03]"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {modeActif && (
                <p className="mt-3 text-xs text-slate-400">
                    Mode actif :{" "}
                    <span className={`font-black ${statutConfig.text}`}>
                        {statutConfig.label}
                    </span>
                    {" "}— cliquez sur les jours pour les basculer. Cliquer à nouveau annule.
                </p>
            )}

            {/* ── Navigation mois ── */}
            <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={() => naviguerMois(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-all"
                >
                    ‹
                </button>

                <p className="text-base font-black capitalize text-slate-800">
                    {labelMois(annee, mois)}
                </p>

                <button
                    onClick={() => naviguerMois(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-all"
                >
                    ›
                </button>
            </div>

            {/* ── Grille calendrier ── */}
            {chargement ? (
                <div className="mt-6 flex h-40 items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            ) : (
                <div className="mt-4">
                    {/* Noms des jours */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {JOURS.map((j, i) => (
                            <div
                                key={i}
                                className={`py-2 text-center text-xs font-bold uppercase tracking-wide ${
                                    i >= 5 ? "text-slate-300" : "text-slate-400"
                                }`}
                            >
                                {j}
                            </div>
                        ))}
                    </div>

                    {/* Jours */}
                    <div className="grid grid-cols-7 gap-1">
                        {cellules.map((jour, idx) => {
                            if (!jour) {
                                return <div key={`vide-${idx}`} />;
                            }

                            const date = dateStr(annee, mois, jour);
                            const statut = vueJours[date];
                            const config = STATUTS.find((s) => s.value === statut);
                            const estAujourdhui =
                                jour === today.getDate() &&
                                mois === today.getMonth() + 1 &&
                                annee === today.getFullYear();
                            const estWeekend = isWeekend(annee, mois, jour);
                            const modifie = date in modifications;

                            return (
                                <button
                                    key={date}
                                    onClick={() => toggleJour(jour)}
                                    title={config?.label ?? ""}
                                    className={`
                                        relative flex flex-col items-center justify-center rounded-xl py-2.5
                                        text-sm font-black transition-all hover:scale-105 active:scale-95
                                        ${config
                                            ? `${config.bg} ${config.text} border ${config.border}`
                                            : estWeekend
                                            ? "bg-slate-50 text-slate-300 border border-slate-100"
                                            : "bg-white text-slate-700 border border-slate-100 hover:border-slate-300"
                                        }
                                        ${estAujourdhui && !config ? "ring-2 ring-violet-400" : ""}
                                        ${modifie ? "ring-2 ring-amber-400" : ""}
                                    `}
                                >
                                    <span>{jour}</span>
                                    {config && (
                                        <span className={`mt-0.5 text-[9px] font-black uppercase ${config.text}`}>
                                            {config.abbrev}
                                        </span>
                                    )}
                                    {modifie && (
                                        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Légende ── */}
            <div className="mt-5 flex flex-wrap gap-4">
                {STATUTS.map((s) => (
                    <div key={s.value} className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded-md border ${s.bg} ${s.border}`} />
                        <span className="text-xs text-slate-500">{s.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-md border-2 border-amber-400" />
                    <span className="text-xs text-slate-400">Non sauvegardé</span>
                </div>
            </div>

            {/* ── Confirmation ── */}
            {confirmation && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    ✅ {confirmation}
                </div>
            )}

            {/* ── Bouton valider ── */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSauvegarder}
                    disabled={!aDesModifs || sauvegarde}
                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {sauvegarde
                        ? "Sauvegarde..."
                        : aDesModifs
                        ? `Valider (${Object.keys(modifications).length} jour${Object.keys(modifications).length > 1 ? "s" : ""})`
                        : "Aucune modification"}
                </button>
            </div>
        </div>
    );
}
