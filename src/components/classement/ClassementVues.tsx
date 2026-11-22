"use client";

/**
 * Variantes de mise en page du Classement (en test, &vue=A, &vue=B ou &vue=C) :
 *  - A : mini-podium + liste compacte (barres de statut), fiche détaillée à droite.
 *  - B : podium intégré à la liste (top 3 en grandes lignes), mini-anneaux par objectif,
 *        fiche détaillée du conseiller sélectionné à droite.
 *  - C : liste « Les stars » à gauche, matrice d'anneaux de toute l'équipe à droite.
 * Les calculs (statuts, écarts, tri) viennent de ClassementCourse : seul l'affichage change.
 */
import { useId, useState } from "react";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { ChevronRight } from "lucide-react";
import type { Periode } from "@/utils/periodes";

export type StatutVue = "atteint" | "avance" | "juste" | "retard" | "encours" | "bonus";
export type ObjectifVue = { code: string; realise: number; objectif: number; statut: StatutVue };
export type LigneVue = {
    id: string;
    nom: string;
    score: number;
    objectifs: ObjectifVue[];
    ecart: string;
    mouvement: number;
};

const COULEUR: Record<StatutVue, { hex: string; label: string; txt: string }> = {
    atteint: { hex: "#f59e0b", label: "objectif atteint", txt: "text-amber-600" },
    avance: { hex: "#10b981", label: "dans les temps", txt: "text-emerald-600" },
    juste: { hex: "#f97316", label: "un peu juste", txt: "text-orange-600" },
    retard: { hex: "#f43f5e", label: "en retard", txt: "text-rose-600" },
    encours: { hex: "#94a3b8", label: "en cours", txt: "text-slate-500" },
    bonus: { hex: "#0ea5e9", label: "hors objectif", txt: "text-sky-600" },
};
const MEDAILLES = ["🥇", "🥈", "🥉"];
/** Or brillant (objectif atteint) : dégradé utilisé pour les pastilles et barres. */
const OR = "linear-gradient(135deg,#b45309,#fbbf24 40%,#fef3c7 50%,#f59e0b 60%,#b45309)";
const fondStatut = (s: StatutVue) => (s === "atteint" ? OR : COULEUR[s].hex);

type Commun = {
    liste: LigneVue[];
    conseillerId: string;
    photos: Record<string, string | null>;
    unite: string | null;
    periode: Periode;
    message: string | null;
    emojiDe: (code: string) => string;
    labelDe: (code: string) => string;
    entete: React.ReactNode; // titre + bascule Volume / Régularité
};

const prenom = (nom: string) => nom.split(" ")[0];
const avecUnite = (n: number, unite: string | null) => (unite ? `${unite}${n > 1 ? "s" : ""}` : "");

