"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { calculerStreak, STREAK_BADGES, GELS_PAR_MOIS, StreakInfo } from "@/services/streakService";
import {
    calculerBadgesConseiller, PALIERS_PRODUIT, TIER_LABELS, TIER_COULEURS,
    BOX_BADGES, DEFI_BADGES, Badge, EtatBadges,
} from "@/services/badgesService";
import { PRODUITS_ORDRE } from "@/utils/produits";

function tailleFlamme(streak: number): string {
    if (streak >= 14) return "text-7xl";
    if (streak >= 7)  return "text-6xl";
    if (streak >= 3)  return "text-5xl";
    return "text-4xl";
}

// ─── Carte badge générique (box, 4P, défis) ────────────────────────────────────

function CarteBadgeGenerique({ badge, obtenuLe, sousTitre }: { badge: Badge; obtenuLe?: string; sousTitre?: string }) {
    const obtenu = !!obtenuLe;
    return (
        <div
            className={`relative overflow-hidden rounded-[22px] p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,.06)] transition-all ${
                obtenu ? "text-white" : "bg-slate-50 border border-slate-200"
            }`}
            style={obtenu ? { background: `linear-gradient(135deg, ${badge.de}, ${badge.a})` } : undefined}
        >
            <div className={`text-4xl ${obtenu ? "" : "grayscale opacity-40"}`}>{badge.emoji}</div>
            <p className={`mt-2 font-black text-sm ${obtenu ? "text-white" : "text-slate-500"}`}>{badge.label}</p>
            <p className={`text-xs font-semibold ${obtenu ? "text-white/80" : "text-slate-400"}`}>{badge.description}</p>
            {obtenu ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Débloqué le {new Date(obtenuLe!).toLocaleDateString("fr-FR")}
                </p>
            ) : sousTitre ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">{sousTitre}</p>
            ) : null}
            {!obtenu && <div className="absolute right-3 top-3 text-slate-300">🔒</div>}
        </div>
    );
}

// ─── Carte maîtrise produit (bronze / argent / or) ─────────────────────────────

