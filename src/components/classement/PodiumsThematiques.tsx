"use client";

import { useEffect, useState } from "react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getRealiseVentesComboParConseiller, RealiseVentesCombo } from "@/services/variableConseiller";
import { getActesParJour } from "@/services/podiumsService";
import { getPhotosByIds } from "@/services/photoService";
import { joursPeriode } from "@/utils/periodes";

/**
 * Onglet "Podiums" du Classement : plusieurs mini-podiums sur des critères différents, pour que
 * chacun puisse briller quelque part (volume, record sur une journée, upsell, panier, produits).
 */

type PeriodePodium = "semaine" | "mois";

type Critere = {
    id: string;
    emoji: string;
    titre: string;
    sousTitre: string;
    unite: (n: number) => string;
    valeurs: { id: string; valeur: number; detail?: string }[];
};

const MEDAILLES = ["🥇", "🥈", "🥉"];

function fmtJour(jour: string) {
    const [, m, d] = jour.split("-");
    return `le ${d}/${m}`;
}

export default function PodiumsThematiques({ conseillerId }: { conseillerId: string }) {
    const [periode, setPeriode] = useState<PeriodePodium>("mois");
    const [stats, setStats] = useState<ConseillerStats[]>([]);
    const [combos, setCombos] = useState<Record<string, RealiseVentesCombo>>({});
    const [parJour, setParJour] = useState<Record<string, Record<string, number>>>({});
    const [photos, setPhotos] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const { debut, fin } = joursPeriode(periode);
        Promise.all([
            construireClassementPeriode(periode),
            getRealiseVentesComboParConseiller(debut, fin).catch(() => ({} as Record<string, RealiseVentesCombo>)),
            getActesParJour(debut, fin).catch(() => ({} as Record<string, Record<string, number>>)),
        ]).then(async ([s, c, j]) => {
            setStats(s);
            setCombos(c);
            setParJour(j);
            setPhotos(await getPhotosByIds(s.map((x) => x.id)).catch(() => ({})));
        }).finally(() => setLoading(false));
    }, [periode]);

    const nomDe = (id: string) => stats.find((s) => s.id === id)?.nom.split(" ")[0] ?? "";
    const pl = (mot: string) => (n: number) => `${mot}${n > 1 ? "s" : ""}`;

    const criteres: Critere[] = [
        {
            id: "actes", emoji: "🔥", titre: "Le plus d'actes", sousTitre: "Toutes ventes confondues",
            unite: pl("acte"), valeurs: stats.map((s) => ({ id: s.id, valeur: s.total })),
        },
        {
            id: "record", emoji: "⚡", titre: "Record sur une journée", sousTitre: "Meilleure journée de la période",
            unite: pl("acte"),
            valeurs: stats.map((s) => {
                const jours = Object.entries(parJour[s.id] ?? {});
                const best = jours.reduce<[string, number] | null>((b, j) => (!b || j[1] > b[1] ? j : b), null);
                return { id: s.id, valeur: best?.[1] ?? 0, detail: best ? fmtJour(best[0]) : undefined };
            }),
        },
        {
            id: "upsell", emoji: "🚀", titre: "Roi de l'upsell", sousTitre: "McAfee, assurances, Canal+",
            unite: pl("vente"),
            valeurs: stats.map((s) => {
                const c = combos[s.id];
                return { id: s.id, valeur: (s.produits.mcafee ?? 0) + (s.produits.assurance ?? 0) + (c ? c.mcafee_mobile + c.assurance_essentielle + c.canal_plus : 0) };
            }),
        },
        {
            id: "panier", emoji: "🛒", titre: "Meilleur panier", sousTitre: "Articles par vente · 10 actes min.",
            unite: () => "art./vente",
            valeurs: stats.filter((s) => s.total >= 10).map((s) => ({ id: s.id, valeur: Math.round(s.moyenneArticles * 100) / 100 })),
        },
        { id: "box", emoji: "💻", titre: "Box", sousTitre: "Le plus de box", unite: () => "box", valeurs: stats.map((s) => ({ id: s.id, valeur: s.produits.box ?? 0 })) },
        { id: "forfaits", emoji: "📶", titre: "Forfaits", sousTitre: "Le plus de forfaits", unite: pl("forfait"), valeurs: stats.map((s) => ({ id: s.id, valeur: s.produits.forfaits ?? 0 })) },
        { id: "telephones", emoji: "📲", titre: "Téléphones", sousTitre: "Le plus de téléphones", unite: pl("téléphone"), valeurs: stats.map((s) => ({ id: s.id, valeur: s.produits.telephones ?? 0 })) },
        { id: "avis", emoji: "⭐", titre: "Avis Google", sousTitre: "Le plus d'avis récoltés", unite: () => "avis", valeurs: stats.map((s) => ({ id: s.id, valeur: s.produits.avis_google ?? 0 })) },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">Chacun peut briller quelque part : un podium par critère.</p>
                <div className="flex rounded-xl bg-white p-1 text-xs font-black shadow-sm">
                    {(["semaine", "mois"] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriode(p)}
                            className={`rounded-lg px-3 py-1.5 transition-all ${periode === p ? "bg-slate-900 text-white" : "text-slate-500"}`}
                        >
                            {p === "semaine" ? "Cette semaine" : "Ce mois"}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {criteres.map((c) => {
                        const classes = [...c.valeurs].filter((v) => v.valeur > 0).sort((a, b) => b.valeur - a.valeur);
                        const top = classes.slice(0, 3);
                        const monIndex = classes.findIndex((v) => v.id === conseillerId);
                        const moi = monIndex >= 3 ? classes[monIndex] : null;
                        return (
                            <article key={c.id} className="flex flex-col rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)] ring-1 ring-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-2xl">{c.emoji}</span>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-black text-slate-900">{c.titre}</h3>
                                        <p className="truncate text-[11px] font-semibold text-slate-400">{c.sousTitre}</p>
                                    </div>
                                </div>

                                {top.length === 0 ? (
                                    <p className="mt-4 flex-1 py-4 text-center text-sm text-slate-300">Personne pour l&apos;instant</p>
                                ) : (
                                    <ol className="mt-3 space-y-1.5">
                                        {top.map((v, i) => {
                                            const isMoi = v.id === conseillerId;
                                            return (
                                                <li
                                                    key={v.id}
                                                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${
                                                        isMoi ? "bg-green-50 ring-1 ring-green-200" : i === 0 ? "bg-amber-50" : "bg-slate-50"
                                                    }`}
                                                >
                                                    <span className="text-lg leading-none">{MEDAILLES[i]}</span>
                                                    <PhotoAvatar nom={nomDe(v.id)} photoUrl={photos[v.id] ?? null} size={28} />
                                                    <span className={`min-w-0 flex-1 truncate text-sm font-black ${isMoi ? "text-green-800" : "text-slate-800"}`}>
                                                        {nomDe(v.id)}{isMoi && <span className="ml-1 text-[10px] font-bold text-green-600">(toi)</span>}
                                                    </span>
                                                    <span className="shrink-0 text-right leading-tight">
                                                        <span className="text-sm font-black tabular-nums text-slate-900">{v.valeur.toLocaleString("fr-FR")}</span>
                                                        <span className="ml-1 text-[10px] font-bold text-slate-400">{c.unite(v.valeur)}</span>
                                                        {v.detail && <span className="block text-[10px] font-semibold text-slate-400">{v.detail}</span>}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}

                                {moi && (
                                    <p className="mt-2 rounded-xl bg-green-50 px-2.5 py-1.5 text-[11px] font-bold text-green-800">
                                        Toi : {monIndex + 1}ᵉ avec {moi.valeur.toLocaleString("fr-FR")} {c.unite(moi.valeur)}
                                        {top[2] && ` · ${Math.max(Math.ceil((top[2].valeur - moi.valeur) * 100) / 100, 0).toLocaleString("fr-FR")} pour rejoindre le podium`}
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
