"use client";

import { useEffect, useState, useCallback } from "react";
import { getPlanningMois, savePlanning, genererPrePlanificationTous, StatutJour } from "@/services/planningService";

type Conseiller = { id: string; nom: string };
type Props = { conseillers: Conseiller[] };

// ─── Config statuts ────────────────────────────────────────────────────────────

const STATUTS: {
    value: StatutJour;
    label: string;
    abbrev: string;
    emoji: string;
    bg: string;
    text: string;
    border: string;
    btn: string;
    dot: string;
}[] = [
    { value: "present",       label: "Planifié",      abbrev: "P",   emoji: "✅", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400", btn: "bg-emerald-500 hover:bg-emerald-600 text-white", dot: "bg-emerald-500" },
    { value: "off",           label: "Jour off",      abbrev: "OFF", emoji: "💤", bg: "bg-slate-100",   text: "text-slate-500",   border: "border-slate-300",   btn: "bg-slate-500 hover:bg-slate-600 text-white",   dot: "bg-slate-400"   },
    { value: "formation",     label: "Formation",     abbrev: "F",   emoji: "📚", bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-400",    btn: "bg-blue-500 hover:bg-blue-600 text-white",     dot: "bg-blue-500"    },
    { value: "arret_maladie", label: "Arrêt maladie", abbrev: "AM",  emoji: "🏥", bg: "bg-red-100",     text: "text-red-700",     border: "border-red-400",     btn: "bg-red-500 hover:bg-red-600 text-white",       dot: "bg-red-500"     },
    { value: "conges_payes",  label: "Congés payés",  abbrev: "CP",  emoji: "🌴", bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-400",  btn: "bg-orange-500 hover:bg-orange-600 text-white", dot: "bg-orange-500"  },
    { value: "ferie",         label: "Jour férié",    abbrev: "JF",  emoji: "🎌", bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-400",  btn: "bg-purple-500 hover:bg-purple-600 text-white", dot: "bg-purple-500"  },
];

const statutMap = Object.fromEntries(STATUTS.map((s) => [s.value, s]));
const JOURS_LABEL = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function premierJour(a: number, m: number) { return ((new Date(a, m - 1, 1).getDay() + 6) % 7); }
function nbJours(a: number, m: number) { return new Date(a, m, 0).getDate(); }
function dateStr(a: number, m: number, j: number) { return `${a}-${String(m).padStart(2,"0")}-${String(j).padStart(2,"0")}`; }
function isWeekend(a: number, m: number, j: number) { const d = new Date(a, m-1, j).getDay(); return d===0||d===6; }

// ─── Composant ─────────────────────────────────────────────────────────────────

export default function PlanningCalendrier({ conseillers }: Props) {
    const today = new Date();
    const [annee, setAnnee]               = useState(today.getFullYear());
    const [mois, setMois]                 = useState(today.getMonth() + 1);
    const [conseillerId, setConseillerId] = useState(conseillers[0]?.id ?? "");
    const [modeActif, setModeActif]       = useState<StatutJour>("present");
    const [planning, setPlanning]         = useState<Record<string, StatutJour>>({});
    const [modifications, setModifications] = useState<Record<string, StatutJour | null>>({});
    const [chargement, setChargement]     = useState(false);
    const [sauvegarde, setSauvegarde]     = useState(false);
    const [generant, setGenerant]         = useState(false);
    const [statutSave, setStatutSave]     = useState<"idle"|"ok"|"err"|"gen">("idle");
    const [erreurMsg, setErreurMsg]       = useState("");

    const charger = useCallback(async () => {
        if (!conseillerId) return;
        setChargement(true);
        setModifications({});
        try {
            const data = await getPlanningMois(conseillerId, annee, mois);
            setPlanning(data);
        } catch (e: any) {
            setPlanning({});
            // On garde l'erreur pour la montrer si besoin
            console.warn("Planning non chargé :", e?.message);
        } finally {
            setChargement(false);
        }
    }, [conseillerId, annee, mois]);

    useEffect(() => { charger(); }, [charger]);

    // Vue fusionnée
    const vue: Record<string, StatutJour | null> = { ...planning, ...modifications };

    // Résumé : compte par statut (sur la vue fusionnée, uniquement les valeurs non-null)
    const resume = STATUTS.map((s) => ({
        ...s,
        count: Object.values(vue).filter((v) => v === s.value).length,
    })).filter((s) => s.count > 0);

    function toggleJour(jour: number) {
        const date = dateStr(annee, mois, jour);
        const actuel = vue[date];
        setModifications((prev) => ({ ...prev, [date]: actuel === modeActif ? null : modeActif }));
        setStatutSave("idle");
    }

    async function handleGenererTous() {
        if (!window.confirm(
            `Générer la pré-planification de ${MOIS_NOMS[mois - 1]} ${annee} pour TOUS les conseillers ?\n\n` +
            `• Dimanches → OFF\n• Jours fériés → Jour férié\n• Reste → Planifié\n\n` +
            `⚠️ Cette action écrase le planning existant du mois.`
        )) return;

        setGenerant(true);
        setStatutSave("idle");
        try {
            await genererPrePlanificationTous(conseillers.map(c => c.id), annee, mois);
            const data = await getPlanningMois(conseillerId, annee, mois).catch(() => null);
            if (data) setPlanning(data);
            setModifications({});
            setStatutSave("gen");
        } catch (e: any) {
            setStatutSave("err");
            setErreurMsg(e?.message ?? "Erreur pré-planification");
        } finally {
            setGenerant(false);
        }
    }

    async function handleSauvegarder() {
        if (!conseillerId || Object.keys(modifications).length === 0) return;
        setSauvegarde(true);
        setStatutSave("idle");
        setErreurMsg("");
        try {
            await savePlanning(conseillerId, modifications);
            // Recharge pour confirmer ce qui est en base
            const fresh = await getPlanningMois(conseillerId, annee, mois).catch(() => null);
            if (fresh !== null) {
                setPlanning(fresh);
            } else {
                // La lecture a échoué mais la sauvegarde a réussi → garde les modifs localement
                setPlanning((prev) => {
                    const next = { ...prev };
                    Object.entries(modifications).forEach(([d, s]) => {
                        if (s === null) delete next[d]; else next[d] = s;
                    });
                    return next;
                });
            }
            setModifications({});
            setStatutSave("ok");
        } catch (e: any) {
            setStatutSave("err");
            setErreurMsg(e?.message ?? "Erreur inconnue");
        } finally {
            setSauvegarde(false);
        }
    }

    function naviguerMois(delta: number) {
        let m = mois + delta, a = annee;
        if (m < 1)  { m = 12; a--; }
        if (m > 12) { m = 1;  a++; }
        setMois(m); setAnnee(a);
    }

    const offset = premierJour(annee, mois);
    const total  = nbJours(annee, mois);
    const cellules: (number|null)[] = [...Array(offset).fill(null), ...Array.from({length:total},(_,i)=>i+1)];
    while (cellules.length % 7 !== 0) cellules.push(null);

    const aDesModifs = Object.keys(modifications).length > 0;
    const conseiller = conseillers.find((c) => c.id === conseillerId);

    return (
        <div className="rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.08)] overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="p-7 border-b border-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">Planification</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">Calendrier des présences</h2>
                    </div>
                    <select
                        value={conseillerId}
                        onChange={(e) => { setConseillerId(e.target.value); setStatutSave("idle"); }}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400"
                    >
                        {conseillers.map((c) => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                    </select>
                </div>

                {/* Bouton pré-planification */}
                <div className="mt-5">
                    <button
                        onClick={handleGenererTous}
                        disabled={generant}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-2.5 text-sm font-black text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                        {generant ? (
                            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Génération...</>
                        ) : (
                            <>⚡ Pré-planifier {MOIS_NOMS[mois - 1]} pour tous</>
                        )}
                    </button>
                    <p className="mt-1.5 text-xs text-slate-400">
                        Dimanches → OFF · Jours fériés → Jour férié · Reste → Planifié
                    </p>
                </div>

                {/* Modes */}
                <div className="mt-5 flex flex-wrap gap-2">
                    {STATUTS.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => setModeActif(s.value)}
                            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition-all ${
                                modeActif === s.value
                                    ? s.btn + " shadow-md scale-[1.03]"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <span>{s.emoji}</span>
                            {s.label}
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    Mode actif : <span className={`font-black ${statutMap[modeActif]?.text}`}>{statutMap[modeActif]?.label}</span>
                    {" "}— cliquez sur les jours. Recliquer annule.
                </p>
            </div>

            <div className="p-7">

                {/* ── Récapitulatif ────────────────────────────────────────── */}
                <div className="mb-6 rounded-[20px] bg-slate-50 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Planning {conseiller?.nom} — {MOIS_NOMS[mois - 1]} {annee}
                    </p>

                    {resume.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            Aucun jour planifié pour ce mois. Cliquez sur les jours du calendrier ci-dessous.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {resume.map((s) => (
                                <div
                                    key={s.value}
                                    className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 ${s.bg} ${s.border}`}
                                >
                                    <span className="text-base">{s.emoji}</span>
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-wide ${s.text}`}>{s.label}</p>
                                        <p className={`text-xl font-black ${s.text}`}>
                                            {s.count} <span className="text-xs font-semibold opacity-60">jour{s.count > 1 ? "s" : ""}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {aDesModifs && (
                        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-600">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            {Object.keys(modifications).length} modification{Object.keys(modifications).length > 1 ? "s" : ""} non sauvegardée{Object.keys(modifications).length > 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* ── Navigation mois ──────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => naviguerMois(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-all">‹</button>
                    <p className="text-base font-black capitalize text-slate-800">{MOIS_NOMS[mois-1]} {annee}</p>
                    <button onClick={() => naviguerMois(1)}  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-all">›</button>
                </div>

                {/* ── Grille ───────────────────────────────────────────────── */}
                {chargement ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    </div>
                ) : (
                    <>
                        {/* Jours semaine */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {JOURS_LABEL.map((j, i) => (
                                <div key={i} className={`py-1.5 text-center text-xs font-bold uppercase tracking-wide ${i >= 5 ? "text-slate-300" : "text-slate-400"}`}>{j}</div>
                            ))}
                        </div>

                        {/* Cases */}
                        <div className="grid grid-cols-7 gap-1">
                            {cellules.map((jour, idx) => {
                                if (!jour) return <div key={`vide-${idx}`} />;

                                const date   = dateStr(annee, mois, jour);
                                const statut = vue[date];
                                const cfg    = statut ? statutMap[statut] : null;
                                const estAujourd = jour === today.getDate() && mois === today.getMonth()+1 && annee === today.getFullYear();
                                const wknd   = isWeekend(annee, mois, jour);
                                const modifie = date in modifications;

                                return (
                                    <button
                                        key={date}
                                        onClick={() => toggleJour(jour)}
                                        title={cfg?.label ?? (wknd ? "Week-end" : "Cliquez pour planifier")}
                                        className={`
                                            relative flex flex-col items-center justify-center rounded-xl py-2.5 text-sm font-black
                                            transition-all hover:scale-105 active:scale-95
                                            ${cfg ? `${cfg.bg} ${cfg.text} border ${cfg.border}` : wknd ? "bg-slate-50 text-slate-300 border border-slate-100" : "bg-white text-slate-700 border border-slate-100 hover:border-slate-300"}
                                            ${estAujourd && !cfg ? "ring-2 ring-violet-400" : ""}
                                            ${modifie ? "ring-2 ring-amber-400" : ""}
                                        `}
                                    >
                                        <span>{jour}</span>
                                        {cfg && <span className={`mt-0.5 text-[9px] font-black uppercase ${cfg.text}`}>{cfg.abbrev}</span>}
                                        {modifie && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* ── Feedback save ────────────────────────────────────────── */}
                {statutSave === "gen" && (
                    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                        <p className="text-sm font-black text-violet-700">
                            ⚡ Pré-planification générée — {MOIS_NOMS[mois-1]} {annee} · {conseillers.length} conseillers
                        </p>
                        <p className="mt-1 text-xs text-violet-600">
                            {resume.map((s) => `${s.emoji} ${s.count} ${s.label}`).join(" · ")}
                        </p>
                    </div>
                )}
                {statutSave === "ok" && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-black text-emerald-700">✅ Planning de {conseiller?.nom} sauvegardé — {MOIS_NOMS[mois-1]} {annee}</p>
                        <p className="mt-1 text-xs text-emerald-600">
                            {resume.map((s) => `${s.emoji} ${s.count} ${s.label}`).join(" · ")}
                        </p>
                    </div>
                )}
                {statutSave === "err" && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-black text-red-700">⚠️ Erreur de sauvegarde</p>
                        <p className="mt-1 text-xs text-red-600">{erreurMsg}</p>
                    </div>
                )}

                {/* ── Bouton valider ───────────────────────────────────────── */}
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
        </div>
    );
}
