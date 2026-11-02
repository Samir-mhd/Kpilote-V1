"use client";

import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import type { Periode } from "@/utils/periodes";

type Participant = { id: string; nom: string; total: number };

type Props = {
    classement: Participant[];
    conseillerId: string;
    periode: Periode;
};

const QUAND: Record<Periode, string> = {
    jour: "aujourd'hui",
    semaine: "cette semaine",
    mois: "ce mois-ci",
};

// Ordre visuel : 2e à gauche, 1er au centre, 3e à droite.
const PLACES = [
    {
        rang: 2,
        avatar: "w-24 sm:w-32",
        marche: "h-24 sm:h-28",
        bloc: "from-slate-200 via-slate-300 to-slate-500",
        chiffre: "text-slate-600/80",
        aura: "from-orange-400/50 via-amber-400/20",
    },
    {
        rang: 1,
        avatar: "w-36 sm:w-48",
        marche: "h-36 sm:h-40",
        bloc: "from-amber-200 via-amber-400 to-orange-600",
        chiffre: "text-amber-900/70",
        aura: "from-orange-500/80 via-red-500/30",
    },
    {
        rang: 3,
        avatar: "w-24 sm:w-28",
        marche: "h-16 sm:h-20",
        bloc: "from-orange-200 via-orange-400 to-amber-800",
        chiffre: "text-amber-950/60",
        aura: "from-orange-400/40 via-amber-400/15",
    },
];

// Braises : positions fixes (pas de Math.random → rendu stable entre serveur et client).
const BRAISES = [
    { left: "8%",  delay: "0s",   duree: "4.2s", taille: 4 },
    { left: "17%", delay: "1.6s", duree: "5.1s", taille: 3 },
    { left: "27%", delay: "0.8s", duree: "3.8s", taille: 5 },
    { left: "38%", delay: "2.4s", duree: "4.6s", taille: 3 },
    { left: "46%", delay: "0.3s", duree: "3.5s", taille: 6 },
    { left: "53%", delay: "1.9s", duree: "4.9s", taille: 4 },
    { left: "61%", delay: "1.1s", duree: "4.1s", taille: 5 },
    { left: "70%", delay: "2.8s", duree: "5.3s", taille: 3 },
    { left: "81%", delay: "0.5s", duree: "4.4s", taille: 4 },
    { left: "91%", delay: "2.1s", duree: "3.9s", taille: 3 },
];

