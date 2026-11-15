"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import CartoonAvatar, { type AvatarEtat } from "@/components/avatar/CartoonAvatar";
import { AVATAR_PHRASES } from "@/components/dashboard/HeroHeader";
import type { ProchainBadge } from "@/services/badgesService";
import { accorderPhrase, type Genre } from "@/utils/genre";

type Props = {
    nom: string;
    avatarEtat: AvatarEtat;
    rang: number;
    realise: number;
    objectif: number;
    taux: number;
    /** null = variable désactivée pour ce conseiller (pas de tuile cagnotte). */
    cagnotte: { total: number; hier: number | null; flash: { key: number; montant: number; label?: string } | null } | null;
    prochainBadge: ProchainBadge | null;
    badgeHref: string;
    /** false = pas planifié aujourd'hui (off, congés…) : jamais de relance d'inactivité. */
    travailleAujourdhui?: boolean;
    genre?: Genre;
};

// Situations qui priment sur l'état "temps depuis la dernière vente" de l'avatar : un conseiller
// à 200 % ou en tête du classement ne doit jamais lire "réveille-toi".
const PHRASES_JOURNEE_COMPLETE = [
    "Journée complète, {nom} ! Tout ce qui suit, c'est du bonus. 🏆",
    "Objectif du jour plié ! Chaque vente en plus creuse l'écart. 🏆",
    "Contrat rempli, {nom} ! Et si on visait encore plus haut ?",
];
const PHRASES_EN_TETE = [
    "Tu es en tête, {nom} ! Une vente de plus pour creuser l'écart. 👑",
    "N°1 du jour ! Garde la couronne. 👑",
];

// Boutique ouverte de 10h à 20h : hors de ces horaires, pas de relance d'inactivité.
const OUVERTURE_H = 10;
const FERMETURE_H = 20;
const PHRASES_AVANT_OUVERTURE = [
    "Bonjour {nom} 👋 Ouverture à 10h, prêt{e} à cartonner ?",
    "Salut {nom} ! Plus que quelques minutes avant l'ouverture.",
];
const PHRASES_APRES_FERMETURE_VENTES = [
    "Journée bouclée, {nom} ! Bravo pour tes ventes. 👏",
    "La boutique est fermée — beau travail aujourd'hui, {nom} !",
];
const PHRASES_APRES_FERMETURE_SANS_VENTE = [
    "La boutique est fermée. Repose-toi bien, {nom}, demain c'est une nouvelle journée !",
];

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** Ordre de priorité : série en feu > journée complète > hors horaires d'ouverture > en tête >
 *  état avatar habituel (dont les relances glaçon / endormi, donc seulement de 10h à 20h). */
const PHRASES_REPOS = ["Jour de repos, {nom} ! Profite bien 🌴", "Pas de vente au programme aujourd'hui, {nom}. Recharge les batteries ! 🌴"];

function situation(avatarEtat: AvatarEtat, taux: number, rang: number, realise: number, heure: number, travaille: boolean): { etat: AvatarEtat; phrases: string[] } {
    if (!travaille && realise === 0) return { etat: "souriant_main", phrases: PHRASES_REPOS };
    const inactif = avatarEtat === "glacon" || avatarEtat === "endormi";
    if (avatarEtat === "en_feu") return { etat: "en_feu", phrases: AVATAR_PHRASES.en_feu };
    if (taux >= 100 && realise > 0) return { etat: inactif ? "heureux_gagne" : avatarEtat, phrases: PHRASES_JOURNEE_COMPLETE };
    if (heure < OUVERTURE_H) return { etat: "souriant_main", phrases: PHRASES_AVANT_OUVERTURE };
    if (heure >= FERMETURE_H) {
        return realise > 0
            ? { etat: "souriant_main", phrases: PHRASES_APRES_FERMETURE_VENTES }
            : { etat: "souriant_main", phrases: PHRASES_APRES_FERMETURE_SANS_VENTE };
    }
    if (rang === 1 && realise > 0 && inactif) return { etat: "souriant_main", phrases: PHRASES_EN_TETE };
    return { etat: avatarEtat, phrases: AVATAR_PHRASES[avatarEtat] };
}

