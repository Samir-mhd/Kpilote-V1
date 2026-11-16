"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TropheesV2 from "@/components/trophees/TropheesV2";
import { calculerStreak, StreakInfo } from "@/services/streakService";
import {
    calculerBadgesConseiller, BOX_BADGES, DEFI_BADGES, PRODUIT_STREAK_BADGES, JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE, BADGES_EXTENSION,
    DEFI_JOUR_BADGES, PRODUIT_BADGES, Badge, EtatBadges,
} from "@/services/badgesService";

const PRODUIT_BADGES_MAP: Record<string, Badge> = Object.fromEntries(PRODUIT_BADGES.map((b) => [b.code, b]));

const CELEB_KEYFRAMES = `
    @keyframes badgeCardEnter {
        0%   { opacity: 0; transform: translateY(14px) scale(.94); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes badgeGlow {
        0%, 100% { box-shadow: 0 0 0 3px rgba(251,191,36,.55), 0 8px 28px rgba(217,119,6,.35); }
        50%      { box-shadow: 0 0 0 6px rgba(251,191,36,.25), 0 8px 28px rgba(217,119,6,.45); }
    }
    @keyframes trophyBounce {
        0%   { transform: scale(.3) rotate(-8deg); opacity: 0; }
        55%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes confettiFall {
        0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
    }
`;

type Particule = { id: number; left: number; color: string; size: number; delay: number; duree: number };
const CONFETTI_COLORS = ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];
function genererConfettis(n = 40): Particule[] {
    return Array.from({ length: n }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.5,
        duree: 1.4 + Math.random() * 1,
    }));
}

function BadgesInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";

    const [info, setInfo] = useState<StreakInfo | null>(null);
    const [etat, setEtat] = useState<EtatBadges | null>(null);
    const [loading, setLoading] = useState(true);
    const [celebration, setCelebration] = useState<{ badges: Badge[]; confettis: Particule[] } | null>(null);

    const TOUS_BADGES = [
        ...BOX_BADGES, ...DEFI_BADGES, ...PRODUIT_STREAK_BADGES, ...JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE, ...DEFI_JOUR_BADGES,
        ...BADGES_EXTENSION.map((x) => x.badge),
    ];

    useEffect(() => {
        if (!conseillerId) return;
        setLoading(true);
        Promise.all([calculerStreak(conseillerId), calculerBadgesConseiller(conseillerId)])
            .then(([s, e]) => {
                setInfo(s);
                setEtat(e);
                if (e.nouveaux.length > 0) {
                    // Les tiers produit sont générés dynamiquement (PRODUIT_BADGES) : recherche par code.
                    const badgesDebloques = e.nouveaux
                        .map((code) => TOUS_BADGES.find((b) => b.code === code) ?? PRODUIT_BADGES_MAP[code])
                        .filter((b): b is Badge => !!b);
                    if (badgesDebloques.length > 0) {
                        setCelebration({ badges: badgesDebloques, confettis: genererConfettis() });
                        setTimeout(() => setCelebration(null), 4200);
                    }
                }
            })
            .catch(() => { setInfo(null); setEtat(null); })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conseillerId]);

    if (loading || !info || !etat) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8">

            {/* ── Célébration nouveau(x) badge(s) ─────────────────────────────── */}
            {celebration && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-hidden bg-slate-950/70 backdrop-blur-sm"
                    onClick={() => setCelebration(null)}
                >
                    {celebration.confettis.map((p) => (
                        <div
                            key={p.id}
                            className="pointer-events-none absolute top-0 rounded-sm"
                            style={{
                                left: `${p.left}%`,
                                width: p.size,
                                height: p.size * 1.6,
                                background: p.color,
                                animation: `confettiFall ${p.duree}s linear ${p.delay}s forwards`,
                            }}
                        />
                    ))}
                    <span className="text-7xl" style={{ animation: "trophyBounce .5s cubic-bezier(.16,1,.3,1)" }}>🏆</span>
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300">Badge débloqué !</p>
                    <div className="flex flex-wrap justify-center gap-3 px-6">
                        {celebration.badges.map((b) => (
                            <div key={b.code} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur">
                                <span className="text-2xl">{b.emoji}</span>
                                <span className="text-sm font-black text-white">{b.label}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white/40">Touche l'écran pour continuer</p>
                </div>
            )}

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">Ma progression</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Trophées</h1>
            </div>

            <TropheesV2 conseillerId={conseillerId} info={info} etat={etat} />

            <style>{CELEB_KEYFRAMES}</style>
        </div>
    );
}

export default function BadgesPage() {
    return <Suspense><BadgesInner /></Suspense>;
}
