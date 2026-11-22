"use client";

import { useEffect, useState } from "react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import PodiumTopPerformers, { messageMotivation, messageEquipe } from "@/components/dashboard/PodiumTopPerformers";
import { VueA, VueB, VueC, type LigneVue } from "@/components/classement/ClassementVues";
import { useGenres } from "@/utils/genre";
import { construireClassementPeriode } from "@/services/classementService";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { getRealiseVentesComboParConseiller } from "@/services/variableConseiller";
import { getCoeffRecapCommercial } from "@/services/recapCommercialConfig";
import { Periode, periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { GROUPES, GroupeId, COMBO_META, ComboCode } from "@/utils/classementGroupes";

/**
 * Classement en "course" (variante &classement=v2). Le groupe (Core / Upsell / Quali) classe
 * vraiment : ordre, podium et totaux le suivent. Pas de jauge sur le total (un produit en
 * surperformance ne doit pas masquer un objectif raté) : chaque objectif a sa pastille, colorée
 * selon son propre rythme, et la ligne résume combien sont atteints.
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
    /** Mise en page en test : "A" (mini-podium + liste + fiche), "B" (podium dans la liste + fiche) ou "C" (matrice équipe). */
    vue?: "A" | "B" | "C" | null;
};

type Statut = "atteint" | "avance" | "juste" | "retard" | "encours" | "bonus";
const PASTILLE: Record<Statut, string> = {
    atteint: "bg-violet-100 text-violet-800 ring-violet-200",
    avance: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    juste: "bg-amber-50 text-amber-800 ring-amber-200",
    retard: "bg-rose-50 text-rose-700 ring-rose-200",
    encours: "bg-slate-50 text-slate-600 ring-slate-200",
    bonus: "bg-sky-50 text-sky-700 ring-sky-200",
};

// Quali (Avis Google, Récap Co) : pas des ventes → pas d'unité.
function uniteDuGroupe(groupe: GroupeId): string | null {
    return groupe === "quali" ? null : "vente";
}
function avecUnite(n: number, unite: string | null) {
    return unite ? `${n} ${unite}${n > 1 ? "s" : ""}` : `${n}`;
}

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

type Objectif = { code: string; realise: number; objectif: number; statut: Statut; tenue: number };

