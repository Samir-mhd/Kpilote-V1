"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
    Badge, EtatBadges, PALIERS_PRODUIT, TIER_LABELS, TIER_COULEURS, PRODUIT_BADGES,
    BOX_BADGES, PRODUIT_STREAK_BADGES, PRODUITS_STREAK, JOUR_PARFAIT_BADGES, PALIERS_JOURS_PARFAITS,
    SEMAINE_PARFAITE_BADGE, SEUIL_SEMAINE, DEFI_JOUR_BADGES, PALIERS_DEFIS_JOUR, SERIE_DEFIS_JOUR,
} from "@/services/badgesService";
import { StreakInfo, STREAK_BADGES, GELS_PAR_MOIS } from "@/services/streakService";
import { getDetenteursBadges, construireClassementTrophees } from "@/services/badgesManagerService";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { CATEGORIES_MOIS, ClassementMois, calculerClassementMois, attribuerTropheesMoisPrecedent } from "@/services/tropheesMoisService";

/**
 * Trophées repensés (variante &trophees=v2) : un tableau de progression plutôt qu'une vitrine.
 * Score global + rang, 3 prochains trophées avec progression, derniers débloqués, puis la
 * collection compacte par famille (progression et rareté sur chaque trophée, règles dépliables).
 */

type Item = { badge: Badge; obtenuLe?: string; valeur?: number; seuil?: number; nouveau?: boolean };
type Famille = { id: string; titre: string; regles: string; items: Item[] };

