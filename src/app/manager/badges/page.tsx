"use client";

import { useEffect, useState } from "react";
import { STREAK_BADGES, STREAK_BADGES_EXTENSION } from "@/services/streakService";
import {
    PRODUIT_BADGES, BOX_BADGES, PRODUIT_STREAK_BADGES, PALIERS_PRODUIT,
    JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE, DEFI_JOUR_BADGES, BADGES_EXTENSION, BadgeExtension, Badge,
} from "@/services/badgesService";
import { getDetenteursBadges, DetenteurBadge, construireClassementTrophees, ConseillerTrophees } from "@/services/badgesManagerService";
import { CATEGORIES_MOIS, ClassementMois, calculerClassementMois, attribuerTropheesMoisPrecedent } from "@/services/tropheesMoisService";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

type BadgeAffiche = Badge & { secrete?: boolean };

const ext = (famille: BadgeExtension["famille"]): BadgeAffiche[] =>
    BADGES_EXTENSION.filter((x) => x.famille === famille).map((x) => ({ ...x.badge, secrete: true }));

function CarteTrophee({ badge, holders, photos }: { badge: BadgeAffiche; holders: DetenteurBadge[]; photos: Record<string, string | null> }) {
    return (
        <div className={`rounded-[22px] p-5 shadow-[0_4px_20px_rgba(15,23,42,.06)] ${badge.secrete ? "border-2 border-dashed border-slate-200 bg-slate-50" : "bg-white"}`}>
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
                {badge.secrete && (
                    <span title="Carte secrète : invisible pour le conseiller tant que la dernière carte du groupe n'est pas validée" className="flex-shrink-0 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black uppercase text-white">👻 Secrète</span>
                )}
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
    const [classement, setClassement] = useState<ConseillerTrophees[]>([]);
    const [courseMois, setCourseMois] = useState<ClassementMois | null>(null);

    useEffect(() => {
        // Titres du mois précédent attribués avant lecture (idempotent).
        attribuerTropheesMoisPrecedent().catch(() => {})
            .then(() => Promise.all([getDetenteursBadges(), construireClassementTrophees()]))
            .then(async ([data, cl]) => {
                setParBadge(data);
                setClassement(cl);
                const ids = [...new Set([...Object.values(data).flat().map((h) => h.conseillerId), ...cl.map((c) => c.id)])];
                if (ids.length) setPhotos(await getPhotosByIds(ids).catch(() => ({})));
            })
            .finally(() => setLoading(false));
        const now = new Date();
        calculerClassementMois(new Date(now.getFullYear(), now.getMonth(), 1)).then(setCourseMois).catch(() => {});
    }, []);

    const streakBadgesAffiches: BadgeAffiche[] = [
        ...STREAK_BADGES.map((b) => ({ code: b.code, label: b.label, emoji: b.emoji, de: b.de, a: b.a, description: `${b.seuil} jours d'affilée` })),
        ...STREAK_BADGES_EXTENSION.map((b) => ({ code: b.code, label: b.label, emoji: b.emoji, de: b.de, a: b.a, description: `${b.seuil} jours d'affilée`, secrete: true })),
    ];
    // Maîtrise produit : Bronze/Argent/Or puis Platine/Diamant (secrètes), produit par produit.
    const produitAffiches: BadgeAffiche[] = Object.keys(PALIERS_PRODUIT).flatMap((code) => [
        ...PRODUIT_BADGES.filter((b) => b.code.startsWith(`produit_${code}_`)),
        ...ext("produit").filter((b) => b.code.startsWith(`produit_${code}_`)),
    ]);
    // Palmarès des titres du mois (codes mois_<cat>_<AAAA-MM>), du plus récent au plus ancien.
    const palmares = Object.entries(parBadge)
        .filter(([code]) => code.startsWith("mois_"))
        .map(([code, holders]) => { const [, cat, mois] = code.split("_"); return { cat: CATEGORIES_MOIS.find((c) => c.id === cat), mois, holders }; })
        .filter((p) => p.cat)
        .sort((a, b) => (b.mois > a.mois ? 1 : b.mois < a.mois ? -1 : CATEGORIES_MOIS.indexOf(a.cat!) - CATEGORIES_MOIS.indexOf(b.cat!)));
    const moisPalmares = [...new Set(palmares.map((p) => p.mois))];
    const nomMois = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const prenom = (n: string) => n.split(" ")[0];

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
                <p className="mt-2 text-slate-400">Qui a débloqué quoi, dans toute l&apos;équipe — y compris les cartes secrètes.</p>
            </div>

            {/* ── Classement des collections ── */}
            {classement.length > 0 && (
                <div>
                    <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">🏆 Classement des collections</p>
                    <div className="flex flex-wrap gap-3">
                        {classement.map((c, i) => (
                            <div key={c.id} className={`flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4 shadow-[0_4px_20px_rgba(15,23,42,.06)] ${i === 0 ? "bg-gradient-to-r from-amber-100 to-amber-50 ring-2 ring-amber-300" : "bg-white"}`}>
                                <span className="w-6 text-center text-sm font-black text-slate-400">{i === 0 ? "👑" : `${i + 1}`}</span>
                                <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={36} />
                                <div>
                                    <p className="text-sm font-black text-slate-800">{prenom(c.nom)}</p>
                                    <p className="text-xs font-bold tabular-nums text-slate-400">{c.total} trophée{c.total > 1 ? "s" : ""}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Trophées du mois ── */}
            <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">🗓️ Trophées du mois — course en cours</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {CATEGORIES_MOIS.map((cat) => {
                        const l = courseMois?.[cat.id] ?? [];
                        const fmt = (v: number) => cat.unite === "%" ? `${v > 0 ? "+" : ""}${v} %` : `${v} ${cat.unite}`;
                        return (
                            <div key={cat.id} className="rounded-[22px] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,.06)]">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl" style={{ background: `linear-gradient(135deg, ${cat.de}, ${cat.a})` }}>{cat.emoji}</div>
                                    <div className="min-w-0">
                                        <p className="font-black text-sm text-slate-800">{cat.label}</p>
                                        <p className="text-xs leading-snug text-slate-400">{cat.description}</p>
                                    </div>
                                </div>
                                {!courseMois ? <p className="text-xs text-slate-300">Chargement…</p>
                                    : l.length === 0 ? <p className="text-xs text-slate-300">Personne pour l&apos;instant</p>
                                    : (
                                        <ol className="space-y-1.5">
                                            {l.slice(0, 3).map((x, i) => (
                                                <li key={x.id} className="flex items-center gap-2">
                                                    <span className="w-5 text-center text-xs font-black text-slate-400">{x.valeur === l[0].valeur ? "👑" : i + 1}</span>
                                                    <PhotoAvatar nom={x.nom} photoUrl={photos[x.id]} size={24} />
                                                    <span className="flex-1 truncate text-xs font-bold text-slate-600">{prenom(x.nom)}</span>
                                                    <span className="text-xs font-black tabular-nums text-slate-800">{fmt(x.valeur)}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                            </div>
                        );
                    })}
                </div>
                {moisPalmares.length > 0 && (
                    <div className="mt-4 rounded-[22px] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,.06)]">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-slate-400">Palmarès</p>
                        <div className="space-y-3">
                            {moisPalmares.map((m) => (
                                <div key={m} className="flex flex-wrap items-center gap-2">
                                    <span className="w-32 text-sm font-black capitalize text-slate-700">{nomMois(m)}</span>
                                    {palmares.filter((p) => p.mois === m).map((p) => (
                                        <span key={p.cat!.id} className="flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-slate-100">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm" style={{ background: `linear-gradient(135deg, ${p.cat!.de}, ${p.cat!.a})` }}>{p.cat!.emoji}</span>
                                            <span className="text-xs font-bold text-slate-500">{p.cat!.label} :</span>
                                            <span className="text-xs font-black text-slate-800">{p.holders.map((h) => prenom(h.nom)).join(", ")}</span>
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Section titre="🔥 Série" badges={streakBadgesAffiches} parBadge={parBadge} photos={photos} />
            <Section titre="📅 Semaines produit parfaites" badges={[...PRODUIT_STREAK_BADGES, ...ext("semaines")]} parBadge={parBadge} photos={photos} />
            <Section titre="🎯 Jours parfaits" badges={[...JOUR_PARFAIT_BADGES, SEMAINE_PARFAITE_BADGE, ...ext("jours")]} parBadge={parBadge} photos={photos} />
            <Section titre="🏅 Maîtrise produit" badges={produitAffiches} parBadge={parBadge} photos={photos} />
            <Section titre="📦 Box & 4P" badges={[...BOX_BADGES, ...ext("box")]} parBadge={parBadge} photos={photos} />
            <Section titre="🎯 Défis du jour" badges={[...DEFI_JOUR_BADGES, ...ext("defisjour")]} parBadge={parBadge} photos={photos} />
            <p className="text-xs text-slate-400">👻 Cartes secrètes : invisibles pour le conseiller tant que la dernière carte de leur groupe n&apos;est pas validée.</p>
        </main>
    );
}