function pluriel(n: number, mot: string): string {
    return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/** Message personnel : ce qu'il manque pour monter (ou garder sa place). */
function messageMotivation(classement: Participant[], conseillerId: string): string | null {
    const idx = classement.findIndex((c) => c.id === conseillerId);
    if (idx < 0) return null;
    const moi = classement[idx];
    const rang = idx + 1;

    if (rang === 1) {
        const second = classement[1];
        if (!second) return "👑 Tu es en tête. Garde la couronne !";
        const avance = moi.total - second.total;
        return avance > 0
            ? `👑 Tu es en tête avec ${pluriel(avance, "vente")} d'avance sur ${second.nom}. Ne lâche rien !`
            : `👑 Tu es en tête, mais ${second.nom} est à égalité. Une vente de plus et la couronne est à toi seul·e !`;
    }

    const devant = classement[idx - 1];
    const ecart = devant.total - moi.total + 1;
    if (rang <= 3) {
        return `🔥 Tu es sur le podium ! Encore ${pluriel(ecart, "vente")} pour passer devant ${devant.nom}.`;
    }

    const troisieme = classement[2];
    const ecartPodium = troisieme.total - moi.total + 1;
    return `🚀 Tu es #${rang}. Plus que ${pluriel(ecartPodium, "vente")} pour monter sur le podium !`;
}

export default function PodiumTopPerformers({ classement, conseillerId, periode }: Props) {
    const top3 = classement.slice(0, 3);
    if (top3.length < 3) return null;

    const podiumVide = top3[0].total === 0;
    const parRang: Record<number, Participant> = { 1: top3[0], 2: top3[1], 3: top3[2] };
    const message = podiumVide ? null : messageMotivation(classement, conseillerId);

    return (
        <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_top,#4a1d06_0%,#1c1917_45%,#0c0a09_100%)] shadow-[0_20px_60px_rgba(124,45,18,.35)]">
            {/* Projecteurs derrière le n°1 */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <div className="h-[420px] w-[520px] bg-[conic-gradient(from_180deg_at_50%_0%,transparent_155deg,rgba(251,191,36,.18)_172deg,rgba(251,191,36,.28)_180deg,rgba(251,191,36,.18)_188deg,transparent_205deg)] motion-safe:animate-[podium-spot_6s_ease-in-out_infinite]" />
            </div>

            {/* Braises qui montent */}
            <div className="pointer-events-none absolute inset-0">
                {BRAISES.map((b, i) => (
                    <span
                        key={i}
                        className="absolute bottom-0 rounded-full bg-orange-400 opacity-0 shadow-[0_0_8px_2px_rgba(251,146,60,.8)] motion-safe:animate-[podium-braise_var(--duree)_ease-in_infinite]"
                        style={{
                            left: b.left,
                            width: b.taille,
                            height: b.taille,
                            animationDelay: b.delay,
                            ["--duree" as string]: b.duree,
                        }}
                    />
                ))}
            </div>

            <div className="relative px-4 pt-7 sm:px-8">
                <p className="text-center text-[11px] font-black uppercase tracking-[0.35em] text-amber-300/80">
                    🔥 Top performers
                </p>
                <h2 className="mt-1 text-center text-2xl font-black text-white sm:text-3xl">
                    Qui met le feu {QUAND[periode]} ?
                </h2>

                {podiumVide ? (
                    <div className="flex flex-col items-center py-14 text-center">
                        <span className="inline-block text-6xl motion-safe:animate-[podium-couronne_2.4s_ease-in-out_infinite]">👑</span>
                        <p className="mt-4 text-lg font-black text-white">Le podium est encore vide</p>
                        <p className="mt-1 text-sm text-amber-200/70">La première vente prend la couronne.</p>
                    </div>
                ) : (
                    <div className="mt-12 flex items-end justify-center gap-2 sm:mt-14 sm:gap-5">
                        {PLACES.map((place) => {
                            const c = parRang[place.rang];
                            const first = place.rang === 1;
                            const isMoi = c.id === conseillerId;
                            return (
                                <div key={c.id} className="flex min-w-0 flex-1 flex-col items-center sm:max-w-[200px]">
                                    {/* Avatar en feu + aura */}
                                    <div className={`relative ${place.avatar}`}>
                                        <div
                                            className={`absolute inset-[-12%] rounded-full bg-radial ${place.aura} to-transparent blur-xl motion-safe:animate-[podium-aura_1.8s_ease-in-out_infinite]`}
                                            style={{ animationDelay: `${place.rang * 0.3}s` }}
                                        />
                                        {first && (
                                            <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 text-4xl drop-shadow-[0_4px_12px_rgba(251,191,36,.7)] motion-safe:animate-[podium-couronne_2.4s_ease-in-out_infinite] sm:-top-9 sm:text-5xl">
                                                👑
                                            </span>
                                        )}
                                        <CartoonAvatar
                                            prenom={c.nom}
                                            etat="en_feu"
                                            className="relative aspect-square h-auto w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,.5)]"
                                        />
                                        {isMoi && (
                                            <span className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg ring-2 ring-white/80">
                                                C&apos;est toi
                                            </span>
                                        )}
                                    </div>

                                    {/* Nom + ventes */}
                                    <div className="mt-3 w-full text-center">
                                        <p className={`truncate font-black ${first ? "text-lg text-amber-200 sm:text-xl" : "text-sm text-white sm:text-base"}`}>
                                            {c.nom}
                                        </p>
                                        <p className="leading-none">
                                            <span className={`font-black tabular-nums text-white ${first ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
                                                {c.total}
                                            </span>
                                            <span className="ml-1 text-xs font-bold text-white/50">{c.total > 1 ? "ventes" : "vente"}</span>
                                        </p>
                                    </div>

                                    {/* Marche */}
                                    <div className={`relative mt-3 w-full overflow-hidden rounded-t-2xl bg-gradient-to-b ${place.bloc} ${place.marche} shadow-[inset_0_2px_0_rgba(255,255,255,.6)]`}>
                                        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,.45)_45%,transparent_60%)] motion-safe:animate-[podium-reflet_4s_ease-in-out_infinite]" />
                                        <span className={`absolute inset-x-0 top-2 text-center font-black ${place.chiffre} ${first ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl"}`}>
                                            {place.rang}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {message && (
                <div className="relative border-t border-white/10 bg-white/[0.06] px-5 py-3.5 text-center text-sm font-bold text-amber-100 backdrop-blur">
                    {message}
                </div>
            )}
        </section>
    );
}
