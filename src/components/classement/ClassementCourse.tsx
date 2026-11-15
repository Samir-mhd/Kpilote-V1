"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import PodiumTopPerformers from "@/components/dashboard/PodiumTopPerformers";
import { construireClassementPeriode } from "@/services/classementService";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { getRealiseVentesComboParConseiller } from "@/services/variableConseiller";
import { Periode, periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { GROUPES, GroupeId, COMBO_META, ComboCode } from "@/utils/classementGroupes";

/**
 * Classement en "course" (variante &classement=v2) : une barre par conseiller proportionnelle à ses
 * ventes du groupe choisi, écart avec celui devant, mouvement depuis hier soir, rythme à date.
 * Le groupe (Core / Upsell / Quali) classe vraiment : ordre, podium et totaux le suivent.
 */

export type LigneCourse = {
    id: string;
    nom: string;
    realise: Record<string, number>;   // par code produit (combos inclus)
    objectif: Record<string, number>;  // objectif de la période (jour / semaine / mois)
};

type Props = {
    lignes: LigneCourse[];
    periode: Periode;
    groupe: GroupeId;
    conseillerId: string;
    photos: Record<string, string | null>;
};

type Statut = "atteint" | "avance" | "juste" | "retard" | "neutre";
const STYLE: Record<Statut, { barre: string; pastille: string }> = {
    atteint: { barre: "bg-violet-500", pastille: "bg-violet-100 text-violet-700" },
    avance: { barre: "bg-emerald-500", pastille: "bg-emerald-100 text-emerald-700" },
    juste: { barre: "bg-amber-400", pastille: "bg-amber-100 text-amber-800" },
    retard: { barre: "bg-rose-500", pastille: "bg-rose-100 text-rose-700" },
    neutre: { barre: "bg-indigo-400", pastille: "bg-slate-100 text-slate-600" },
};

function codesDuGroupe(groupe: GroupeId): string[] {
    const g = GROUPES.find((x) => x.id === groupe) ?? GROUPES[0];
    return [...g.codesCore, ...g.codesCombo];
}

function emojiDe(code: string) {
    return PRODUITS_ORDRE.find((p) => p.code === code)?.emoji ?? COMBO_META[code as ComboCode]?.emoji ?? "•";
}
function labelDe(code: string) {
    return PRODUITS_ORDRE.find((p) => p.code === code)?.label ?? COMBO_META[code as ComboCode]?.label ?? code;
}

function dateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bornes(periode: Periode): { debut: Date; fin: Date } {
    const now = new Date();
    if (periode === "semaine") return periodeSemaineEffective(now);
    if (periode === "mois") return { debut: new Date(now.getFullYear(), now.getMonth(), 1), fin: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    const j = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { debut: j, fin: j };
}

export default function ClassementCourse({ lignes, periode, groupe, conseillerId, photos }: Props) {
    const [mode, setMode] = useState<"volume" | "rythme">("volume");
    const [ouvert, setOuvert] = useState<string | null>(null);
    const [jours, setJours] = useState<Record<string, { ecoules: number; total: number }>>({});
    const [avant, setAvant] = useState<Record<string, Record<string, number>> | null>(null);

    const idsCle = lignes.map((l) => l.id).sort().join(",");

    // Jours planifiés écoulés / total de la période (rythme attendu à date, selon le planning de chacun).
    useEffect(() => {
        const ids = idsCle ? idsCle.split(",") : [];
        if (ids.length === 0 || periode === "jour") { setJours({}); return; }
        const { debut, fin } = bornes(periode);
        Promise.all([
            getJoursTravailPlageTous(ids, debut, new Date()),
            getJoursTravailPlageTous(ids, debut, fin),
        ]).then(([ecoules, total]) => {
            const r: Record<string, { ecoules: number; total: number }> = {};
            ids.forEach((id) => { r[id] = { ecoules: ecoules[id] ?? 0, total: total[id] ?? 0 }; });
            setJours(r);
        }).catch(() => setJours({}));
    }, [idsCle, periode]);

    // Classement "hier soir" (même période, arrêté à minuit) pour les flèches de mouvement.
    useEffect(() => {
        if (periode === "jour") { setAvant(null); return; }
        const minuit = new Date();
        minuit.setHours(0, 0, 0, 0);
        const { debut } = bornes(periode);
        if (minuit <= debut) { setAvant(null); return; }
        const veille = new Date(minuit);
        veille.setDate(veille.getDate() - 1);
        Promise.all([
            construireClassementPeriode(periode, { avant: minuit }),
            getRealiseVentesComboParConseiller(joursPeriode(periode).debut, dateStr(veille)),
        ]).then(([stats, combos]) => {
            const r: Record<string, Record<string, number>> = {};
            stats.forEach((c) => { r[c.id] = { ...(c.produits as Record<string, number>), ...(combos[c.id] ?? {}) }; });
            setAvant(r);
        }).catch(() => setAvant(null));
    }, [periode]);

    const codes = codesDuGroupe(groupe);
    const somme = (rec: Record<string, number> | undefined) => codes.reduce((t, c) => t + (rec?.[c] ?? 0), 0);

    const lignesCalculees = lignes.map((l) => {
        const score = somme(l.realise);
        const objectif = somme(l.objectif);
        const j = jours[l.id];
        const attendu = periode === "jour" ? objectif : j && j.total > 0 ? (objectif * j.ecoules) / j.total : objectif;
        const ratio = attendu > 0 ? score / attendu : score > 0 ? 2 : 1;
        let statut: Statut;
        if (objectif > 0 && score >= objectif) statut = "atteint";
        else if (periode === "jour") statut = "neutre";
        else if (ratio >= 1) statut = "avance";
        else if (ratio >= 0.85) statut = "juste";
        else statut = "retard";
        return { ...l, score, objTotal: objectif, attendu, ratio, statut };
    });

    const parVolume = [...lignesCalculees].sort((a, b) => b.score - a.score);
    const liste = mode === "volume" ? parVolume : [...lignesCalculees].sort((a, b) => b.ratio - a.ratio || b.score - a.score);
    const max = Math.max(...lignesCalculees.map((l) => l.score), 1);

    // Rang d'hier soir (volume uniquement) — masqué si personne n'avait encore vendu.
    const rangAvant: Record<string, number> = {};
    if (avant && mode === "volume" && Object.values(avant).some((r) => somme(r) > 0)) {
        [...lignes].sort((a, b) => somme(avant[b.id]) - somme(avant[a.id])).forEach((l, i) => { rangAvant[l.id] = i + 1; });
    }

    return (
        <div className="space-y-5">
            {/* Le podium suit le groupe choisi (toujours au volume). */}
            <PodiumTopPerformers
                classement={parVolume.map((l) => ({ id: l.id, nom: l.nom, total: l.score }))}
                conseillerId={conseillerId}
                periode={periode}
            />

            <section className="rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                        {GROUPES.find((g) => g.id === groupe)?.label} · la course
                    </h2>
                    {periode !== "jour" && (
                        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
                            {(["volume", "rythme"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`rounded-lg px-3 py-1.5 transition-all ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                                >
                                    {m === "volume" ? "Volume" : "À mon rythme"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {mode === "rythme" && (
                    <p className="-mt-2 mb-3 text-xs text-slate-500">
                        Classé sur l&apos;avance par rapport à son propre objectif à date (selon son planning), pas sur le nombre de ventes.
                    </p>
                )}

                <ol className="space-y-2">
                    {liste.map((l, i) => {
                        const rang = i + 1;
                        const isMoi = l.id === conseillerId;
                        const devant = i > 0 ? liste[i - 1] : null;
                        const derriere = liste[i + 1];
                        const st = STYLE[l.statut];
                        const mouvement = rangAvant[l.id] ? rangAvant[l.id] - rang : 0;
                        const ecartPct = Math.round((l.ratio - 1) * 100);
                        const estOuvert = ouvert === l.id;

                        const sousTitre = mode === "volume"
                            ? devant ? (devant.score - l.score === 0 ? `à égalité avec ${devant.nom.split(" ")[0]}` : `à ${devant.score - l.score} vente${devant.score - l.score > 1 ? "s" : ""} de ${devant.nom.split(" ")[0]}`)
                                : derriere ? `${l.score - derriere.score} d'avance` : ""
                            : `${l.score} vente${l.score > 1 ? "s" : ""}`;

                        const pastille = l.statut === "atteint" ? "🏆 objectif atteint"
                            : periode === "jour" ? `${l.score} / ${l.objTotal} du jour`
                            : l.attendu <= 0 ? "pas d'objectif"
                            : ecartPct >= 0 ? `+${ecartPct} % vs rythme` : `${ecartPct} % vs rythme`;

                        return (
                            <li key={l.id} className={`rounded-2xl ${isMoi ? "bg-green-50 ring-1 ring-green-200" : "bg-slate-50"}`}>
                                <button onClick={() => setOuvert(estOuvert ? null : l.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4" aria-expanded={estOuvert}>
                                    <span className={`w-6 shrink-0 text-center text-lg font-black tabular-nums ${rang <= 3 ? "text-amber-500" : "text-slate-400"}`}>{rang}</span>
                                    <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={40} />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className={`truncate font-black ${isMoi ? "text-green-800" : "text-slate-800"}`}>
                                                {l.nom.split(" ")[0]}
                                                {isMoi && <span className="ml-1.5 text-[11px] font-bold text-green-600">(toi)</span>}
                                            </p>
                                            <p className="shrink-0 text-xl font-black tabular-nums text-slate-900">{l.score}</p>
                                        </div>
                                        <div className="mt-1.5 h-2.5 rounded-full bg-white ring-1 ring-slate-200/70">
                                            <div className={`h-full rounded-full ${st.barre} transition-[width] duration-700`} style={{ width: `${Math.max((l.score / max) * 100, l.score > 0 ? 3 : 0)}%` }} />
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                            {sousTitre && <span className="font-semibold text-slate-500">{sousTitre}</span>}
                                            <span className={`rounded-full px-2 py-0.5 font-bold ${st.pastille}`}>{pastille}</span>
                                            {mouvement !== 0 && (
                                                <span className={`font-black ${mouvement > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {mouvement > 0 ? `▲ ${mouvement}` : `▼ ${-mouvement}`} <span className="font-semibold text-slate-400">depuis hier</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`shrink-0 text-slate-300 transition-transform ${estOuvert ? "rotate-180" : ""}`} />
                                </button>

                                {estOuvert && (
                                    <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3 sm:px-4 lg:grid-cols-5">
                                        {codes.map((code) => (
                                            <div key={code} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                <p className="truncate text-[11px] font-bold text-slate-500">{emojiDe(code)} {labelDe(code)}</p>
                                                <p className="text-sm font-black tabular-nums text-slate-800">
                                                    {l.realise[code] ?? 0}
                                                    <span className="font-semibold text-slate-400"> / {l.objectif[code] ?? 0}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
                    <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />objectif atteint</span>
                    {periode !== "jour" && <>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />dans les temps</span>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />un peu juste</span>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />en retard</span>
                    </>}
                    <span>Touche une ligne pour le détail par produit.</span>
                </p>
            </section>
        </div>
    );
}
