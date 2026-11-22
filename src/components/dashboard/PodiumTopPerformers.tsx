"use client";

import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import type { Periode } from "@/utils/periodes";
import { accord, useGenres, type Genre } from "@/utils/genre";

type Participant = { id: string; nom: string; total: number };

type Props = {
    classement: Participant[];
    /** Conseiller connecté — absent côté manager (bandeau équipe au lieu du message perso). */
    conseillerId?: string;
    /** Unité comptée ("vente" par défaut) ; null = pas d'unité (ex. Quali : avis, récap, pas des ventes). */
    unite?: string | null;
    periode: Periode;
};

const QUAND: Record<Periode, string> = {
    jour: "aujourd'hui",
    semaine: "cette semaine",
    mois: "ce mois-ci",
};

const STARS: Record<Periode, string> = {
    jour: "Les stars du jour",
    semaine: "Les stars de la semaine",
    mois: "Les stars du mois",
};

// Ordre visuel : 2e à gauche, 1er au centre, 3e à droite. Une carte « affiche » par place,
// cadre or / argent / bronze, la plus haute au centre.
const PLACES = [
    {
        rang: 2,
        medaille: "🥈",
        hauteur: "h-[250px] sm:h-[330px]",
        avatar: "w-24 sm:w-36",
        cadre: "from-slate-200 via-slate-300 to-slate-500",
        halo: "rgba(148,163,184,.40)",
    },
    {
        rang: 1,
        medaille: "🥇",
        hauteur: "h-[290px] sm:h-[390px]",
        avatar: "w-28 sm:w-44",
        cadre: "from-amber-200 via-yellow-400 to-amber-500",
        halo: "rgba(251,191,36,.50)",
    },
    {
        rang: 3,
        medaille: "🥉",
        hauteur: "h-[230px] sm:h-[300px]",
        avatar: "w-20 sm:w-32",
        cadre: "from-orange-300 via-orange-400 to-amber-700",
        halo: "rgba(234,88,12,.38)",
    },
];

function pluriel(n: number, mot: string | null): string {
    return mot ? `${n} ${mot}${n > 1 ? "s" : ""}` : `${n}`;
}

/** Message personnel : ce qu'il manque pour monter (ou garder sa place). */
function messageMotivation(classement: Participant[], conseillerId: string, unite: string | null, genre: Genre = null): string | null {
    const idx = classement.findIndex((c) => c.id === conseillerId);
    if (idx < 0) return null;
    const moi = classement[idx];
    const rang = idx + 1;

    if (rang === 1) {
        const second = classement[1];
        if (!second) return "👑 Tu es en tête. Garde la couronne !";
        const avance = moi.total - second.total;
        return avance > 0
            ? `👑 Tu es en tête avec ${pluriel(avance, unite)} d'avance sur ${second.nom}. Ne lâche rien !`
            : `👑 Tu es en tête, mais ${second.nom} est à égalité. ${unite ? `Une ${unite} de plus` : "Encore un"} et la couronne est à toi ${accord(genre, "seul", "seule")} !`;
    }

    const devant = classement[idx - 1];
    const ecart = devant.total - moi.total + 1;
    if (rang <= 3) {
        return `🔥 Tu es sur le podium ! Encore ${pluriel(ecart, unite)} pour passer devant ${devant.nom}.`;
    }

    const troisieme = classement[2];
    const ecartPodium = troisieme.total - moi.total + 1;
    return `🚀 Tu es #${rang}. Plus que ${pluriel(ecartPodium, unite)} pour monter sur le podium !`;
}

