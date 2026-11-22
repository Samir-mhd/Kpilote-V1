"use client";

import { useEffect, useState } from "react";


import ResetVentesCard from "@/components/manager/ResetVentesCard";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

import {
    getObjectifsManager,
    updateObjectifMensuel,
    ObjectifManagerRow,
} from "@/services/objectifs";
import { getJoursTravailTous, getJoursTravailSemaineTous } from "@/services/planningService";

import { periodeSemaineEffective } from "@/utils/periodes";
import { getObjectifsSemaineFiges, invaliderObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { getCoeffRecapCommercial, sauvegarderCoeffRecapCommercial } from "@/services/recapCommercialConfig";
import { getCoeffAvisGoogle, sauvegarderCoeffAvisGoogle } from "@/services/avisGoogleConfig";
import Link from "next/link";
import { getObjectifsEquipeMois } from "@/services/objectifsEquipe";
import PlanningEquipe from "@/components/manager/PlanningEquipe";
import { exporterObjectifsPDFv2, nomMoisFr, GroupePDF } from "@/utils/exportObjectifsPDFv2";

// Un seul tableau éditable, colonnes groupées, totaux vs objectif boutique
const GROUPES_V2: { titre: string; codes: string[]; teinte: string; couleur: string }[] = [
    { titre: "Core business", codes: ["box", "forfaits", "telephones"], teinte: "bg-emerald-50 text-emerald-700", couleur: "#047857" },
    { titre: "Upsell", codes: ["mcafee", "assurance"], teinte: "bg-violet-50 text-violet-700", couleur: "#6d28d9" },
    { titre: "Ventes combo", codes: ["mcafee_mobile", "assurance_essentielle", "canal_plus"], teinte: "bg-sky-50 text-sky-700", couleur: "#0369a1" },
];
const AUTO_V2 = [
    { code: "avis_google", label: "Avis", emoji: "⭐" },
    { code: "recap_commercial", label: "Récap", emoji: "📋" },
];
const COURT: Record<string, string> = {
    box: "Box", forfaits: "Forfaits", telephones: "Tél.", mcafee: "McAfee", assurance: "Assu.",
    mcafee_mobile: "McAfee M.", assurance_essentielle: "Assu. ess.", canal_plus: "Canal+",
};

const PRODUITS_MANUELS = [
    { label: "Box",        code: "box",        emoji: "💻", text: "text-emerald-600", bg: "bg-emerald-50/70", border: "border-emerald-100", focus: "focus:border-emerald-400 focus:ring-emerald-100" },
    { label: "Forfaits",   code: "forfaits",   emoji: "📶", text: "text-blue-600",    bg: "bg-blue-50/70",    border: "border-blue-100",    focus: "focus:border-blue-400 focus:ring-blue-100" },
    { label: "Téléphones", code: "telephones", emoji: "📲", text: "text-violet-600",  bg: "bg-violet-50/70",  border: "border-violet-100",  focus: "focus:border-violet-400 focus:ring-violet-100" },
    { label: "McAfee",     code: "mcafee",     emoji: "🔒", text: "text-orange-600",  bg: "bg-orange-50/70",  border: "border-orange-100",  focus: "focus:border-orange-400 focus:ring-orange-100" },
    { label: "Assurance",  code: "assurance",  emoji: "🛡️", text: "text-red-600",     bg: "bg-red-50/70",     border: "border-red-100",     focus: "focus:border-red-400 focus:ring-red-100" },
    { label: "Avis Google", code: "avis_google", emoji: "⭐", text: "text-amber-600",  bg: "bg-amber-50/70",   border: "border-amber-100",   focus: "focus:border-amber-400 focus:ring-amber-100" },
    { label: "McAfee Mobile",         code: "mcafee_mobile",         emoji: "🔐", text: "text-amber-600", bg: "bg-amber-50/70", border: "border-amber-100", focus: "focus:border-amber-400 focus:ring-amber-100" },
    { label: "Assurance Essentielle", code: "assurance_essentielle", emoji: "🧩", text: "text-rose-600",  bg: "bg-rose-50/70",  border: "border-rose-100",  focus: "focus:border-rose-400 focus:ring-rose-100" },
    { label: "Canal+",                code: "canal_plus",            emoji: "📺", text: "text-indigo-600", bg: "bg-indigo-50/70", border: "border-indigo-100", focus: "focus:border-indigo-400 focus:ring-indigo-100" },
];

// Récap commercial : objectif auto (coeff × jours), pas un acte commercial → encart à part,
// affiché hors de la grille des actes, toujours présent en PDF. Spiderhome n'apparaît pas dans
// le récap imprimé. Avis Google est repoussé en dernière colonne du PDF.
const colonnesProduits = [
    ...PRODUITS_MANUELS.filter((p) => p.code !== "avis_google").map((p) => ({ label: p.label, code: p.code })),
    { label: "Récap Co", code: "recap_commercial", auto: true },
    { label: "Avis Google", code: "avis_google" },
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
    const [coeffRecap, setCoeffRecap]             = useState(1);
    const [coeffAvis, setCoeffAvis]               = useState(1);
    const [photos, setPhotos]                     = useState<Record<string, string | null>>({});
    const [onglet, setOnglet]                     = useState<"objectifs" | "planning" | "corrections">("objectifs");
    const [objBoutique, setObjBoutique]           = useState<Record<string, number>>({});

    useEffect(() => {
        getObjectifsEquipeMois().then(setObjBoutique).catch(() => {});
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("spiderhome_coeff");
        if (stored) setCoeff(Math.max(1, Number(stored) || 25));
        getCoeffRecapCommercial().then((c) => setCoeffRecap(Math.max(1, c || 1)));
        getCoeffAvisGoogle().then((c) => setCoeffAvis(Math.max(0, c ?? 1)));
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

    function handleCoeffRecap(val: number) {
        const v = Math.max(1, Math.min(999, isNaN(val) ? 1 : val));
        setCoeffRecap(v);
        sauvegarderCoeffRecapCommercial(v);
    }

    // Change l'objectif mensuel Avis Google de tout le monde → l'objectif semaine figé (calculé
    // avec l'ancien coefficient) doit être recalculé.
    async function handleCoeffAvis(val: number) {
        const v = Math.max(0, Math.min(99, isNaN(val) ? 1 : val));
        setCoeffAvis(v);
        await sauvegarderCoeffAvisGoogle(v);
        await invaliderObjectifsSemaineFiges(regrouperParConseiller(rows).map((l) => l.conseillerId));
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
            // Sans ça, un objectif semaine déjà figé (potentiellement à 0) resterait bloqué
            // jusqu'au lundi suivant malgré la mise à jour du mensuel.
            const conseillerIdsModifies = [...new Set(
                Object.keys(edits)
                    .map((rowId) => rows.find((r) => r.id === rowId)?.conseiller_id)
                    .filter((id): id is string => !!id)
            )];
            await invaliderObjectifsSemaineFiges(conseillerIdsModifies);
            setConfirmation("Objectifs mis à jour avec succès.");
            await charger();
        } finally {
            setEnregistrement(false);
        }
    }

        const valeur = (cellule: { id: string; objectif: number } | undefined) => cellule ? (edits[cellule.id] ?? cellule.objectif) : null;
        const auto = (code: string, conseillerId: string) => {
            const j = joursPlanifies[conseillerId] ?? 0;
            return code === "avis_google" ? Math.round(coeffAvis * j) : code === "recap_commercial" ? coeffRecap * j : coeff * j;
        };
        const totalCol = (code: string) => lignes.reduce((t, l) => t + (AUTO_V2.some((a) => a.code === code) ? auto(code, l.conseillerId) : valeur(l.cellules[code]) ?? 0), 0);
        const nbModifs = Object.keys(edits).length;
        const tousCodes = GROUPES_V2.flatMap((g) => g.codes);

        const groupesPDF: GroupePDF[] = [
            ...GROUPES_V2.map((g) => ({ titre: g.titre, couleur: g.couleur, colonnes: g.codes.map((c) => ({ code: c, label: COURT[c] })) })),
            { titre: "Auto", couleur: "#64748b", colonnes: [{ code: "avis_google", label: "Avis" }, { code: "recap_commercial", label: "Récap" }] },
        ];
        const NOTE_PDF = "Avis Google et Récap Co = coefficient × jours planifiés.";
        function exporterMoisV2() {
            exporterObjectifsPDFv2({
                titre: `Objectifs de ${nomMoisFr()}`,
                periode: "Objectifs mensuels",
                groupes: groupesPDF,
                lignes: lignes.map((l) => ({
                    nom: l.nom, photoUrl: photos[l.conseillerId] ?? null, jours: joursPlanifies[l.conseillerId] ?? 0,
                    valeurs: Object.fromEntries([
                        ...tousCodes.map((c) => [c, valeur(l.cellules[c])]),
                        ["avis_google", auto("avis_google", l.conseillerId)],
                        ["recap_commercial", auto("recap_commercial", l.conseillerId)],
                    ]),
                })),
                boutique: objBoutique,
                note: NOTE_PDF,
            });
        }
        async function exporterSemaineV2() {
            const { debut, fin } = periodeSemaineEffective();
            const ids = lignes.map((l) => l.conseillerId);
            const [joursSemaine, objSemaine] = await Promise.all([getJoursTravailSemaineTous(ids, debut, fin), getObjectifsSemaineFiges(ids, debut, fin)]);
            const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
            exporterObjectifsPDFv2({
                titre: "Objectifs de la semaine",
                periode: `Du ${fmt(debut)} au ${fmt(fin)} ${fin.getFullYear()}`,
                groupes: groupesPDF,
                lignes: lignes.map((l) => {
                    const sem = (objSemaine[l.conseillerId] ?? {}) as Record<string, number>;
                    const j = joursSemaine[l.conseillerId] ?? 0;
                    return {
                        nom: l.nom, photoUrl: photos[l.conseillerId] ?? null, jours: j,
                        valeurs: Object.fromEntries([
                            ...tousCodes.map((c) => [c, l.cellules[c] ? (sem[c] ?? 0) : null]),
                            ["avis_google", sem["avis_google"] ?? Math.round(coeffAvis * j)],
                            ["recap_commercial", coeffRecap * j],
                        ]),
                    };
                }),
                note: `Objectifs figés de la semaine (selon le planning). ${NOTE_PDF}`,
            });
        }

        return (
            <main className="space-y-6 pb-24">
                {/* En-tête */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">KPILOTE Manager</p>
                        <h1 className="mt-2 text-4xl font-black text-slate-900">Objectifs conseiller</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · {Object.values(joursPlanifies).reduce((t, j) => t + j, 0)} jours planifiés au total
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exporterSemaineV2} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">🗓️ Imprimer semaine</button>
                        <button onClick={exporterMoisV2} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">📄 Exporter PDF</button>
                    </div>
                </div>

                {/* Onglets */}
                <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100 w-fit">
                    {([["objectifs", "🎯 Objectifs du mois"], ["planning", "🗓️ Planning"], ["corrections", "🛠️ Corrections"]] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setOnglet(id)} className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${onglet === id ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {confirmation && <div className="rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">{confirmation}</div>}

                {onglet === "objectifs" && (
                    <>
                        {/* Réglages des objectifs automatiques */}
                        <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Objectifs auto <span className="normal-case tracking-normal font-semibold">(× jours planifiés)</span></p>
                            {[
                                { emoji: "⭐", label: "Avis Google", val: coeffAvis, set: handleCoeffAvis, step: 0.5, min: 0 },
                                { emoji: "📋", label: "Récap Co", val: coeffRecap, set: handleCoeffRecap, step: 1, min: 1 },
                                { emoji: "🏠", label: "Spiderhome", val: coeff, set: handleCoeff, step: 1, min: 1 },
                            ].map((c) => (
                                <label key={c.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
                                    <span aria-hidden="true">{c.emoji}</span> {c.label}
                                    <input type="number" min={c.min} step={c.step} value={c.val} onChange={(e) => c.set(Number(e.target.value))} className="w-14 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center font-black text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                                    <span className="text-xs font-semibold text-slate-400">/ jour</span>
                                </label>
                            ))}
                        </section>

                        {/* Tableau */}
                        <section className="overflow-x-auto rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                            <table className="w-full min-w-[940px] border-separate border-spacing-0 text-sm">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="sticky left-0 z-10 bg-white pb-2 pr-3 text-left align-bottom text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Conseiller</th>
                                        <th rowSpan={2} className="pb-2 px-2 text-center align-bottom text-[11px] font-black uppercase tracking-[0.15em] text-slate-400" title="Jours planifiés ce mois">Jours</th>
                                        {GROUPES_V2.map((g) => (
                                            <th key={g.titre} colSpan={g.codes.length} className="px-1 pb-1.5">
                                                <span className={`block rounded-lg py-1 text-[11px] font-black uppercase tracking-[0.12em] ${g.teinte}`}>{g.titre}</span>
                                            </th>
                                        ))}
                                        <th colSpan={AUTO_V2.length} className="px-1 pb-1.5">
                                            <span className="block rounded-lg bg-slate-100 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Auto</span>
                                        </th>
                                    </tr>
                                    <tr>
                                        {tousCodes.map((code) => (
                                            <th key={code} className="px-1 pb-2 text-center text-xs font-black text-slate-600">{COURT[code]}</th>
                                        ))}
                                        {AUTO_V2.map((a) => <th key={a.code} className="px-1 pb-2 text-center text-xs font-black text-slate-400"><span aria-hidden="true">{a.emoji}</span> {a.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lignes.map((l, i) => {
                                        const jours = joursPlanifies[l.conseillerId] ?? 0;
                                        const fond = i % 2 === 0 ? "bg-slate-50/70" : "bg-white";
                                        return (
                                            <tr key={l.conseillerId} className={fond}>
                                                <td className={`sticky left-0 z-10 rounded-l-xl py-2 pl-2 pr-3 ${fond}`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <PhotoAvatar nom={l.nom} photoUrl={photos[l.conseillerId] ?? null} size={32} />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-black text-slate-900">{l.nom.split(" ")[0]}</p>
                                                            <Link href={`/manager/entretien/${l.conseillerId}`} className="text-[11px] font-bold text-violet-600 hover:underline">Bilan →</Link>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center font-black tabular-nums text-slate-500">{jours}</td>
                                                {tousCodes.map((code) => {
                                                    const cellule = l.cellules[code];
                                                    const v = valeur(cellule);
                                                    const modifie = cellule ? edits[cellule.id] !== undefined && edits[cellule.id] !== cellule.objectif : false;
                                                    return (
                                                        <td key={code} className="px-1 py-2 text-center">
                                                            {cellule ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={v ?? 0}
                                                                    aria-label={`${COURT[code]} — ${l.nom}`}
                                                                    onChange={(e) => setEdits((prev) => ({ ...prev, [cellule.id]: Math.max(0, Number(e.target.value) || 0) }))}
                                                                    className={`w-14 rounded-lg border px-0.5 py-1.5 text-center font-black tabular-nums outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${modifie ? "border-amber-300 bg-amber-50 text-amber-800" : v === 0 ? "border-transparent bg-transparent text-slate-300 hover:border-slate-200" : "border-transparent bg-transparent text-slate-900 hover:border-slate-200"}`}
                                                                />
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                    );
                                                })}
                                                {AUTO_V2.map((a, j) => (
                                                    <td key={a.code} className={`px-1 py-2 text-center font-bold tabular-nums text-slate-400 ${j === AUTO_V2.length - 1 ? "rounded-r-xl" : ""}`}>{auto(a.code, l.conseillerId)}</td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="sticky left-0 z-10 border-t-2 border-slate-200 bg-white pt-3 pr-3 text-xs font-black uppercase tracking-[0.15em] text-slate-500">Total conseillers</td>
                                        <td className="border-t-2 border-slate-200 pt-3" />
                                        {tousCodes.map((code) => <td key={code} className="border-t-2 border-slate-200 pt-3 text-center font-black tabular-nums text-slate-900">{totalCol(code)}</td>)}
                                        {AUTO_V2.map((a) => <td key={a.code} className="border-t-2 border-slate-200 pt-3 text-center font-bold tabular-nums text-slate-400">{totalCol(a.code)}</td>)}
                                    </tr>
                                    <tr>
                                        <td className="sticky left-0 z-10 bg-white pt-1.5 pr-3 text-xs font-black uppercase tracking-[0.15em] text-emerald-600">
                                            Objectif boutique <Link href="/manager/matrice-objectifs" className="ml-1 normal-case tracking-normal text-[11px] font-bold text-slate-400 hover:underline">(matrice)</Link>
                                        </td>
                                        <td />
                                        {tousCodes.map((code) => {
                                            const b = objBoutique[code];
                                            const t = totalCol(code);
                                            const ecart = b ? Math.round(((t - b) / b) * 100) : null;
                                            return (
                                                <td key={code} className="pt-1.5 text-center tabular-nums">
                                                    <span className="font-black text-emerald-700">{b ?? "—"}</span>
                                                    {ecart !== null && <span className={`block text-[10px] font-black ${ecart >= 0 ? "text-slate-400" : "text-red-500"}`}>{ecart >= 0 ? "+" : ""}{ecart} %</span>}
                                                </td>
                                            );
                                        })}
                                        {AUTO_V2.map((a) => <td key={a.code} className="pt-1.5 text-center font-bold tabular-nums text-emerald-700/60">{objBoutique[a.code] ?? "—"}</td>)}
                                    </tr>
                                </tfoot>
                            </table>
                            <p className="mt-3 text-[11px] text-slate-400">
                                Clique sur un chiffre pour le modifier (en orange = modifié, pas encore enregistré). Le % sous l&apos;objectif boutique = écart entre la somme des conseillers et l&apos;objectif boutique (en rouge si les conseillers sont en dessous).
                            </p>
                        </section>
                    </>
                )}

                {onglet === "planning" && lignes.length > 0 && <PlanningEquipe conseillers={lignes.map((l) => ({ id: l.conseillerId, nom: l.nom }))} photos={photos} />}
                {onglet === "corrections" && lignes.length > 0 && <ResetVentesCard conseillers={lignes.map((l) => ({ id: l.conseillerId, nom: l.nom }))} />}

                {/* Barre d'enregistrement */}
                {onglet === "objectifs" && nbModifs > 0 && (
                    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
                        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-[0_20px_50px_rgba(15,23,42,.4)]">
                            <span className="text-sm font-bold">{nbModifs} modification{nbModifs > 1 ? "s" : ""} non enregistrée{nbModifs > 1 ? "s" : ""}</span>
                            <button onClick={() => setEdits({})} disabled={enregistrement} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">Annuler</button>
                            <button onClick={handleEnregistrer} disabled={enregistrement} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black hover:bg-emerald-400 disabled:opacity-60">{enregistrement ? "Enregistrement…" : "Enregistrer"}</button>
                        </div>
                    </div>
                )}
            </main>
        );
}
