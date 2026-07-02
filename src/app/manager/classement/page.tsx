"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { construireFelicitations } from "@/engine/managerAI/felicitationsEngine";
import { ConseillerClassement } from "@/services/classementManager";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

const PRODUITS: { key: keyof ConseillerClassement; objKey: string; label: string }[] = [
    { key: "box",       objKey: "box",       label: "Box" },
    { key: "forfaits",  objKey: "forfaits",  label: "Forf." },
    { key: "telephones",objKey: "telephones",label: "Tél." },
    { key: "mcafee",    objKey: "mcafee",    label: "McAfee" },
    { key: "assurance", objKey: "assurance", label: "Assur." },
];

function couleurProduit(realise: number, objectif: number) {
    if (objectif === 0) return "text-slate-400";
    const taux = realise / objectif;
    if (taux >= 1) return "text-emerald-600 font-black";
    if (taux >= 0.5) return "text-amber-500 font-bold";
    return "text-red-500 font-bold";
}

function bgProduit(realise: number, objectif: number) {
    if (objectif === 0) return "bg-slate-50";
    const taux = realise / objectif;
    if (taux >= 1) return "bg-emerald-50";
    if (taux >= 0.5) return "bg-amber-50";
    return "bg-red-50";
}

function tauxGlobal(c: ConseillerClassement): number {
    const totalObj = Object.values(c.objectifs ?? {}).reduce((t, v) => t + v, 0);
    if (totalObj === 0) return 0;
    return Math.round((c.ventes / totalObj) * 100);
}

const medals = ["🥇", "🥈", "🥉"];
const podiumBg = [
    "bg-gradient-to-br from-slate-700 to-slate-800",
    "bg-gradient-to-br from-amber-400 to-orange-500",
    "bg-gradient-to-br from-slate-500 to-slate-600",
];
const podiumShadow = [
    "shadow-[0_12px_40px_rgba(15,23,42,.25)]",
    "shadow-[0_20px_60px_rgba(245,158,11,.4)]",
    "shadow-[0_12px_40px_rgba(15,23,42,.20)]",
];