/** Bandeau côté manager : avance du leader + qui est le plus proche d'entrer sur le podium. */
function messageEquipe(classement: Participant[], unite: string | null): string | null {
    const [premier, second] = classement;
    const parts: string[] = [];
    if (second) {
        const avance = premier.total - second.total;
        parts.push(avance > 0
            ? `👑 ${premier.nom} mène avec ${pluriel(avance, unite)} d'avance`
            : `👑 ${premier.nom} et ${second.nom} sont à égalité en tête`);
    }
    const quatrieme = classement[3];
    if (quatrieme) {
        const ecart = classement[2].total - quatrieme.total + 1;
        parts.push(`🚀 ${quatrieme.nom} (#4) est à ${pluriel(ecart, unite)} du podium`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
}

export default function PodiumTopPerformers({ classement, conseillerId, periode, unite = "vente" }: Props) {
    const genres = useGenres();
    const top3 = classement.slice(0, 3);
    if (top3.length < 2) return null;

    const podiumVide = top3[0].total === 0;
    const parRang: Record<number, Participant | undefined> = { 1: top3[0], 2: top3[1], 3: top3[2] };
    const message = podiumVide
        ? null
        : conseillerId ? messageMotivation(classement, conseillerId, unite, genres[conseillerId] ?? null) : messageEquipe(classement, unite);

    // Jauge d'écart avec la personne juste devant (conseiller connecté, hors 1re place).
    const idxMoi = conseillerId ? classement.findIndex((c) => c.id === conseillerId) : -1;
    const devant = idxMoi > 0 ? classement[idxMoi - 1] : null;
    const jaugeEcart = devant && devant.total > 0 ? Math.min(100, (classement[idxMoi].total / devant.total) * 100) : null;

    return (
        <section className="relative overflow-hidden rounded-[28px] bg-[#0d0f1a] shadow-[0_20px_60px_rgba(15,23,42,.35)]">
            {/* Projecteurs : un faisceau central (n°1) et deux latéraux */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <div className="h-[460px] w-[560px] bg-[conic-gradient(from_180deg_at_50%_0%,transparent_160deg,rgba(255,255,255,.10)_180deg,transparent_200deg)] motion-safe:animate-[podium-spot_6s_ease-in-out_infinite]" />
            </div>
            <div className="pointer-events-none absolute left-[18%] top-0 hidden h-[420px] w-[420px] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_165deg,rgba(255,255,255,.06)_180deg,transparent_195deg)] sm:block" />
            <div className="pointer-events-none absolute left-[82%] top-0 hidden h-[420px] w-[420px] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_165deg,rgba(255,255,255,.06)_180deg,transparent_195deg)] sm:block" />

            <div className="relative px-3 pb-6 pt-7 sm:px-8 sm:pb-8">
                <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 sm:text-[11px] sm:tracking-[0.35em]">
                    Top performers · {QUAND[periode]}
                </p>
                <h2 className="mt-1 text-center text-2xl font-black text-white sm:text-3xl">{STARS[periode]}</h2>

                {podiumVide ? (
                    <div className="flex flex-col items-center py-14 text-center">
                        <span className="inline-block text-6xl motion-safe:animate-[podium-couronne_2.4s_ease-in-out_infinite]">👑</span>
                        <p className="mt-4 text-lg font-black text-white">Le podium est encore vide</p>
                        <p className="mt-1 text-sm text-amber-200/70">{unite ? `La première ${unite} prend la couronne.` : "Le premier à se lancer prend la couronne."}</p>
                    </div>
                ) : (
                    <div className="mt-8 flex items-end justify-center gap-2 sm:gap-6">
                        {PLACES.map((place) => {
                            const c = parRang[place.rang];
                            if (!c) return null;
                            const first = place.rang === 1;
                            const isMoi = !!conseillerId && c.id === conseillerId;
                            return (
                                <div
                                    key={c.id}
                                    className={`relative min-w-0 flex-1 rounded-[24px] bg-gradient-to-b ${place.cadre} p-[3px] sm:max-w-[256px] sm:rounded-[28px]`}
                                    style={{ boxShadow: `0 30px 80px ${place.halo}` }}
                                >
                                    <div className={`relative flex ${place.hauteur} flex-col items-center overflow-hidden rounded-[21px] bg-gradient-to-b from-[#1b1f33] to-[#10121d] px-2 pt-4 sm:rounded-[25px] sm:px-5 sm:pt-5`}>
                                        <span className="absolute left-2 top-2 text-lg sm:left-4 sm:top-4 sm:text-3xl">{place.medaille}</span>
                                        {isMoi && (
                                            <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white sm:bottom-auto sm:left-auto sm:right-4 sm:top-5 sm:translate-x-0 sm:px-2.5 sm:py-1 sm:text-[10px]">
                                                C&apos;est toi
                                            </span>
                                        )}
                                        <div className={`relative mt-7 sm:mt-4 ${place.avatar}`}>
                                            {first && (
                                                <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 text-2xl drop-shadow-[0_4px_12px_rgba(251,191,36,.7)] motion-safe:animate-[podium-couronne_2.4s_ease-in-out_infinite] sm:-top-8 sm:text-4xl">
                                                    👑
                                                </span>
                                            )}
                                            <CartoonAvatar
                                                prenom={c.nom}
                                                etat="en_feu"
                                                className="relative aspect-square h-auto w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,.5)]"
                                            />
                                        </div>
                                        <p className={`mt-2 w-full truncate text-center font-black ${first ? "text-base text-amber-200 sm:text-xl" : "text-sm text-white sm:text-lg"}`}>
                                            {c.nom}
                                        </p>
                                        <p className="leading-none">
                                            <span className={`font-black tabular-nums text-white ${first ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"}`}>{c.total}</span>
                                            {unite && <span className="ml-1 hidden text-sm font-bold text-white/50 sm:inline">{c.total > 1 ? `${unite}s` : unite}</span>}
                                        </p>
                                        <span className="pointer-events-none absolute -bottom-5 right-1 text-[90px] font-black leading-none text-white/[.06] sm:-bottom-6 sm:right-2 sm:text-[120px]">
                                            {place.rang}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {message && (
                    <div className="relative mx-auto mt-6 flex max-w-2xl items-center gap-3 rounded-2xl bg-white/[.06] px-4 py-3 ring-1 ring-white/10 sm:mt-8 sm:px-5">
                        <p className="flex-1 text-sm font-bold text-white/90">{message}</p>
                        {jaugeEcart !== null && (
                            <div className="hidden h-2 w-32 shrink-0 rounded-full bg-white/10 sm:block" aria-hidden="true">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" style={{ width: `${jaugeEcart}%` }} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
