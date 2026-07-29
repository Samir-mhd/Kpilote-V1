"use client";

import { useEffect, useState } from "react";
import { STREAK_BADGES } from "@/services/streakService";
import {
    PRODUIT_BADGES, BOX_BADGES, DEFI_BADGES, PRODUIT_STREAK_BADGES,
    JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE, Badge,
} from "@/services/badgesService";
import { getDetenteursBadges, DetenteurBadge } from "@/services/badgesManagerService";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

type BadgeAffiche = Badge;

function CarteTrophee({ badge, holders, photos }: { badge: BadgeAffiche; holders: DetenteurBadge[]; photos: Record<string, string | null> }) {
    return (
        <div className="rounded-[22px] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,.06)]">
            <div className="mb-3 flex items-center gap-3">
                <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl"
                    style={{ background: `linear-gradient(135deg, ${badge.de}, ${badge.a})` }}
                >
                    {badge.emoji}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-sm text-slate-800">{badge.label}</p>
                    <p className="truncate text-xs text-slate-400">{badge.description}</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                    {holders.length}
                </span>
            </div>

            {holders.length === 0 ? (
                <p className="text-xs text-slate-300">Personne pour l'instant</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {holders.map((h) => (
                        <div
                            key={h.conseillerId}
                            title={`Débloqué le ${new Date(h.obtenuLe).toLocaleDateString("fr-FR")}`}
                            className="flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pr-3"
                        >
                            <PhotoAvatar nom={h.nom} photoUrl={photos[h.conseillerId]} size={26} />
                            <span className="text-xs font-bold text-slate-600">{h.nom.split(" ")[0]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Section({ titre, badges, parBadge, photos }: {
    titre: string;
    badges: BadgeAffiche[];
    parBadge: Record<string, DetenteurBadge[]>;
    photos: Record<string, string | null>;
}) {
    return (
        <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{titre}</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {badges.map((b) => (
                    <CarteTrophee key={b.code} badge={b} holders={parBadge[b.code] ?? []} photos={photos} />
                ))}
            </div>
        </div>
    );
}

export default function BadgesManagerPage() {
    const [parBadge, setParBadge] = useState<Record<string, DetenteurBadge[]>>({});
    const [photos, setPhotos] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDetenteursBadges()
            .then(async (data) => {
                setParBadge(data);
                const ids = [...new Set(Object.values(data).flat().map((h) => h.conseillerId))];
                if (ids.length) setPhotos(await getPhotosByIds(ids).catch(() => ({})));
            })
            .finally(() => setLoading(false));
    }, []);

    const streakBadgesAffiches: BadgeAffiche[] = STREAK_BADGES.map((b) => ({
        code: b.code, label: b.label, emoji: b.emoji, de: b.de, a: b.a,
        description: `${b.seuil} jours d'affilée`,
    }));

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <main className="space-y-8">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">Mur des trophées</p>
                <h1 className="mt-1 text-4xl font-black text-slate-900">Trophées</h1>
                <p className="mt-2 text-slate-400">Qui a débloqué quoi, dans toute l'équipe.</p>
            </div>

            <Section titre="🔥 Série" badges={streakBadgesAffiches} parBadge={parBadge} photos={photos} />
            <Section titre="📅 Semaines produit parfaites" badges={PRODUIT_STREAK_BADGES} parBadge={parBadge} photos={photos} />
            <Section titre="🎯 Objectifs jour" badges={[...JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE]} parBadge={parBadge} photos={photos} />
            <Section titre="🏅 Maîtrise produit" badges={PRODUIT_BADGES} parBadge={parBadge} photos={photos} />
            <Section titre="📦 Box & 4P" badges={BOX_BADGES} parBadge={parBadge} photos={photos} />
            <Section titre="⚔️ Défis & compétition" badges={DEFI_BADGES} parBadge={parBadge} photos={photos} />
        </main>
    );
}