/** Anneau d'objectif : couleur = statut, réalisé au centre. */
function Anneau({ o, taille, epais, emoji, label }: { o: ObjectifVue; taille: number; epais: number; emoji?: string; label?: string }) {
    const R = (taille - epais) / 2;
    const C = 2 * Math.PI * R;
    const part = o.objectif > 0 ? Math.min(1, o.realise / o.objectif) : o.realise > 0 ? 1 : 0;
    const c = COULEUR[o.statut];
    const idOr = `or-${useId().replace(/:/g, "")}`;
    const or = o.statut === "atteint";
    const grand = taille >= 80;
    return (
        <div className="flex flex-col items-center text-center" title={`${label ?? o.code} : ${o.realise}${o.objectif > 0 ? ` / ${o.objectif}` : " (sans objectif)"}`}>
            <div className="relative" style={{ width: taille, height: taille }}>
                <svg viewBox={`0 0 ${taille} ${taille}`} className={`-rotate-90 ${or ? "anneau-or-classement" : ""}`} style={{ width: taille, height: taille }}>
                    {or && (
                        <defs>
                            <linearGradient id={idOr} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#b45309" />
                                <stop offset="35%" stopColor="#fbbf24" />
                                <stop offset="50%" stopColor="#fef3c7">
                                    <animate attributeName="offset" values="0.1;0.9;0.1" dur="2.4s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="65%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                        </defs>
                    )}
                    <circle cx={taille / 2} cy={taille / 2} r={R} fill="none" strokeWidth={epais} className="anneau-piste stroke-slate-100" />
                    <circle
                        cx={taille / 2} cy={taille / 2} r={R} fill="none" stroke={or ? `url(#${idOr})` : c.hex} strokeWidth={epais}
                        strokeLinecap={part > 0 ? "round" : "butt"} strokeDasharray={`${part * C} ${C}`}
                    />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                    {grand && emoji && <span className="text-xl leading-none">{emoji}</span>}
                    {grand ? (
                        <span className="text-sm font-black tabular-nums text-slate-900">
                            {o.realise}{o.objectif > 0 && <span className="text-slate-400">/{o.objectif}</span>}
                        </span>
                    ) : (
                        <span className={`font-black tabular-nums leading-none text-slate-900 ${taille >= 50 ? "text-sm" : "text-[11px]"}`}>{o.realise}</span>
                    )}
                </span>
                {o.statut === "atteint" && taille >= 50 && (
                    <span className="absolute -right-0.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[10px] font-black text-white ring-2 ring-white">★</span>
                )}
            </div>
            {grand && label && (
                <>
                    <p className="mt-1.5 text-xs font-black text-slate-800">{label}</p>
                    <p className={`text-[11px] font-bold ${c.txt}`}>{c.label}</p>
                </>
            )}
        </div>
    );
}

function Legende({ periode }: { periode: Periode }) {
    const statuts: StatutVue[] = periode === "jour" ? ["atteint", "encours", "bonus"] : ["atteint", "avance", "juste", "retard", "bonus"];
    return (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
            {statuts.map((s) => (
                <span key={s} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: fondStatut(s) }} />{COULEUR[s].label}</span>
            ))}
        </p>
    );
}

/** Fiche détaillée du conseiller sélectionné (vue B). */
function Fiche({ l, rang, estMoi, message, unite, periode, emojiDe, labelDe }: {
    l: LigneVue; rang: number; estMoi: boolean; message: string | null; unite: string | null; periode: Periode;
    emojiDe: (c: string) => string; labelDe: (c: string) => string;
}) {
    return (
        <section className="min-w-0 rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6 lg:sticky lg:top-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <CartoonAvatar prenom={l.nom} etat={rang === 1 ? "en_feu" : "souriant_main"} size={88} className="shrink-0 object-contain" />
                <div className="min-w-[140px] flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{rang <= 3 ? `${MEDAILLES[rang - 1]} ` : ""}{rang}<sup>e</sup></p>
                    <p className="truncate text-2xl font-black text-slate-900">
                        {prenom(l.nom)}
                        {estMoi && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 align-middle text-[10px] font-black uppercase text-white">toi</span>}
                    </p>
                    {l.ecart && <p className="text-sm font-bold text-slate-500">{l.ecart}</p>}
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-4xl font-black tabular-nums text-slate-900 sm:text-5xl">{l.score}</p>
                    {unite && <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{avecUnite(l.score, unite)}</p>}
                </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 sm:p-5">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Objectifs</p>
                {l.objectifs.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">Pas d&apos;objectif sur ce groupe.</p>
                ) : (
                    <div className="flex flex-wrap justify-around gap-4">
                        {l.objectifs.map((o) => <Anneau key={o.code} o={o} taille={104} epais={10} emoji={emojiDe(o.code)} label={labelDe(o.code)} />)}
                    </div>
                )}
            </div>
            {estMoi && message && (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">{message}</p>
            )}
            <div className="mt-4"><Legende periode={periode} /></div>
        </section>
    );
}