export default function ClassementPage() {
    const { dashboard, loading } = useManagerDashboard();
    const [heure, setHeure] = useState("");
    const [photos, setPhotos] = useState<Record<string, string | null>>({});

    useEffect(() => {
        setHeure(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, []);

    useEffect(() => {
        if (!dashboard?.classement?.length) return;
        const ids = dashboard.classement.map((c) => c.id);
        getPhotosByIds(ids).then(setPhotos).catch(() => {});
    }, [dashboard]);


    if (loading || !dashboard) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const classement = dashboard.classement;
    const felicitations = construireFelicitations(classement);

    // Podium : 2ème | 1er | 3ème
    const top3 = classement.slice(0, 3);
    const podiumOrder = top3.length >= 3
        ? [top3[1], top3[0], top3[2]]
        : top3;
    const podiumRangs = [2, 1, 3];
    const podiumSizes = [56, 80, 56];

    return (
        <main className="space-y-10">

            {/* ── Hero header ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-9 shadow-[0_20px_60px_rgba(15,23,42,.30)]">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-400">
                            KPILOTE Manager
                        </p>
                        <h1 className="mt-2 text-4xl font-black text-white">
                            Classement équipe
                        </h1>
                        {heure && (
                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                                <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                Temps réel · {heure}
                            </p>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                            Effectif
                        </p>
                        <p className="mt-1 text-5xl font-black text-white">
                            {classement.length}
                        </p>
                        <p className="text-xs text-slate-500">conseillers</p>
                    </div>
                </div>
            </div>

            {/* ── Podium top 3 ────────────────────────────────────── */}
            {top3.length >= 3 && (
                <div>
                    <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                        🏆 Podium du mois
                    </p>

                    <div className="flex items-end justify-center gap-4">
                        {podiumOrder.map((c, i) => {
                            if (!c) return null;
                            const rang = podiumRangs[i];
                            const isFirst = rang === 1;
                            const taux = tauxGlobal(c);

                            return (
                                <div
                                    key={c.id}
                                    className="flex flex-col items-center"
                                    style={{ flex: isFirst ? "0 0 220px" : "0 0 180px" }}
                                >
                                    {/* Card conseiller */}
                                    <div className={`w-full rounded-[24px] p-6 text-white ${podiumBg[i]} ${podiumShadow[i]} flex flex-col items-center text-center relative overflow-hidden`}>
                                        {isFirst && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                        )}

                                        {isFirst && (
                                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl">👑</span>
                                        )}

                                        <div className={`mt-${isFirst ? "4" : "2"} overflow-hidden rounded-full ${isFirst ? "ring-4 ring-white/40" : "ring-2 ring-white/20"} shadow-xl`}>
                                            <PhotoAvatar nom={c.prenom} photoUrl={photos[c.id]} size={podiumSizes[i]} />
                                        </div>

                                        <p className={`mt-3 font-black text-white leading-tight ${isFirst ? "text-2xl" : "text-xl"}`}>
                                            {c.prenom}
                                        </p>

                                        <div className="mt-3 flex items-end gap-1 justify-center">
                                            <span className={`font-black text-white ${isFirst ? "text-5xl" : "text-4xl"}`}>
                                                {c.ventes}
                                            </span>
                                            <span className="mb-1.5 text-sm text-white/60">ventes</span>
                                        </div>

                                        <div className={`mt-3 rounded-full px-3 py-1 text-xs font-black ${
                                            taux >= 80 ? "bg-white/20 text-white" : "bg-black/20 text-white/80"
                                        }`}>
                                            {taux}% obj.
                                        </div>
                                    </div>

                                    {/* Socle podium */}
                                    <div className={`w-full rounded-b-2xl flex items-center justify-center ${
                                        isFirst ? "h-16" : "h-10"
                                    } ${
                                        rang === 1
                                            ? "bg-gradient-to-b from-amber-400 to-amber-600"
                                            : rang === 2
                                            ? "bg-gradient-to-b from-slate-300 to-slate-400"
                                            : "bg-gradient-to-b from-amber-700 to-amber-900"
                                    } shadow-lg`}>
                                        <span className="text-2xl">{medals[rang - 1]}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Tableau classement complet ───────────────────────── */}
            <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_4px_32px_rgba(15,23,42,.08)]">

                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                        Classement complet
                    </p>
                    <p className="text-xs text-slate-300">
                        Couleurs : <span className="text-emerald-600 font-bold">≥ obj.</span>
                        {" · "}<span className="text-amber-500 font-bold">≥ 50%</span>
                        {" · "}<span className="text-red-500 font-bold">{"< 50%"}</span>
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-y border-slate-100 bg-slate-50/80">
                                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-400 w-12">#</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Conseiller</th>
                                {PRODUITS.map((p) => (
                                    <th key={p.key} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                                        {p.label}
                                    </th>
                                ))}
                                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Taux</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                            {classement.map((c, idx) => {
                                const taux = tauxGlobal(c);
                                const isTop3 = idx < 3;

                                return (
                                    <tr
                                        key={c.id}
                                        className={`group transition-colors hover:bg-violet-50/40 ${idx === 0 ? "bg-amber-50/30" : ""}`}
                                    >
                                        {/* Rang */}
                                        <td className="px-6 py-4">
                                            {isTop3 ? (
                                                <span className="text-xl">{medals[idx]}</span>
                                            ) : (
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                                                    {idx + 1}
                                                </span>
                                            )}
                                        </td>

                                        {/* Conseiller */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="overflow-hidden rounded-full flex-shrink-0 shadow-sm">
                                                    <PhotoAvatar nom={c.prenom} photoUrl={photos[c.id]} size={38} />
                                                </div>
                                                <span className="font-black text-slate-800">{c.prenom}</span>
                                            </div>
                                        </td>

                                        {/* Par produit */}
                                        {PRODUITS.map((p) => {
                                            const val = (c[p.key] as number) ?? 0;
                                            const obj = (c.objectifs as any)?.[p.objKey] ?? 0;
                                            return (
                                                <td key={p.key} className="px-3 py-4 text-center">
                                                    <div className={`mx-auto inline-flex h-8 w-10 items-center justify-center rounded-xl text-sm ${bgProduit(val, obj)} ${couleurProduit(val, obj)}`}>
                                                        {val}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Total */}
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-2xl font-black text-slate-800">{c.ventes}</span>
                                        </td>

                                        {/* Taux */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-sm font-black ${
                                                    taux >= 80 ? "text-emerald-600" : taux >= 50 ? "text-amber-500" : "text-red-500"
                                                }`}>
                                                    {taux}%
                                                </span>
                                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${
                                                            taux >= 80 ? "bg-emerald-500" : taux >= 50 ? "bg-amber-400" : "bg-red-400"
                                                        }`}
                                                        style={{ width: `${Math.min(taux, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 text-xs text-slate-300 border-t border-slate-50">
                    Objectifs par produit fournis par le manager · données temps réel
                </div>
            </div>

            {/* ── Félicitations ───────────────────────────────────── */}
            {felicitations.length > 0 && (
                <div>
                    <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                        🎉 Performances à valoriser
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {felicitations.map((item, idx) => (
                            <div
                                key={`${item.conseiller}-${idx}`}
                                className="relative overflow-hidden rounded-[22px] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,.07)]"
                            >
                                <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-[22px] bg-gradient-to-b from-green-400 to-emerald-600" />
                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-green-400/10 blur-2xl" />

                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-100 text-base">
                                            🎉
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">
                                            À valoriser
                                        </p>
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{item.conseiller}</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.raison}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </main>
    );
}
