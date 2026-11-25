"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStatsOutils, StatsOutilsLigne } from "@/services/outilsUsage";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { periodeSemaineEffective } from "@/utils/periodes";

type Periode = "semaine" | "mois" | "tout";
const PERIODES: { id: Periode; label: string }[] = [
    { id: "semaine", label: "Cette semaine" },
    { id: "mois", label: "Ce mois" },
    { id: "tout", label: "Depuis le début" },
];

function debutDe(p: Periode): Date | null {
    const now = new Date();
    if (p === "semaine") return periodeSemaineEffective(now).debut;
    if (p === "mois") return new Date(now.getFullYear(), now.getMonth(), 1);
    return null;
}

const COLONNES: { cle: keyof Pick<StatsOutilsLigne, "telephones" | "impressions" | "box">; emoji: string; label: string }[] = [
    { cle: "telephones", emoji: "📱", label: "Comparateur mobile" },
    { cle: "impressions", emoji: "🖨️", label: "Impressions mobile" },
    { cle: "box", emoji: "🧮", label: "Calculatrice box" },
];

export default function StatsOutilsPage() {
    const [periode, setPeriode] = useState<Periode>("mois");
    const [lignes, setLignes] = useState<StatsOutilsLigne[] | null | undefined>(undefined);
    const [photos, setPhotos] = useState<Record<string, string | null>>({});

    useEffect(() => {
        let actif = true;
        getStatsOutils(debutDe(periode)).then((l) => {
            if (!actif) return;
            setLignes(l);
            if (l?.length) getPhotosByIds(l.map((x) => x.id)).then((p) => actif && setPhotos(p)).catch(() => {});
        });
        return () => { actif = false; };
    }, [periode]);

    const totaux = COLONNES.map((c) => (lignes ?? []).reduce((t, l) => t + l[c.cle], 0));
    const max = Math.max(1, ...(lignes ?? []).map((l) => l.total));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href="/manager/outils" className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-500 hover:underline">Outils</Link>
                    <h1 className="text-3xl font-black text-slate-900">📊 Stats d&apos;utilisation</h1>
                    <p className="mt-1 text-sm text-slate-500">Nombre d&apos;ouvertures du comparateur mobile et de la calculatrice box, et d&apos;impressions de comparaisons, par conseiller.</p>
                </div>
                <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-[0_4px_16px_rgba(15,23,42,.06)]">
                    {PERIODES.map((p) => (
                        <button key={p.id} onClick={() => { if (p.id !== periode) { setLignes(undefined); setPeriode(p.id); } }}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition-all ${periode === p.id ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {lignes === undefined ? (
                <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" /></div>
            ) : lignes === null ? (
                <div className="rounded-[24px] bg-amber-50 p-6 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                    Le suivi n&apos;est pas encore activé : la table <code>outils_usage</code> doit être créée dans Supabase (script <code>sql/outils_usage.sql</code>).
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {COLONNES.map((c, i) => (
                            <div key={c.cle} className="carte-accueil rounded-[24px] border-2 border-slate-900 bg-white p-5">
                                <p className="text-2xl">{c.emoji}</p>
                                <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{totaux[i]}</p>
                                <p className="text-sm font-bold text-slate-500">{c.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="carte-accueil overflow-hidden rounded-[24px] border-2 border-slate-900 bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="px-5 py-3">Conseiller</th>
                                    {COLONNES.map((c) => <th key={c.cle} className="px-3 py-3 text-center">{c.emoji} {c.label}</th>)}
                                    <th className="px-5 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map((l) => (
                                    <tr key={l.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <PhotoAvatar photoUrl={photos[l.id] ?? null} nom={l.nom} size={36} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-slate-900">{l.nom}</p>
                                                    <div className="mt-1 h-1.5 w-full max-w-[180px] rounded-full bg-slate-100">
                                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(l.total / max) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {COLONNES.map((c) => (
                                            <td key={c.cle} className={`px-3 py-3 text-center text-base font-black tabular-nums ${l[c.cle] ? "text-slate-900" : "text-slate-300"}`}>{l[c.cle]}</td>
                                        ))}
                                        <td className="px-5 py-3 text-right text-base font-black tabular-nums text-slate-900">{l.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-400">Une ouverture = le conseiller a ouvert l&apos;outil depuis son espace. Une impression = un clic sur « Imprimer » dans le comparateur mobile. Les passages du manager ne sont pas comptés.</p>
                </>
            )}
        </div>
    );
}
