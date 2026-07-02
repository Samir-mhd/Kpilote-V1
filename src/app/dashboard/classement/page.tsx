"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

type Periode = "jour" | "semaine" | "mois";
type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir };

type ConseillerRow = {
    id: string;
    nom: string;
    produits: Record<string, number>;
    total: number;
};

const periodeLabels: Record<Periode, string> = {
    jour: "Aujourd'hui",
    semaine: "Semaine",
    mois: "Ce mois",
};

function dateDebut(periode: Periode): string {
    const now = new Date();
    if (periode === "jour") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    if (periode === "semaine") {
        const jour = now.getDay();
        const diffLundi = jour === 0 ? -6 : 1 - jour;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffLundi).toISOString();
    }
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function SortTh({
    col,
    label,
    sort,
    onSort,
    align = "left",
}: {
    col: string;
    label: string;
    sort: SortState;
    onSort: (col: string) => void;
    align?: "left" | "right";
}) {
    const active = sort.key === col;
    return (
        <th
            onClick={() => onSort(col)}
            className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] ${align === "right" ? "text-right" : "text-left"}`}
        >
            <span
                className={`inline-flex items-center gap-1 transition-colors ${
                    active ? "text-green-600" : "text-slate-400 hover:text-slate-600"
                }`}
            >
                {align === "right" && (
                    <span className="text-[10px]">
                        {active ? (sort.dir === "desc" ? "↓" : "↑") : "⇅"}
                    </span>
                )}
                {label}
                {align === "left" && (
                    <span className="text-[10px]">
                        {active ? (sort.dir === "desc" ? "↓" : "↑") : "⇅"}
                    </span>
                )}
            </span>
        </th>
    );
}

const medals = ["🥇", "🥈", "🥉"];

export default function ClassementPage() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";

    const [periode, setPeriode] = useState<Periode>("mois");
    const [classement, setClassement] = useState<ConseillerRow[]>([]);
    const [produits, setProduits] = useState<string[]>([]);
    const [photos, setPhotos] = useState<Record<string, string | null>>({});
    const [loading, setLoading] = useState(true);
    const [dernierUpdate, setDernierUpdate] = useState("");
    const [sort, setSort] = useState<SortState>({ key: "total", dir: "desc" });

    function handleSort(col: string) {
        setSort((prev) =>
            prev.key === col
                ? { key: col, dir: prev.dir === "desc" ? "asc" : "desc" }
                : { key: col, dir: "desc" }
        );
    }

    async function charger(p: Periode) {
        setLoading(true);
        try {
            const debut = dateDebut(p);

            const [{ data: cons }, ventesRes] = await Promise.all([
                supabase.from("conseillers").select("id, nom"),
                supabase.from("ventes").select("conseiller_id, produit, quantite").gte("created_at", debut),
            ]);

            let ventesData = ventesRes.data;
            if (ventesRes.error?.message?.includes("created_at")) {
                const { data } = await supabase.from("ventes").select("conseiller_id, produit, quantite");
                ventesData = data;
            }

            const rows: Record<string, ConseillerRow> = {};
            const allProduits = new Set<string>();

            (cons ?? []).forEach((c: any) => {
                rows[c.id] = { id: c.id, nom: c.nom, produits: {}, total: 0 };
            });

            (ventesData ?? []).forEach((v: any) => {
                if (!rows[v.conseiller_id]) return;
                if (v.produit) {
                    allProduits.add(v.produit);
                    rows[v.conseiller_id].produits[v.produit] =
                        (rows[v.conseiller_id].produits[v.produit] ?? 0) + (v.quantite ?? 1);
                }
                rows[v.conseiller_id].total += v.quantite ?? 1;
            });

            const sorted = Object.values(rows).sort((a, b) => b.total - a.total);
            const produitsListe = [...allProduits].sort();

            setProduits(produitsListe);
            setClassement(sorted);
            setDernierUpdate(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
            const ids = sorted.map((c) => c.id);
            getPhotosByIds(ids).then(setPhotos).catch(() => {});
        } catch { /* silencieux */ }
        finally { setLoading(false); }
    }

    useEffect(() => {
        charger(periode);

        const channel = supabase
            .channel("classement-realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, () => {
                charger(periode);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [periode]);

    const sortedRows = [...classement].sort((a, b) => {
        const va = sort.key === "total" ? a.total : (a.produits[sort.key] ?? 0);
        const vb = sort.key === "total" ? b.total : (b.produits[sort.key] ?? 0);
        return sort.dir === "desc" ? vb - va : va - vb;
    });

    const monRang = classement.findIndex((c) => c.id === conseillerId) + 1;
    const top3 = classement.slice(0, 3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
    const podiumHeights = ["h-20", "h-28", "h-16"];
    const podiumRangs = [2, 1, 3];

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">Classement</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Performance équipe</h1>
                    {dernierUpdate && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Mis à jour à {dernierUpdate}
                        </p>
                    )}
                </div>
                {monRang > 0 && (
                    <div className="rounded-2xl bg-green-50 px-5 py-3 text-center">
                        <p className="text-xs font-bold text-green-600">Ma position</p>
                        <p className="text-2xl font-black text-green-700">#{monRang}</p>
                    </div>
                )}
            </div>

            {/* Filtre période */}
            <div className="flex gap-2">
                {(["jour", "semaine", "mois"] as Periode[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriode(p)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            periode === p
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}
                    >
                        {periodeLabels[p]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Podium Top 3 */}
                    {top3.length >= 3 && (
                        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                🏆 Top performers — {periodeLabels[periode]}
                            </p>
                            <div className="flex items-end justify-center gap-4">
                                {podiumOrder.map((c, i) => {
                                    if (!c) return null;
                                    const rang = podiumRangs[i];
                                    const isFirst = rang === 1;
                                    const isMoi = c.id === conseillerId;
                                    return (
                                        <div key={c.id} className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                {isFirst && (
                                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</span>
                                                )}
                                                <div className={`${isMoi ? "ring-4 ring-green-500" : "ring-2 ring-slate-100"} rounded-full overflow-hidden`}>
                                                    <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={isFirst ? 72 : 56} />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className={`font-black ${isMoi ? "text-green-700" : "text-slate-800"}`}>{c.nom}</p>
                                                <p className="text-sm text-slate-400">{c.total} ventes</p>
                                            </div>
                                            <div className={`flex ${podiumHeights[i]} w-24 flex-col items-center justify-center rounded-t-2xl text-white font-black text-lg ${
                                                rang === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-200"
                                            }`}>
                                                <span className="text-2xl">{medals[rang - 1]}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tableau trié par colonne */}
                    <div className="rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)] overflow-hidden">
                        <div className="px-7 pt-7 pb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                Tableau de bord — toutes colonnes triables
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="border-b border-slate-100 bg-slate-50/60">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-400 w-10">
                                            #
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                                            Conseiller
                                        </th>
                                        {produits.map((p) => (
                                            <SortTh
                                                key={p}
                                                col={p}
                                                label={p}
                                                sort={sort}
                                                onSort={handleSort}
                                                align="right"
                                            />
                                        ))}
                                        <SortTh col="total" label="Total" sort={sort} onSort={handleSort} align="right" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-50">
                                    {sortedRows.map((c, idx) => {
                                        const isMoi = c.id === conseillerId;
                                        const rang = classement.findIndex((r) => r.id === c.id) + 1;

                                        return (
                                            <tr
                                                key={c.id}
                                                className={`transition-colors ${
                                                    isMoi
                                                        ? "bg-green-50/70"
                                                        : "hover:bg-slate-50/60"
                                                }`}
                                            >
                                                {/* Rang */}
                                                <td className="px-4 py-4 text-sm font-black text-slate-400">
                                                    {rang <= 3 ? medals[rang - 1] : rang}
                                                </td>

                                                {/* Conseiller */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={36} />
                                                        <span className={`font-black text-sm ${isMoi ? "text-green-700" : "text-slate-800"}`}>
                                                            {c.nom}
                                                            {isMoi && (
                                                                <span className="ml-2 text-xs font-semibold text-green-500">(moi)</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Par produit */}
                                                {produits.map((p) => {
                                                    const val = c.produits[p] ?? 0;
                                                    const isSort = sort.key === p;
                                                    return (
                                                        <td
                                                            key={p}
                                                            className={`px-4 py-4 text-right font-black text-sm ${
                                                                val > 0
                                                                    ? isSort
                                                                        ? "text-green-600"
                                                                        : "text-slate-700"
                                                                    : "text-slate-300"
                                                            }`}
                                                        >
                                                            {val}
                                                        </td>
                                                    );
                                                })}

                                                {/* Total */}
                                                <td className={`px-4 py-4 text-right font-black text-base ${
                                                    sort.key === "total" ? "text-green-600" : "text-slate-800"
                                                }`}>
                                                    {c.total}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {sortedRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={produits.length + 3}
                                                className="px-4 py-12 text-center text-slate-400"
                                            >
                                                Aucune donnée pour cette période.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-7 pb-5 pt-4 text-xs text-slate-400">
                            Cliquez sur un en-tête de colonne pour trier ↑↓ — colonnes actives en vert.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