export default function ClassementCourse({ lignes, periode, groupe, conseillerId, photos, vue = null }: Props) {
    const genres = useGenres();
    const [mode, setMode] = useState<"volume" | "regularite">("volume");
    const [jours, setJours] = useState<Record<string, { ecoules: number; total: number }>>({});
    const [avant, setAvant] = useState<Record<string, Record<string, number>> | null>(null);
    const [coeffRecap, setCoeffRecap] = useState(0);

    useEffect(() => { getCoeffRecapCommercial().then(setCoeffRecap).catch(() => setCoeffRecap(0)); }, []);

    const idsCle = lignes.map((l) => l.id).sort().join(",");
    const unite = uniteDuGroupe(groupe);

    // Jours planifiés écoulés / total de la période (rythme attendu à date, selon le planning de chacun).
    useEffect(() => {
        const ids = idsCle ? idsCle.split(",") : [];
        if (ids.length === 0) { setJours({}); return; }
        const { debut, fin } = bornes(periode);
        Promise.all([
            getJoursTravailPlageTous(ids, debut, periode === "jour" ? fin : new Date()),
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
        const j = jours[l.id];
        const part = periode === "jour" ? 1 : j && j.total > 0 ? j.ecoules / j.total : 1;

        // Un produit sans objectif et sans vente ne concerne pas ce conseiller (ex. pas de profil Téléphone).
        // Récap Co : objectif auto (coeff × jours planifiés de la période), pas dans les objectifs stockés.
        const objectifDe = (code: string) => code === "recap_commercial" && !(l.objectif[code] > 0)
            ? Math.round(coeffRecap * (j?.total ?? 0))
            : l.objectif[code] ?? 0;
        const objectifs: Objectif[] = codes
            .map((code) => ({ code, realise: l.realise[code] ?? 0, objectif: objectifDe(code) }))
            .filter((o) => o.objectif > 0 || o.realise > 0)
            .map((o) => {
                if (o.objectif === 0) return { ...o, statut: "bonus" as Statut, tenue: 1 };
                const attendu = o.objectif * part;
                // Tenue plafonnée à 1 : un produit en surperformance ne compense pas les autres.
                const tenue = attendu > 0 ? Math.min(o.realise / attendu, 1) : 1;
                let statut: Statut;
                if (o.realise >= o.objectif) statut = "atteint";
                else if (periode === "jour") statut = "encours";
                else if (o.realise >= attendu) statut = "avance";
                else if (o.realise >= attendu * 0.85) statut = "juste";
                else statut = "retard";
                return { ...o, statut, tenue };
            });

        const avecObjectif = objectifs.filter((o) => o.objectif > 0);
        const atteints = avecObjectif.filter((o) => o.statut === "atteint").length;
        const auRythme = avecObjectif.filter((o) => o.statut === "atteint" || o.statut === "avance").length;
        const regularite = avecObjectif.length > 0
            ? auRythme / avecObjectif.length + avecObjectif.reduce((t, o) => t + o.tenue, 0) / avecObjectif.length / 100
            : -1;
        return { ...l, score: somme(l.realise), objectifs, nbObjectifs: avecObjectif.length, atteints, auRythme, regularite };
    });

    const parVolume = [...lignesCalculees].sort((a, b) => b.score - a.score);
    const liste = mode === "volume" ? parVolume : [...lignesCalculees].sort((a, b) => b.regularite - a.regularite || b.score - a.score);

    // Rang d'hier soir (volume uniquement) — masqué si personne n'avait encore rien fait.
    const rangAvant: Record<string, number> = {};
    if (avant && mode === "volume" && Object.values(avant).some((r) => somme(r) > 0)) {
        [...lignes].sort((a, b) => somme(avant[b.id]) - somme(avant[a.id])).forEach((l, i) => { rangAvant[l.id] = i + 1; });
    }

    const entete = (
        <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                {GROUPES.find((g) => g.id === groupe)?.label} · classement
            </h2>
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
                {(["volume", "regularite"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`rounded-lg px-3 py-1.5 transition-all ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                    >
                        {m === "volume" ? "Volume" : "Régularité"}
                    </button>
                ))}
            </div>
        </div>
        {mode === "regularite" && (
            <p className="-mt-2 mb-3 text-xs text-slate-500">
                Classé sur le nombre d&apos;objectifs tenus{periode === "jour" ? "" : " à date (selon le planning de chacun)"}.
                Dépasser largement un objectif ne compense pas un autre objectif en retard.
            </p>
        )}
        </>
    );

    if (vue === "A" || vue === "B" || vue === "C") {
        const lignesVue: LigneVue[] = liste.map((l, i) => {
            const devant = i > 0 ? liste[i - 1] : null;
            const derriere = liste[i + 1];
            const prenomDevant = devant?.nom.split(" ")[0];
            const ecart = mode === "volume"
                ? devant ? (devant.score === l.score ? `à égalité avec ${prenomDevant}` : `à ${avecUnite(devant.score - l.score, unite)} de ${prenomDevant}`)
                    : derriere && l.score > derriere.score ? `${avecUnite(l.score - derriere.score, unite)} d'avance` : ""
                : `${l.atteints} / ${l.nbObjectifs} objectif${l.nbObjectifs > 1 ? "s" : ""} atteint${l.atteints > 1 ? "s" : ""}`;
            return {
                id: l.id, nom: l.nom, score: l.score, ecart,
                mouvement: rangAvant[l.id] ? rangAvant[l.id] - (i + 1) : 0,
                objectifs: l.objectifs.map((o) => ({ code: o.code, realise: o.realise, objectif: o.objectif, statut: o.statut })),
            };
        });
        const classementVolume = parVolume.map((l) => ({ id: l.id, nom: l.nom, total: l.score }));
        const message = classementVolume[0]?.total > 0
            ? conseillerId ? messageMotivation(classementVolume, conseillerId, unite, genres[conseillerId] ?? null) : messageEquipe(classementVolume, unite)
            : null;
        const props = { liste: lignesVue, conseillerId, photos, unite, periode, message, emojiDe, labelDe, entete };
        return vue === "A" ? <VueA {...props} /> : vue === "B" ? <VueB {...props} /> : <VueC {...props} />;
    }

    return (
        <div className="space-y-5">
            {/* Le podium suit le groupe choisi (toujours au volume). */}
            <PodiumTopPerformers
                classement={parVolume.map((l) => ({ id: l.id, nom: l.nom, total: l.score }))}
                conseillerId={conseillerId}
                periode={periode}
                unite={unite}
            />

            <section className="rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                {entete}

                <ol className="space-y-2">
                    {liste.map((l, i) => {
                        const rang = i + 1;
                        const isMoi = l.id === conseillerId;
                        const devant = i > 0 ? liste[i - 1] : null;
                        const derriere = liste[i + 1];
                        const mouvement = rangAvant[l.id] ? rangAvant[l.id] - rang : 0;
                        const prenomDevant = devant?.nom.split(" ")[0];

                        const ecart = mode === "volume"
                            ? devant ? (devant.score === l.score ? `à égalité avec ${prenomDevant}` : `à ${avecUnite(devant.score - l.score, unite)} de ${prenomDevant}`)
                                : derriere && l.score > derriere.score ? `${avecUnite(l.score - derriere.score, unite)} d'avance` : ""
                            : "";

                        return (
                            <li key={l.id} className={`rounded-2xl px-3 py-3 sm:px-4 ${isMoi ? "bg-green-50 ring-1 ring-green-200" : "bg-slate-50"}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 shrink-0 text-center text-lg font-black tabular-nums ${rang <= 3 ? "text-amber-500" : "text-slate-400"}`}>{rang}</span>
                                    <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate font-black ${isMoi ? "text-green-800" : "text-slate-800"}`}>
                                            {l.nom.split(" ")[0]}
                                            {isMoi && <span className="ml-1.5 text-[11px] font-bold text-green-600">(toi)</span>}
                                        </p>
                                        <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-500">
                                            {l.nbObjectifs > 0
                                                ? <span><span className="font-black text-slate-700">{l.atteints} / {l.nbObjectifs}</span> objectif{l.nbObjectifs > 1 ? "s" : ""} atteint{l.atteints > 1 ? "s" : ""}{periode !== "jour" && l.auRythme > l.atteints ? ` · ${l.auRythme - l.atteints} dans les temps` : ""}</span>
                                                : <span>Pas d&apos;objectif sur ce groupe</span>}
                                            {ecart && <span>· {ecart}</span>}
                                            {mouvement !== 0 && (
                                                <span className={`font-black ${mouvement > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {mouvement > 0 ? `▲ ${mouvement}` : `▼ ${-mouvement}`} <span className="font-semibold text-slate-400">depuis hier</span>
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-right leading-none">
                                        <span className="text-2xl font-black tabular-nums text-slate-900">{l.score}</span>
                                        {unite && <span className="block text-[10px] font-bold text-slate-400">{l.score > 1 ? `${unite}s` : unite}</span>}
                                    </p>
                                </div>

                                {l.objectifs.length > 0 && (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 pl-9 sm:pl-[88px]">
                                        {l.objectifs.map((o) => (
                                            <span
                                                key={o.code}
                                                title={`${labelDe(o.code)} : ${o.realise}${o.objectif > 0 ? ` / ${o.objectif}` : " (sans objectif)"}`}
                                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums ring-1 ${PASTILLE[o.statut]}`}
                                            >
                                                <span aria-hidden="true">{emojiDe(o.code)}</span>
                                                <span className="hidden sm:inline">{labelDe(o.code)}</span>
                                                <span>{o.objectif > 0 ? `${o.realise}/${o.objectif}` : `+${o.realise}`}</span>
                                                {o.statut === "atteint" && <span aria-label="atteint">✓</span>}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
                    <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400" />objectif atteint ✓</span>
                    {periode !== "jour" ? <>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />dans les temps</span>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />un peu juste</span>
                        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />en retard</span>
                    </> : <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />en cours</span>}
                    <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />hors objectif</span>
                </p>
            </section>
        </div>
    );
}