const FONDS_TOP = [
    "bg-gradient-to-r from-amber-100 to-amber-50 ring-amber-300",
    "bg-gradient-to-r from-slate-100 to-white ring-slate-300",
    "bg-gradient-to-r from-orange-100 to-orange-50 ring-orange-300",
];

/* ── B : podium dans la liste + fiche détaillée ── */
/* ── A : mini-podium + liste compacte à gauche, fiche détaillée à droite ── */
const CADRES_MINI = [
    { cadre: "from-amber-200 to-amber-500", h: "h-[150px]" },
    { cadre: "from-slate-200 to-slate-400", h: "h-[134px]" },
    { cadre: "from-orange-300 to-amber-700", h: "h-[122px]" },
];
export function VueA({ liste, conseillerId, photos, unite, periode, message, emojiDe, labelDe, entete }: Commun) {
    const [selection, setSelection] = useState<string>(conseillerId || liste[0]?.id || "");
    const idx = Math.max(0, liste.findIndex((l) => l.id === selection));
    const choisi = liste[idx];
    // Le podium reste au volume, même quand la liste est triée par régularité.
    const podium = [...liste].sort((a, b) => b.score - a.score).slice(0, 3);
    const podiumVisible = podium.length >= 2 && podium[0].score > 0;
    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="min-w-0 space-y-4">
                {podiumVisible && (
                    <section className="relative overflow-hidden rounded-[24px] bg-[#0d0f1a] px-3 pb-4 pt-4 sm:px-4">
                        <div className="pointer-events-none absolute left-1/2 top-0 h-60 w-80 -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_160deg,rgba(255,255,255,.10)_180deg,transparent_200deg)]" />
                        <p className="relative text-center text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Les stars</p>
                        <div className="relative mt-3 flex items-end justify-center gap-2 sm:gap-3">
                            {[1, 0, 2].map((rang0) => {
                                const l = podium[rang0];
                                if (!l) return null;
                                const st = CADRES_MINI[rang0];
                                return (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => setSelection(l.id)}
                                        className={`w-[31%] max-w-[150px] rounded-[18px] bg-gradient-to-b ${st.cadre} p-[2px] transition-transform hover:-translate-y-0.5`}
                                    >
                                        <span className={`relative flex ${st.h} flex-col items-center rounded-[16px] bg-gradient-to-b from-[#1b1f33] to-[#10121d] pt-2`}>
                                            <span className="absolute left-1.5 top-1 text-sm sm:left-2 sm:text-base">{MEDAILLES[rang0]}</span>
                                            {l.id === conseillerId && <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">toi</span>}
                                            <CartoonAvatar prenom={l.nom} etat="en_feu" size={rang0 === 0 ? 64 : 54} className="shrink-0 object-contain" />
                                            <span className="mt-0.5 w-full truncate px-1 text-center text-xs font-black text-white">{prenom(l.nom)}</span>
                                            <span className="text-2xl font-black tabular-nums text-white">{l.score}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
                <section className="rounded-[24px] bg-white p-3 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-4">
                    <div className="px-1 pb-2">{entete}</div>
                    <ol className="space-y-1">
                        {liste.map((l, i) => {
                            const estMoi = l.id === conseillerId;
                            const actif = l.id === choisi?.id;
                            return (
                                <li key={l.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelection(l.id)}
                                        aria-pressed={actif}
                                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${actif ? "bg-emerald-50 ring-2 ring-emerald-300" : estMoi ? "bg-green-50" : "hover:bg-slate-50"}`}
                                    >
                                        <span className="w-6 shrink-0 text-center text-sm font-black text-slate-400">{i < 3 && l.score > 0 ? MEDAILLES[i] : i + 1}</span>
                                        <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={36} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-slate-900">
                                                {prenom(l.nom)}{estMoi && <span className="ml-1 text-xs text-emerald-600">(toi)</span>}
                                                {l.mouvement !== 0 && <span className={`ml-1.5 text-[11px] font-black ${l.mouvement > 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.mouvement > 0 ? `▲ ${l.mouvement}` : `▼ ${-l.mouvement}`}</span>}
                                            </span>
                                            <span className="mt-1 flex gap-1">
                                                {l.objectifs.map((o) => (
                                                    <span
                                                        key={o.code}
                                                        className="h-1.5 w-8 rounded-full"
                                                        style={{ background: fondStatut(o.statut) }}
                                                        title={`${labelDe(o.code)} : ${o.realise}${o.objectif > 0 ? ` / ${o.objectif}` : ""} · ${COULEUR[o.statut].label}`}
                                                    />
                                                ))}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-lg font-black tabular-nums text-slate-900">{l.score}</span>
                                        <ChevronRight size={16} className="shrink-0 text-slate-300" />
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            </div>
            {choisi && (
                <Fiche l={choisi} rang={idx + 1} estMoi={choisi.id === conseillerId} message={message} unite={unite} periode={periode} emojiDe={emojiDe} labelDe={labelDe} />
            )}
        </div>
    );
}

export function VueB({ liste, conseillerId, photos, unite, periode, message, emojiDe, labelDe, entete }: Commun) {
    const [selection, setSelection] = useState<string>(conseillerId || liste[0]?.id || "");
    const idx = Math.max(0, liste.findIndex((l) => l.id === selection));
    const choisi = liste[idx];
    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <section className="min-w-0 rounded-[24px] bg-white p-3 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-4">
                <div className="px-1 pb-2">{entete}</div>
                <ol className="space-y-2">
                    {liste.map((l, i) => {
                        const top = i < 3 && l.score > 0;
                        const estMoi = l.id === conseillerId;
                        const actif = l.id === choisi?.id;
                        return (
                            <li key={l.id}>
                                <button
                                    type="button"
                                    onClick={() => setSelection(l.id)}
                                    aria-pressed={actif}
                                    className={`flex w-full items-center gap-3 rounded-2xl text-left transition-all ${top ? `px-3 py-3 ring-1 ${FONDS_TOP[i]}` : `px-3 py-2 ${estMoi ? "bg-green-50" : "hover:bg-slate-50"}`} ${actif ? "!ring-2 !ring-emerald-400" : ""}`}
                                >
                                    <span className={`w-7 shrink-0 text-center font-black ${top ? "text-2xl" : "text-sm text-slate-400"}`}>{top ? MEDAILLES[i] : i + 1}</span>
                                    {top
                                        ? <CartoonAvatar prenom={l.nom} etat="en_feu" size={52} className="shrink-0 object-contain" />
                                        : <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={36} />}
                                    <span className="min-w-0 flex-1">
                                        <span className={`block truncate font-black text-slate-900 ${top ? "text-base" : "text-sm"}`}>
                                            {prenom(l.nom)}{estMoi && <span className="ml-1 text-xs text-emerald-600">(toi)</span>}
                                        </span>
                                        <span className="block truncate text-[11px] font-semibold text-slate-500">
                                            {l.ecart}
                                            {l.mouvement !== 0 && <span className={`ml-1 font-black ${l.mouvement > 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.mouvement > 0 ? `▲ ${l.mouvement}` : `▼ ${-l.mouvement}`}</span>}
                                        </span>
                                    </span>
                                    <span className="hidden shrink-0 gap-1 sm:flex">
                                        {l.objectifs.slice(0, 4).map((o) => <Anneau key={o.code} o={o} taille={40} epais={5} label={labelDe(o.code)} />)}
                                    </span>
                                    <span className={`w-12 shrink-0 text-right font-black tabular-nums text-slate-900 ${top ? "text-2xl" : "text-lg"}`}>{l.score}</span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </section>
            {choisi && (
                <Fiche l={choisi} rang={idx + 1} estMoi={choisi.id === conseillerId} message={message} unite={unite} periode={periode} emojiDe={emojiDe} labelDe={labelDe} />
            )}
        </div>
    );
}

/* ── C : liste « Les stars » + matrice d'anneaux de l'équipe ── */
export function VueC({ liste, conseillerId, photos, periode, message, emojiDe, labelDe, entete }: Commun) {
    // Colonnes : tous les objectifs présents dans l'équipe, dans l'ordre d'apparition.
    const codes: string[] = [];
    liste.forEach((l) => l.objectifs.forEach((o) => { if (!codes.includes(o.code)) codes.push(o.code); }));
    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.6fr] lg:items-start">
            <section className="rounded-[24px] bg-[#0d0f1a] p-4 text-white shadow-[0_20px_60px_rgba(15,23,42,.25)]">
                <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Les stars</p>
                <ol className="mt-3 space-y-2">
                    {liste.map((l, i) => {
                        const top = i < 3 && l.score > 0;
                        const estMoi = l.id === conseillerId;
                        return (
                            <li key={l.id} className={`flex items-center gap-3 rounded-2xl px-3 ${top ? "bg-white/[.07] py-2.5 ring-1 ring-white/10" : "py-1.5"} ${estMoi ? "!ring-2 !ring-emerald-400" : ""}`}>
                                <span className={`w-6 shrink-0 text-center font-black ${top ? "text-xl" : "text-sm text-white/40"}`}>{top ? MEDAILLES[i] : i + 1}</span>
                                <CartoonAvatar prenom={l.nom} etat={top ? "en_feu" : "souriant_main"} size={top ? 44 : 32} className="shrink-0 object-contain" />
                                <span className={`min-w-0 flex-1 truncate font-black ${top ? "text-base" : "text-sm text-white/80"}`}>
                                    {prenom(l.nom)}{estMoi && <span className="ml-1 text-xs text-emerald-400">(toi)</span>}
                                </span>
                                <span className={`shrink-0 font-black tabular-nums ${top ? "text-2xl" : "text-base text-white/80"}`}>{l.score}</span>
                            </li>
                        );
                    })}
                </ol>
                {message && <p className="mt-4 rounded-2xl bg-white/[.06] px-3 py-2.5 text-xs font-bold text-amber-100">{message}</p>}
            </section>

            <section className="min-w-0 rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-5">
                <div className="mb-3">{entete}</div>
                {codes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">Pas d&apos;objectif sur ce groupe.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-y-1">
                            <thead>
                                <tr>
                                    <th />
                                    {codes.map((c) => <th key={c} className="px-1 pb-1 text-center text-xs font-black text-slate-500"><span aria-hidden="true">{emojiDe(c)}</span> {labelDe(c)}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {liste.map((l) => {
                                    const estMoi = l.id === conseillerId;
                                    const fond = estMoi ? "bg-emerald-50" : "";
                                    return (
                                        <tr key={l.id}>
                                            <td className={`rounded-l-2xl py-1.5 pl-2 pr-3 ${fond}`}>
                                                <span className="flex items-center gap-2">
                                                    <PhotoAvatar nom={l.nom} photoUrl={photos[l.id] ?? null} size={30} />
                                                    <span className="whitespace-nowrap text-sm font-black text-slate-800">{prenom(l.nom)}</span>
                                                </span>
                                            </td>
                                            {codes.map((c, j) => {
                                                const o = l.objectifs.find((x) => x.code === c);
                                                return (
                                                    <td key={c} className={`px-1 py-1.5 ${fond} ${j === codes.length - 1 ? "rounded-r-2xl" : ""}`}>
                                                        {o ? (
                                                            <span className="flex items-center justify-center gap-1.5">
                                                                <Anneau o={o} taille={48} epais={6} label={labelDe(c)} />
                                                                {o.objectif > 0 && <span className="text-xs font-bold tabular-nums text-slate-400">/{o.objectif}</span>}
                                                            </span>
                                                        ) : <span className="block text-center text-xs text-slate-300">—</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-3"><Legende periode={periode} /></div>
            </section>
        </div>
    );
}
