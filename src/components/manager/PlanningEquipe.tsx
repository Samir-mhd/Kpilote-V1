"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPlanningMois, savePlanning, genererPrePlanificationTous, joursFeriesAnnee, StatutJour } from "@/services/planningService";
import { invaliderObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

/**
 * Planning vue équipe (remplace le calendrier "un conseiller à la fois") : tout le mois pour
 * toute l'équipe sur un écran. On choisit un statut (pinceau) puis on clique — ou on glisse —
 * sur les cases ; une seule sauvegarde pour toutes les modifications. En bas : combien de
 * conseillers sont en boutique chaque jour.
 */

type Conseiller = { id: string; nom: string };
const BOUTIQUE_ID = "boutique";

const STATUTS: { value: StatutJour; label: string; court: string; cellule: string; pastille: string }[] = [
    { value: "present", label: "En boutique", court: "", cellule: "bg-emerald-400/80", pastille: "bg-emerald-500" },
    { value: "off", label: "Repos", court: "R", cellule: "bg-slate-100 text-slate-400", pastille: "bg-slate-300" },
    { value: "formation", label: "Formation", court: "F", cellule: "bg-sky-200 text-sky-800", pastille: "bg-sky-500" },
    { value: "conges_payes", label: "Congés", court: "CP", cellule: "bg-amber-200 text-amber-800", pastille: "bg-amber-500" },
    { value: "arret_maladie", label: "Arrêt", court: "AM", cellule: "bg-rose-200 text-rose-800", pastille: "bg-rose-500" },
    { value: "ferie", label: "Férié", court: "JF", cellule: "bg-violet-200 text-violet-800", pastille: "bg-violet-500" },
];
const PAR_STATUT = Object.fromEntries(STATUTS.map((s) => [s.value, s])) as Record<StatutJour, typeof STATUTS[number]>;
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["D", "L", "M", "M", "J", "V", "S"];
const SEUIL_EFFECTIF = 3; // en dessous : jour signalé (boutique ouverte)

const ds = (a: number, m: number, j: number) => `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;

export default function PlanningEquipe({ conseillers, photos = {} }: { conseillers: Conseiller[]; photos?: Record<string, string | null> }) {
    const auj = new Date();
    const [annee, setAnnee] = useState(auj.getFullYear());
    const [mois, setMois] = useState(auj.getMonth() + 1);
    const [planning, setPlanning] = useState<Record<string, Record<string, StatutJour>>>({});
    const [modifs, setModifs] = useState<Record<string, Record<string, StatutJour | null>>>({});
    const [pinceau, setPinceau] = useState<StatutJour>("present");
    const [chargement, setChargement] = useState(true);
    const [envoi, setEnvoi] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
    const peinture = useRef<null | StatutJour | "effacer">(null);

    const lignes = [{ id: BOUTIQUE_ID, nom: "Boutique" }, ...conseillers];
    const nbJ = new Date(annee, mois, 0).getDate();
    const jours = Array.from({ length: nbJ }, (_, i) => i + 1);
    const feries = joursFeriesAnnee(annee);
    const estAujourdhui = (j: number) => annee === auj.getFullYear() && mois === auj.getMonth() + 1 && j === auj.getDate();

    const charger = useCallback(async () => {
        setChargement(true);
        setModifs({});
        const res = await Promise.all(lignes.map((l) => getPlanningMois(l.id, annee, mois).catch(() => ({} as Record<string, StatutJour>))));
        setPlanning(Object.fromEntries(lignes.map((l, i) => [l.id, res[i]])));
        setChargement(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [annee, mois, conseillers.map((c) => c.id).join(",")]);
    useEffect(() => { charger(); }, [charger]);
    useEffect(() => {
        const fin = () => { peinture.current = null; };
        window.addEventListener("mouseup", fin);
        return () => window.removeEventListener("mouseup", fin);
    }, []);

    const statut = (id: string, j: number): StatutJour | null => {
        const d = ds(annee, mois, j);
        const m = modifs[id];
        if (m && d in m) return m[d];
        return planning[id]?.[d] ?? null;
    };
    const modifie = (id: string, j: number) => !!modifs[id] && ds(annee, mois, j) in modifs[id];

    function appliquer(id: string, j: number, valeur: StatutJour | null) {
        const d = ds(annee, mois, j);
        setModifs((prev) => {
            const ligne = { ...(prev[id] ?? {}) };
            if ((planning[id]?.[d] ?? null) === valeur) delete ligne[d]; else ligne[d] = valeur;
            return { ...prev, [id]: ligne };
        });
        setMessage(null);
    }
    function debut(id: string, j: number) {
        // Recliquer une case déjà au statut du pinceau l'efface (comme avant).
        const action = statut(id, j) === pinceau ? "effacer" : pinceau;
        peinture.current = action;
        appliquer(id, j, action === "effacer" ? null : action);
    }
    function survol(id: string, j: number) {
        if (peinture.current) appliquer(id, j, peinture.current === "effacer" ? null : peinture.current);
    }

    const nbModifs = Object.values(modifs).reduce((t, m) => t + Object.keys(m).length, 0);

    async function enregistrer() {
        setEnvoi(true);
        try {
            const ids = Object.keys(modifs).filter((id) => Object.keys(modifs[id]).length > 0);
            await Promise.all(ids.map((id) => savePlanning(id, modifs[id])));
            await invaliderObjectifsSemaineFiges(ids.filter((id) => id !== BOUTIQUE_ID)).catch(() => {});
            await charger();
            setMessage({ ok: true, texte: "Planning enregistré — les objectifs de la semaine sont recalculés." });
        } catch (e: unknown) {
            setMessage({ ok: false, texte: e instanceof Error ? e.message : "Erreur à l'enregistrement." });
        } finally { setEnvoi(false); }
    }

    async function prePlanifier() {
        if (!window.confirm(`Pré-planifier ${MOIS[mois - 1]} ${annee} pour la boutique et tous les conseillers ?\n\n• Dimanches → Repos\n• Jours fériés → Férié\n• Reste → En boutique\n\n⚠️ Écrase le planning existant du mois.`)) return;
        setEnvoi(true);
        try {
            await genererPrePlanificationTous(lignes.map((l) => l.id), annee, mois);
            await invaliderObjectifsSemaineFiges(conseillers.map((c) => c.id)).catch(() => {});
            await charger();
            setMessage({ ok: true, texte: "Mois pré-planifié pour toute l'équipe." });
        } catch (e: unknown) {
            setMessage({ ok: false, texte: e instanceof Error ? e.message : "Erreur de pré-planification." });
        } finally { setEnvoi(false); }
    }

    function naviguer(delta: number) {
        if (nbModifs > 0 && !window.confirm("Des modifications ne sont pas enregistrées. Changer de mois quand même ?")) return;
        let m = mois + delta, a = annee;
        if (m < 1) { m = 12; a--; }
        if (m > 12) { m = 1; a++; }
        setMois(m); setAnnee(a);
    }

    const enBoutique = (j: number) => conseillers.filter((c) => statut(c.id, j) === "present").length;
    const totalPresent = (id: string) => jours.filter((j) => statut(id, j) === "present").length;

    return (
        <section className="rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
            {/* En-tête : mois + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button onClick={() => naviguer(-1)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Mois précédent"><ChevronLeft size={18} /></button>
                    <h2 className="w-44 text-center text-xl font-black text-slate-900">{MOIS[mois - 1]} {annee}</h2>
                    <button onClick={() => naviguer(1)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Mois suivant"><ChevronRight size={18} /></button>
                </div>
                <button onClick={prePlanifier} disabled={envoi} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">
                    ⚡ Pré-planifier le mois
                </button>
            </div>

            {/* Pinceau */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Pinceau :</span>
                {STATUTS.map((s) => (
                    <button key={s.value} onClick={() => setPinceau(s.value)} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all ${pinceau === s.value ? "bg-slate-900 text-white shadow" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${s.pastille}`} /> {s.label}
                    </button>
                ))}
                <span className="text-xs text-slate-400">Clique ou glisse sur les cases · recliquer efface</span>
            </div>

            {message && <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.texte}</p>}

            {/* Grille */}
            <div className="mt-4 overflow-x-auto select-none">
                {chargement ? <div className="h-64 animate-pulse rounded-2xl bg-slate-100" /> : (
                    <table className="border-separate border-spacing-[2px]">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-white" />
                                {jours.map((j) => {
                                    const d = new Date(annee, mois - 1, j);
                                    const we = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                        <th key={j} className={`w-7 min-w-7 rounded-md pb-1 text-center ${estAujourdhui(j) ? "bg-violet-600 text-white" : we ? "text-slate-400" : "text-slate-600"}`}>
                                            <span className="block text-[9px] font-bold uppercase">{JOURS_COURTS[d.getDay()]}</span>
                                            <span className="block text-xs font-black tabular-nums">{j}</span>
                                        </th>
                                    );
                                })}
                                <th className="pl-2 text-left text-[10px] font-black uppercase tracking-wide text-slate-400">Jours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lignes.map((l) => (
                                <tr key={l.id}>
                                    <td className={`sticky left-0 z-10 bg-white pr-3 ${l.id === BOUTIQUE_ID ? "pb-2" : ""}`}>
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            {l.id === BOUTIQUE_ID
                                                ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm">🏪</span>
                                                : <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={28} />}
                                            <span className="text-sm font-black text-slate-800">{l.nom.split(" ")[0]}</span>
                                        </div>
                                    </td>
                                    {jours.map((j) => {
                                        const s = statut(l.id, j);
                                        const conf = s ? PAR_STATUT[s] : null;
                                        const ferie = feries.has(ds(annee, mois, j));
                                        return (
                                            <td
                                                key={j}
                                                onMouseDown={(e) => { e.preventDefault(); debut(l.id, j); }}
                                                onMouseEnter={() => survol(l.id, j)}
                                                title={`${l.nom.split(" ")[0]} — ${j} ${MOIS[mois - 1].toLowerCase()} : ${conf ? conf.label : "non saisi"}${ferie ? " (jour férié)" : ""}`}
                                                className={`h-8 w-7 min-w-7 cursor-pointer rounded-md text-center text-[10px] font-black transition-transform hover:scale-110 ${conf ? conf.cellule : "bg-white ring-1 ring-inset ring-dashed ring-slate-200"} ${modifie(l.id, j) ? "outline outline-2 outline-offset-1 outline-amber-400" : ""} ${l.id === BOUTIQUE_ID ? "mb-2" : ""}`}
                                            >
                                                {conf?.court}
                                            </td>
                                        );
                                    })}
                                    <td className="pl-2 text-sm font-black tabular-nums text-slate-700">{totalPresent(l.id)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="sticky left-0 z-10 bg-white pr-3 pt-2 text-[10px] font-black uppercase tracking-wide text-slate-400">En boutique</td>
                                {jours.map((j) => {
                                    const n = enBoutique(j);
                                    const ouvert = statut(BOUTIQUE_ID, j) === "present";
                                    const faible = ouvert && n < SEUIL_EFFECTIF;
                                    return (
                                        <td key={j} className={`pt-2 text-center text-xs font-black tabular-nums ${faible ? "text-red-600" : n === 0 ? "text-slate-300" : "text-slate-700"}`} title={faible ? `Seulement ${n} en boutique alors que la boutique est ouverte` : undefined}>
                                            {n}
                                            {faible && <span className="block text-[9px] leading-none">⚠</span>}
                                        </td>
                                    );
                                })}
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Case pointillée = jour non saisi (compte comme jour en boutique en semaine). ⚠ = moins de {SEUIL_EFFECTIF} conseillers un jour où la boutique est ouverte.</p>

            {nbModifs > 0 && (
                <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-[0_20px_50px_rgba(15,23,42,.4)]">
                        <span className="text-sm font-bold">{nbModifs} jour{nbModifs > 1 ? "s" : ""} modifié{nbModifs > 1 ? "s" : ""}</span>
                        <button onClick={() => setModifs({})} disabled={envoi} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">Annuler</button>
                        <button onClick={enregistrer} disabled={envoi} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black hover:bg-emerald-400 disabled:opacity-60">{envoi ? "Enregistrement…" : "Enregistrer le planning"}</button>
                    </div>
                </div>
            )}
        </section>
    );
}