export default function TropheesV2({ conseillerId, info, etat }: { conseillerId: string; info: StreakInfo; etat: EtatBadges }) {
    const [rarete, setRarete] = useState<Record<string, number>>({});
    const [effectif, setEffectif] = useState(0);
    const [rang, setRang] = useState(0);
    const [reglesOuvertes, setReglesOuvertes] = useState<string | null>(null);
    const [courseMois, setCourseMois] = useState<ClassementMois | null>(null);

    useEffect(() => {
        Promise.all([getDetenteursBadges(), construireClassementTrophees()]).then(([parBadge, classement]) => {
            setRarete(Object.fromEntries(Object.entries(parBadge).map(([code, l]) => [code, l.length])));
            setEffectif(classement.length);
            setRang(classement.findIndex((c) => c.id === conseillerId) + 1);
        }).catch(() => {});
        // Titres du mois : attribue ceux du mois dernier (une seule fois pour toute l'équipe), puis course en direct.
        const now = new Date();
        attribuerTropheesMoisPrecedent().catch(() => {})
            .then(() => calculerClassementMois(new Date(now.getFullYear(), now.getMonth(), 1)))
            .then(setCourseMois).catch(() => {});
    }, [conseillerId]);

    const d = etat.debloques;
    const nouveau = (code: string) => etat.nouveaux.includes(code);

    const familles: Famille[] = [
        {
            id: "serie", titre: "🔥 Série",
            regles: "Paliers 3, 7, 14, 30, 60 et 100 jours. Au moins une vente (hors Spiderhome) chaque jour planifié. Repos, formation, congés et arrêts ne comptent pas. Un jour planifié sans vente casse la série, sauf si tu as un gel (1 par mois, utilisé automatiquement).",
            items: STREAK_BADGES.map((s) => ({
                badge: { code: s.code, label: s.label, emoji: s.emoji, de: s.de, a: s.a, description: `${s.seuil} jours d'affilée` },
                obtenuLe: info.badgesObtenus[s.code], valeur: info.streakActuel, seuil: s.seuil,
            })),
        },
        {
            id: "produit", titre: "🏅 Maîtrise produit",
            regles: "Ventes cumulées à vie par produit : Bronze, Argent puis Or. Spiderhome n'entre jamais en compte.",
            items: Object.entries(PALIERS_PRODUIT).flatMap(([code, seuils]) => seuils.map((seuil, i) => {
                const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
                const b = PRODUIT_BADGES.find((x) => x.code === `produit_${code}_${i}`)!;
                return {
                    badge: { ...b, label: `${produit.label} ${TIER_LABELS[i]}`, emoji: produit.emoji, de: TIER_COULEURS[i][0], a: TIER_COULEURS[i][1], description: `${seuil} ventes à vie` },
                    obtenuLe: d[b.code], valeur: etat.volumeParProduit[code] ?? 0, seuil, nouveau: nouveau(b.code),
                };
            })),
        },
        {
            id: "jours", titre: "🎯 Jours parfaits",
            regles: "Un jour parfait = au moins 80 % de tes objectifs du jour atteints (ex. 4 sur 5), hors Spiderhome. Compté à vie. La semaine parfaite demande 5 jours parfaits travaillés d'affilée.",
            items: [
                ...PALIERS_JOURS_PARFAITS.map((seuil, i) => ({ badge: JOUR_PARFAIT_BADGES[i], obtenuLe: d[`jour_parfait_${seuil}`], valeur: etat.nbJoursParfaits, seuil, nouveau: nouveau(`jour_parfait_${seuil}`) })),
                { badge: SEMAINE_PARFAITE_BADGE, obtenuLe: d[SEMAINE_PARFAITE_BADGE.code], valeur: etat.streakJoursParfaits, seuil: SEUIL_SEMAINE, nouveau: nouveau(SEMAINE_PARFAITE_BADGE.code) },
            ],
        },
        {
            id: "semaines", titre: "📅 Semaines produit parfaites",
            regles: "Au moins une vente du produit chaque jour travaillé pendant 5 jours d'affilée. Pas de gel ici : un jour manqué remet le compteur à 0.",
            items: PRODUITS_STREAK.map((code, i) => ({ badge: PRODUIT_STREAK_BADGES[i], obtenuLe: d[`streak_${code}_semaine`], valeur: etat.streakParProduit[code] ?? 0, seuil: SEUIL_SEMAINE, nouveau: nouveau(`streak_${code}_semaine`) })),
        },
        {
            id: "box", titre: "📦 Box & 4P",
            regles: "Basé sur ton suivi « Mes box » : raccordements, volume de box raccordées, aucune box perdue sur 3 mois clôturés, abonnés 4P cumulés (box + forfait).",
            items: [
                { badge: BOX_BADGES[0], obtenuLe: d["box_premier"], valeur: etat.nbBoxRaccordees, seuil: 1, nouveau: nouveau("box_premier") },
                { badge: BOX_BADGES[1], obtenuLe: d["box_closer"], valeur: etat.nbBoxRaccordees, seuil: 10, nouveau: nouveau("box_closer") },
                { badge: BOX_BADGES[2], obtenuLe: d["box_sans_faute"], nouveau: nouveau("box_sans_faute") },
                { badge: BOX_BADGES[3], obtenuLe: d["box_roi_4p"], valeur: etat.nb4PCumule, seuil: 25, nouveau: nouveau("box_roi_4p") },
            ],
        },
        {
            id: "defisjour", titre: "🎯 Défis du jour",
            regles: "Le défi proposé chaque matin au Cerebro Check : accepte-le et réussis-le dans la journée. La série demande 3 défis remportés d'affilée.",
            items: [
                ...PALIERS_DEFIS_JOUR.map((seuil, i) => ({ badge: DEFI_JOUR_BADGES[i], obtenuLe: d[`defi_jour_${seuil}`], valeur: etat.nbDefisJour, seuil, nouveau: nouveau(`defi_jour_${seuil}`) })),
                { badge: DEFI_JOUR_BADGES[4], obtenuLe: d["defi_jour_serie"], valeur: etat.serieDefisJour, seuil: SERIE_DEFIS_JOUR, nouveau: nouveau("defi_jour_serie") },
            ],
        },
    ];

    const tous = familles.flatMap((f) => f.items);
    const obtenus = tous.filter((i) => i.obtenuLe);
    const prochains = tous
        .filter((i) => !i.obtenuLe && i.seuil !== undefined && i.valeur !== undefined && i.valeur < i.seuil!)
        .sort((a, b) => (b.valeur! / b.seuil!) - (a.valeur! / a.seuil!) || (a.seuil! - a.valeur!) - (b.seuil! - b.valeur!))
        .slice(0, 3);
    const derniers = [...obtenus].sort((a, b) => (b.obtenuLe! > a.obtenuLe! ? 1 : -1)).slice(0, 4);
    const titresMois = Object.entries(d).filter(([code]) => code.startsWith("mois_"))
        .map(([code, le]) => { const [, cat, mois] = code.split("_"); return { cat: CATEGORIES_MOIS.find((c) => c.id === cat), mois, le }; })
        .filter((t) => t.cat)
        .sort((a, b) => (b.mois > a.mois ? 1 : -1));
    const nomMois = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const joursRestantsMois = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
    const pct = tous.length > 0 ? Math.round((obtenus.length / tous.length) * 100) : 0;
    const fmtDate = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

    return (
        <div className="space-y-6">
            {/* ── Score ───────────────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,.35)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
                <div className="relative grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Ma collection</p>
                        <p className="mt-1 text-5xl font-black tabular-nums">{obtenus.length}<span className="text-2xl font-bold text-white/40"> / {tous.length} trophées</span></p>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white/60">
                            {pct} % de la collection{titresMois.length > 0 && <> · <span className="font-black text-amber-300">+{titresMois.length} titre{titresMois.length > 1 ? "s" : ""} du mois</span></>}{rang > 0 && <> · <span className="font-black text-white">{rang === 1 ? "👑 1er" : `${rang}ᵉ`}</span> de l&apos;équipe sur {effectif}</>}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Série en cours</p>
                        <p className="mt-1 text-4xl font-black tabular-nums">🔥 {info.streakActuel}<span className="ml-1 text-sm font-bold text-white/50">jours</span></p>
                        <p className="mt-1 text-xs font-semibold text-white/60">
                            {info.gelsRestants}/{GELS_PAR_MOIS} gel ce mois
                            {info.risqueAujourdhui && !info.aVenduAujourdhui && <span className="text-amber-300"> · une vente aujourd&apos;hui pour la garder !</span>}
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Prochains trophées ──────────────────────────────── */}
            {prochains.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-slate-400">🎯 Tes prochains trophées</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {prochains.map((i) => (
                            <div key={i.badge.code} className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)] ring-1 ring-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `linear-gradient(135deg, ${i.badge.de}, ${i.badge.a})` }}>{i.badge.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="truncate font-black text-slate-900">{i.badge.label}</p>
                                        <p className="truncate text-xs font-semibold text-slate-400">{i.badge.description}</p>
                                    </div>
                                </div>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min((i.valeur! / i.seuil!) * 100, 100)}%`, background: `linear-gradient(90deg, ${i.badge.de}, ${i.badge.a})` }} />
                                </div>
                                <p className="mt-1.5 flex justify-between text-xs font-bold">
                                    <span className="tabular-nums text-slate-500">{i.valeur} / {i.seuil}</span>
                                    <span className="text-violet-700">encore {i.seuil! - i.valeur!}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Trophées du mois ───────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black text-slate-900">🗓️ Trophées du mois <span className="ml-1 text-sm font-bold text-slate-400">remis en jeu chaque mois</span></h2>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{joursRestantsMois === 0 ? "Dernier jour !" : `Encore ${joursRestantsMois} j`}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {CATEGORIES_MOIS.map((cat) => {
                        const l = courseMois?.[cat.id] ?? [];
                        const tete = l.length > 0 ? l.filter((x) => x.valeur === l[0].valeur) : [];
                        const moi = l.find((x) => x.id === conseillerId);
                        const enTete = tete.some((x) => x.id === conseillerId);
                        const fmt = (v: number) => cat.unite === "%" ? `${v > 0 ? "+" : ""}${v} %` : `${v} ${cat.unite}`;
                        return (
                            <div key={cat.id} className={`rounded-2xl p-3 ${enTete ? "bg-amber-50 ring-2 ring-amber-300" : "bg-slate-50 ring-1 ring-slate-100"}`}>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `linear-gradient(135deg, ${cat.de}, ${cat.a})` }} aria-hidden="true">{cat.emoji}</span>
                                    <p className="font-black leading-tight text-slate-900">{cat.label}</p>
                                </div>
                                <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-400">{cat.description}</p>
                                <p className="mt-2 text-xs font-bold text-slate-600">
                                    {!courseMois ? "…" : tete.length === 0 ? "Personne pour l'instant — à prendre !"
                                        : enTete ? <span className="text-amber-700">👑 Tu es en tête ({fmt(l[0].valeur)})</span>
                                        : <>En tête : <span className="font-black">{tete.map((x) => x.nom).join(", ")}</span> ({fmt(l[0].valeur)})</>}
                                </p>
                                {courseMois && !enTete && <p className="text-[11px] font-semibold text-slate-400">Toi : {moi ? fmt(moi.valeur) : "—"}</p>}
                            </div>
                        );
                    })}
                </div>
                {titresMois.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {titresMois.map((t) => (
                            <span key={`${t.cat!.id}${t.mois}`} className="flex items-center gap-1.5 rounded-xl bg-white py-1 pl-1 pr-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `linear-gradient(135deg, ${t.cat!.de}, ${t.cat!.a})` }} aria-hidden="true">{t.cat!.emoji}</span>
                                {t.cat!.label} · <span className="capitalize text-slate-400">{nomMois(t.mois)}</span>
                            </span>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Derniers débloqués ──────────────────────────────── */}
            {derniers.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-slate-400">✨ Derniers débloqués</h2>
                    <div className="flex flex-wrap gap-2">
                        {derniers.map((i) => (
                            <span key={i.badge.code} className="flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-100">
                                <span className="flex h-7 w-7 items-center justify-center rounded-xl text-base" style={{ background: `linear-gradient(135deg, ${i.badge.de}, ${i.badge.a})` }} aria-hidden="true">{i.badge.emoji}</span> {i.badge.label}
                                <span className="text-[11px] font-bold text-slate-400">· {fmtDate(i.obtenuLe!)}</span>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Collection par famille ──────────────────────────── */}
            {familles.map((f) => {
                const nb = f.items.filter((i) => i.obtenuLe).length;
                return (
                    <section key={f.id} className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-black text-slate-900">{f.titre} <span className="ml-1 text-sm font-bold tabular-nums text-slate-400">{nb}/{f.items.length}</span></h2>
                            <button onClick={() => setReglesOuvertes(reglesOuvertes === f.id ? null : f.id)} aria-expanded={reglesOuvertes === f.id} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <Info size={14} /> Règles
                            </button>
                        </div>
                        {reglesOuvertes === f.id && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{f.regles}</p>}
                        <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 ${f.items.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
                            {f.items.map((i) => {
                                const ok = !!i.obtenuLe;
                                const nbDetenteurs = rarete[i.badge.code] ?? 0;
                                return (
                                    <div
                                        key={i.badge.code}
                                        title={i.badge.description}
                                        className={`relative rounded-2xl p-3 ${ok ? "bg-white shadow-[0_4px_14px_rgba(15,23,42,.08)] ring-2" : "bg-slate-50 ring-1 ring-slate-100"} ${i.nouveau ? "!ring-amber-400" : ""}`}
                                        style={ok ? { ["--tw-ring-color" as string]: i.badge.a } : undefined}
                                    >
                                        <div className="flex items-start justify-between">
                                            {ok
                                                ? <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${i.badge.de}, ${i.badge.a})` }} aria-hidden="true">{i.badge.emoji}</span>
                                                : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl opacity-50 grayscale" aria-hidden="true">{i.badge.emoji}</span>}
                                            {i.nouveau && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Nouveau</span>}
                                        </div>
                                        <p className={`mt-1 truncate text-sm font-black ${ok ? "text-slate-900" : "text-slate-500"}`}>{i.badge.label}</p>
                                        <p className={`truncate text-[11px] font-semibold text-slate-400`}>{i.badge.description}</p>
                                        {ok ? (
                                            <p className="mt-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">✓ Débloqué le {fmtDate(i.obtenuLe!)}</p>
                                        ) : i.seuil !== undefined && i.valeur !== undefined ? (
                                            <div className="mt-2">
                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min((i.valeur / i.seuil) * 100, 100)}%` }} />
                                                </div>
                                                <p className="mt-1 text-[10px] font-bold tabular-nums text-slate-400">{Math.min(i.valeur, i.seuil)} / {i.seuil}</p>
                                            </div>
                                        ) : <p className="mt-1.5 text-[10px] font-bold text-slate-400">🔒 À débloquer</p>}
                                        {effectif > 0 && (
                                            <p className={`mt-1 text-[10px] font-semibold text-slate-400`}>
                                                {nbDetenteurs === 0 ? "Personne ne l'a encore" : `${nbDetenteurs}/${effectif} de l'équipe l'ont`}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