function CarteMaitriseProduit({ code, volume }: { code: string; volume: number }) {
    const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
    const seuils = PALIERS_PRODUIT[code];
    const tier = seuils.filter((s) => volume >= s).length;
    const prochain = tier < 3 ? seuils[tier] : null;
    const couleurs = tier > 0 ? TIER_COULEURS[tier - 1] : null;

    return (
        <div
            className={`relative overflow-hidden rounded-[22px] p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,.06)] transition-all ${
                couleurs ? "text-white" : "bg-slate-50 border border-slate-200"
            }`}
            style={couleurs ? { background: `linear-gradient(135deg, ${couleurs[0]}, ${couleurs[1]})` } : undefined}
        >
            <div className={`text-4xl ${couleurs ? "" : "grayscale opacity-40"}`}>{produit.emoji}</div>
            <p className={`mt-2 font-black text-sm ${couleurs ? "text-white" : "text-slate-500"}`}>{produit.label}</p>
            <p className={`text-xs font-semibold ${couleurs ? "text-white/80" : "text-slate-400"}`}>
                {tier > 0 ? `${TIER_LABELS[tier - 1]} atteint` : "Pas encore débloqué"}
            </p>
            <p className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${couleurs ? "text-white/70" : "text-slate-300"}`}>
                {prochain !== null ? `${volume}/${prochain} ventes` : `${volume} ventes — palier max`}
            </p>
        </div>
    );
}

function BadgesInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";

    const [info, setInfo] = useState<StreakInfo | null>(null);
    const [etat, setEtat] = useState<EtatBadges | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        setLoading(true);
        Promise.all([calculerStreak(conseillerId), calculerBadgesConseiller(conseillerId)])
            .then(([s, e]) => { setInfo(s); setEtat(e); })
            .catch(() => { setInfo(null); setEtat(null); })
            .finally(() => setLoading(false));
    }, [conseillerId]);

    if (loading || !info || !etat) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const { streakActuel, gelsRestants, risqueAujourdhui, aVenduAujourdhui, badgesObtenus, prochainBadge } = info;

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">Ma progression</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Badges</h1>
            </div>

            {/* ── Hero streak ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-8 text-white shadow-[0_12px_48px_rgba(220,38,38,.35)]">
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col items-center text-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">Série en cours</p>
                    <div className={`${tailleFlamme(streakActuel)} leading-none`}>🔥</div>
                    <p className="text-6xl font-black tabular-nums leading-none">{streakActuel}</p>
                    <p className="text-sm font-semibold text-white/80">
                        jour{streakActuel > 1 ? "s" : ""} d'affilée avec au moins une vente
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-black backdrop-blur">
                            🧊 {gelsRestants}/{GELS_PAR_MOIS} gel{GELS_PAR_MOIS > 1 ? "s" : ""} restant{gelsRestants > 1 ? "s" : ""} ce mois
                        </span>
                        {prochainBadge && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-black backdrop-blur">
                                {prochainBadge.emoji} Prochain badge : {prochainBadge.label} à {prochainBadge.seuil}j
                            </span>
                        )}
                    </div>

                    {risqueAujourdhui && (
                        <div className="mt-5 w-full rounded-2xl bg-black/20 px-5 py-4 backdrop-blur">
                            <p className="text-sm font-semibold text-white/90">
                                ⚠️ Ta série de {streakActuel} jour{streakActuel > 1 ? "s" : ""} est en jeu — vends aujourd'hui pour la garder !
                            </p>
                        </div>
                    )}
                    {!risqueAujourdhui && aVenduAujourdhui && (
                        <p className="mt-3 text-xs font-semibold text-white/70">✅ Journée sécurisée, ta série continue demain.</p>
                    )}
                </div>
            </div>

            {/* ── Collection série ─────────────────────────────────────────────── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">🔥 Série</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {STREAK_BADGES.map((b) => {
                        const obtenu = badgesObtenus[b.code];
                        return (
                            <div
                                key={b.code}
                                className={`relative overflow-hidden rounded-[22px] p-5 text-center shadow-[0_4px_20px_rgba(15,23,42,.06)] transition-all ${
                                    obtenu ? "text-white" : "bg-slate-50 border border-slate-200"
                                }`}
                                style={obtenu ? { background: `linear-gradient(135deg, ${b.de}, ${b.a})` } : undefined}
                            >
                                <div className={`text-4xl ${obtenu ? "" : "grayscale opacity-40"}`}>{b.emoji}</div>
                                <p className={`mt-2 font-black text-sm ${obtenu ? "text-white" : "text-slate-500"}`}>{b.label}</p>
                                <p className={`text-xs font-semibold ${obtenu ? "text-white/80" : "text-slate-400"}`}>
                                    {b.seuil} jours d'affilée
                                </p>
                                {obtenu ? (
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/70">
                                        Débloqué le {new Date(obtenu).toLocaleDateString("fr-FR")}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                        {streakActuel >= b.seuil ? "Débloqué bientôt" : `Encore ${b.seuil - streakActuel} jour${b.seuil - streakActuel > 1 ? "s" : ""}`}
                                    </p>
                                )}
                                {!obtenu && (
                                    <div className="absolute right-3 top-3 text-slate-300">🔒</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Maîtrise produit ─────────────────────────────────────────────── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">🏅 Maîtrise produit</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {Object.keys(PALIERS_PRODUIT).map((code) => (
                        <CarteMaitriseProduit key={code} code={code} volume={etat.volumeParProduit[code] ?? 0} />
                    ))}
                </div>
            </div>

            {/* ── Box & 4P ─────────────────────────────────────────────────────── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">📦 Box & 4P</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CarteBadgeGenerique badge={BOX_BADGES[0]} obtenuLe={etat.debloques["box_premier"]} sousTitre={`${Math.min(etat.nbBoxRaccordees, 1)}/1 box raccordée`} />
                    <CarteBadgeGenerique badge={BOX_BADGES[1]} obtenuLe={etat.debloques["box_closer"]} sousTitre={`${etat.nbBoxRaccordees}/10 box raccordées`} />
                    <CarteBadgeGenerique badge={BOX_BADGES[2]} obtenuLe={etat.debloques["box_sans_faute"]} />
                    <CarteBadgeGenerique badge={BOX_BADGES[3]} obtenuLe={etat.debloques["box_roi_4p"]} sousTitre={`${etat.nb4PCumule}/25 abonnés 4P`} />
                </div>
            </div>

            {/* ── Défis & compétition ──────────────────────────────────────────── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">⚔️ Défis & compétition</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <CarteBadgeGenerique badge={DEFI_BADGES[0]} obtenuLe={etat.debloques["defi_premier_sang"]} sousTitre={`${Math.min(etat.defisGagnes + etat.equipeGagnes, 1)}/1 victoire`} />
                    <CarteBadgeGenerique badge={DEFI_BADGES[1]} obtenuLe={etat.debloques["defi_guerrier"]} sousTitre={`${etat.defisGagnes + etat.equipeGagnes}/5 victoires`} />
                    <CarteBadgeGenerique badge={DEFI_BADGES[2]} obtenuLe={etat.debloques["defi_invincible"]} />
                    <CarteBadgeGenerique badge={DEFI_BADGES[3]} obtenuLe={etat.debloques["defi_esprit_equipe"]} sousTitre={`${etat.equipeGagnes}/3 victoires d'équipe`} />
                </div>
            </div>

            {/* ── Légende / mécaniques ─────────────────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Comment ça marche ?</p>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">✅</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Gagner un jour de série</p>
                            <p className="text-sm text-slate-500">
                                Réalise au moins une vente (hors historisation Spiderhome) un jour où tu es planifié. Les jours de repos, formation, congé ou arrêt ne comptent pas — ils ne font ni gagner ni perdre de jour.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg">💔</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Perdre la série</p>
                            <p className="text-sm text-slate-500">
                                Un jour planifié sans aucune vente casse la série et la ramène à 0 — sauf si tu as un gel disponible ce mois-ci.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg">🧊</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Le gel de série</p>
                            <p className="text-sm text-slate-500">
                                Tu disposes d'{GELS_PAR_MOIS} gel par mois, consommé automatiquement sur le premier jour travaillé sans vente. Il absorbe le coup dur — un jour creux — sans casser ta série. Il se renouvelle chaque mois.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">🏆</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Les badges sont définitifs</p>
                            <p className="text-sm text-slate-500">
                                Une fois débloqué, un badge reste acquis pour toujours dans ta collection — même si ta série retombe ensuite à zéro. Seul le compteur "Série en cours" reflète ton streak du moment.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">🏅</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Maîtrise produit</p>
                            <p className="text-sm text-slate-500">
                                Chaque produit a 3 paliers (Bronze / Argent / Or) basés sur ton volume de ventes cumulé à vie sur ce produit. Spiderhome n'entre jamais en compte — ce n'est pas un produit commercial.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">📦</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Box & 4P</p>
                            <p className="text-sm text-slate-500">
                                Liés à ton suivi "Mes box" : premier raccordement, volume de box raccordées, aucune box perdue sur les 3 derniers mois clôturés, et le cumul de tes abonnés 4P (box + forfait confondus).
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-lg">⚔️</div>
                        <div>
                            <p className="font-black text-sm text-slate-800">Défis & compétition</p>
                            <p className="text-sm text-slate-500">
                                Comptabilisent tes victoires en défis 1v1 et en défis d'équipe. "Invincible" demande d'avoir joué au moins 3 défis 1v1 sur un même mois et de tous les avoir gagnés.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default function BadgesPage() {
    return <Suspense><BadgesInner /></Suspense>;
}