export default function HeroCompact({ nom, avatarEtat, rang, realise, objectif, taux, cagnotte, prochainBadge, badgeHref, travailleAujourdhui = true, genre = null }: Props) {
    const prenom = nom.split(" ")[0];
    // Heure relue chaque minute pour basculer à l'ouverture / la fermeture sans recharger.
    const [heure, setHeure] = useState(() => new Date().getHours());
    useEffect(() => {
        const id = setInterval(() => setHeure(new Date().getHours()), 60_000);
        return () => clearInterval(id);
    }, []);
    const { etat, phrases } = situation(avatarEtat, taux, rang, realise, heure, travailleAujourdhui);

    // Phrase stable pour la journée (pas de Math.random → même rendu serveur et navigateur),
    // qui varie d'un jour et d'un conseiller à l'autre.
    const titre = useMemo(() => {
        const graine = [...`${prenom}${new Date().toDateString()}`].reduce((t, c) => t + c.charCodeAt(0), 0);
        return accorderPhrase(phrases[graine % phrases.length].replace("{nom}", prenom), genre);
    }, [phrases, prenom, genre]);

    const [flashVisible, setFlashVisible] = useState<{ key: number; montant: number; label?: string } | null>(null);
    useEffect(() => {
        if (!cagnotte?.flash) return;
        setFlashVisible(cagnotte.flash);
        const t = setTimeout(() => setFlashVisible(null), cagnotte.flash.label ? 2200 : 1400);
        return () => clearTimeout(t);
    }, [cagnotte?.flash]);

    const hier = cagnotte?.hier ?? null;
    // Pas de badge tant que rien n'est fait aujourd'hui (évite un "-100 % vs hier" chaque matin).
    const progressionCagnotte = cagnotte && cagnotte.total > 0 && hier != null && hier > 0 ? Math.round(((cagnotte.total - hier) / hier) * 100) : null;
    const pctBarre = Math.min(taux, 100);

    return (
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 text-white shadow-[0_20px_60px_rgba(49,46,129,.35)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:gap-6 xl:p-6">
                {/* Avatar + message */}
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <CartoonAvatar
                        prenom={nom}
                        etat={etat}
                        className="h-28 w-28 shrink-0 object-contain drop-shadow-[0_12px_24px_rgba(139,92,246,.45)] sm:h-32 sm:w-32"
                    />
                    <div className="min-w-0">
                        <h1 className="text-xl font-black leading-tight sm:text-2xl">{titre}</h1>
                        {prochainBadge && (
                            <Link
                                href={badgeHref}
                                className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3 text-xs font-bold text-white/85 transition-colors hover:bg-white/20"
                            >
                                <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                                    style={{ background: `linear-gradient(135deg, ${prochainBadge.badge.de}, ${prochainBadge.badge.a})` }}
                                >
                                    {prochainBadge.badge.emoji}
                                </span>
                                <span className="truncate">
                                    Prochain trophée : <span className="text-white">{prochainBadge.badge.label}</span>
                                    <span className="text-white/50"> · {prochainBadge.badge.description}</span>
                                </span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Chiffres clés */}
                <div className={`grid shrink-0 gap-2.5 ${cagnotte ? "grid-cols-3" : "grid-cols-2"} xl:w-[440px]`}>
                    {cagnotte && (
                        <div className="relative rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3.5 shadow-[0_8px_24px_rgba(192,38,211,.35)]">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Cagnotte</p>
                            <p className="mt-1 text-2xl font-black leading-none tabular-nums sm:text-[26px]">{fmtEuro(cagnotte.total)}</p>
                            {progressionCagnotte !== null && (
                                <p className={`mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold tabular-nums ${progressionCagnotte >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                                    {progressionCagnotte >= 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                                    {progressionCagnotte >= 0 ? "+" : ""}{progressionCagnotte} % vs hier
                                </p>
                            )}
                            {flashVisible && (
                                <span
                                    key={flashVisible.key}
                                    className="pointer-events-none absolute right-3 top-2 text-sm font-black text-emerald-200"
                                    style={{ animation: `cagnotteFloat ${flashVisible.label ? "2.2s" : "1.4s"} ease-out forwards` }}
                                >
                                    +{fmtEuro(flashVisible.montant)}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Actes du jour</p>
                        <p className="mt-1 leading-none">
                            <span className="text-3xl font-black tabular-nums">{realise}</span>
                            <span className="ml-1 text-sm font-bold text-white/40">/ {objectif}</span>
                        </p>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                                className={`h-full rounded-full ${taux >= 100 ? "bg-emerald-400" : "bg-violet-300"} transition-all duration-700`}
                                style={{ width: `${pctBarre}%` }}
                            />
                        </div>
                        <p className={`mt-1.5 text-[11px] font-bold ${taux >= 100 ? "text-emerald-300" : "text-white/50"}`}>
                            {taux >= 100 ? `✓ ${taux} %` : `${taux} %`}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Classement jour</p>
                        <p className="mt-1 text-3xl font-black leading-none tabular-nums">
                            {rang > 0 ? `#${rang}` : "–"}
                        </p>
                        <p className="mt-3 text-[11px] font-bold text-white/50">{rang === 1 ? "👑 en tête" : "aujourd'hui"}</p>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes cagnotteFloat {
                    0%   { opacity: 0; transform: translateY(10px) scale(.8); }
                    20%  { opacity: 1; transform: translateY(0) scale(1.1); }
                    80%  { opacity: 1; transform: translateY(-18px) scale(1); }
                    100% { opacity: 0; transform: translateY(-30px) scale(.9); }
                }
            `}</style>
        </section>
    );
}
