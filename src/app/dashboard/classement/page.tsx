"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { Periode, PERIODE_LABELS, proratiserObjectif, couleurTaux } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { supabase } from "@/lib/supabase";
import { envoyerReaction } from "@/services/reactionService";

const medals = ["🥇", "🥈", "🥉"];

function ClassementInner() {
    const searchParams  = useSearchParams();
    const conseillerId  = searchParams.get("id") ?? "";

    const [periode, setPeriode]   = useState<Periode>("mois");
    const [classement, setClassement] = useState<ConseillerStats[]>([]);
    const [photos, setPhotos]     = useState<Record<string, string | null>>({});
    const [loading, setLoading]   = useState(true);
    const [maj, setMaj]           = useState("");
    const [sentReactions, setSentReactions] = useState<Record<string, string>>({});

    const monNom = classement.find(c => c.id === conseillerId)?.nom ?? "";

    async function handleReaction(toId: string, emoji: string) {
        if (!conseillerId || sentReactions[toId]) return;
        await envoyerReaction(conseillerId, monNom, toId, emoji);
        setSentReactions(prev => ({ ...prev, [toId]: emoji }));
        setTimeout(() => setSentReactions(prev => { const n = { ...prev }; delete n[toId]; return n; }), 8000);
    }

    async function charger(p: Periode) {
        setLoading(true);
        try {
            const data = await construireClassementPeriode(p);
            setClassement(data);
            setMaj(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
            const ids = data.map(c => c.id);
            const avs = await getPhotosByIds(ids).catch(() => ({}));
            setPhotos(avs);
        } catch {}
        finally { setLoading(false); }
    }

    useEffect(() => {
        charger(periode);

        // Realtime : rafraîchit le classement à chaque nouvelle vente
        const channel = supabase
            .channel(`classement-conseiller-${periode}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, () => {
                charger(periode);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [periode]);

    const monRang = classement.findIndex(c => c.id === conseillerId) + 1;
    const top3    = classement.slice(0, 3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];
    const podiumRangs = [2, 1, 3];
    const podiumH     = ["h-20", "h-28", "h-16"];
    const podiumSizes = [56, 72, 56];

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">Classement</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Performance équipe</h1>
                    {maj && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Mis à jour à {maj}
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

            {/* Période */}
            <div className="flex gap-2">
                {(["jour", "semaine", "mois"] as Periode[]).map(p => (
                    <button key={p} onClick={() => setPeriode(p)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            periode === p ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}>
                        {PERIODE_LABELS[p]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* Podium */}
                    {podiumOrder.length === 3 && (
                        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                🏆 Top performers — {PERIODE_LABELS[periode]}
                            </p>
                            <div className="flex items-end justify-center gap-4">
                                {podiumOrder.map((c, i) => {
                                    const rang  = podiumRangs[i];
                                    const first = rang === 1;
                                    const isMoi = c.id === conseillerId;
                                    return (
                                        <div key={c.id} className="flex flex-col items-center gap-3">
                                            <div className="relative">
                                                {first && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</span>}
                                                <div className={`overflow-hidden rounded-full shadow-lg ${isMoi ? "ring-4 ring-green-500" : "ring-2 ring-slate-100"}`}>
                                                    <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={podiumSizes[i]} />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className={`font-black ${isMoi ? "text-green-700" : "text-slate-800"}`}>{c.nom}</p>
                                                <p className="text-sm text-slate-400">{c.total} ventes</p>
                                            </div>
                                            <div className={`flex ${podiumH[i]} w-24 flex-col items-center justify-center rounded-t-2xl ${
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

                    {/* Tableau détaillé style manager équipe */}
                    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <div className="px-7 pt-7 pb-3 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Classement détaillé — {PERIODE_LABELS[periode]}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-300">
                                <span className="text-emerald-600 font-bold">● ≥ obj.</span>
                                <span className="text-amber-500 font-bold">● ≥ 50%</span>
                                <span className="text-red-500 font-bold">● {"< 50%"}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] border-separate border-spacing-y-1.5">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-300">
                                        <th className="px-4 pb-2">#</th>
                                        <th className="px-4 pb-2">Conseiller</th>
                                        {PRODUITS_ORDRE.map(p => (
                                            <th key={p.code} className="px-3 pb-2 text-center">{p.emoji} {p.label}</th>
                                        ))}
                                        <th className="px-4 pb-2 text-right">Total</th>
                                        <th className="px-5 pb-2 text-right">Taux</th>
                                        <th className="px-4 pb-2 text-center">React</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classement.map((c, idx) => {
                                        const isMoi   = c.id === conseillerId;
                                        const totalObj = PRODUITS_ORDRE.reduce((t, p) => t + proratiserObjectif(c.objectifs[p.key], periode), 0);
                                        const taux    = totalObj > 0 ? Math.round((c.total / totalObj) * 100) : 0;
                                        const ct      = couleurTaux(c.total, totalObj);
                                        return (
                                            <tr key={c.id} className={`${isMoi ? "bg-green-50/70" : "bg-slate-50 hover:bg-slate-100"} transition-colors`}>
                                                <td className="rounded-l-2xl px-4 py-3">
                                                    {idx < 3 ? <span className="text-xl">{medals[idx]}</span> : <span className="text-sm font-black text-slate-400">{idx + 1}</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="overflow-hidden rounded-full flex-shrink-0">
                                                            <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={36} />
                                                        </div>
                                                        <span className={`font-black text-sm ${isMoi ? "text-green-700" : "text-slate-800"}`}>
                                                            {c.nom} {isMoi && <span className="text-xs font-semibold text-green-500">(moi)</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                {PRODUITS_ORDRE.map(p => {
                                                    const val = c.produits[p.key];
                                                    const obj = Math.round(proratiserObjectif(c.objectifs[p.key], periode));
                                                    const col = couleurTaux(val, obj);
                                                    return (
                                                        <td key={p.code} className="px-3 py-3 text-center">
                                                            <div>
                                                                <div className={`mx-auto inline-flex h-8 min-w-[40px] items-center justify-center rounded-xl px-2 text-sm font-black ${col.bg} ${col.text} border ${col.border}`}>
                                                                    {val}
                                                                </div>
                                                                {obj > 0 && (
                                                                    <>
                                                                        <div className="mx-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                                                                            <div className={`h-full rounded-full ${col.bar}`} style={{ width: `${Math.min(val / obj * 100, 100)}%` }} />
                                                                        </div>
                                                                        <p className={`text-[10px] ${col.text} opacity-70`}>{obj}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 text-right">
                                                    <p className={`text-lg font-black ${isMoi ? "text-green-700" : "text-slate-800"}`}>{c.total}</p>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-sm font-black ${ct.text}`}>{taux}%</span>
                                                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                                                            <div className={`h-full rounded-full ${ct.bar}`} style={{ width: `${Math.min(taux, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="rounded-r-2xl px-4 py-3 text-center">
                                                    {isMoi ? (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    ) : sentReactions[c.id] ? (
                                                        <span className="text-xl" style={{ animation: "reactPop .3s ease" }}>{sentReactions[c.id]}</span>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                            {["🔥", "💪", "👏"].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleReaction(c.id, emoji)}
                                                                    className="text-base hover:scale-125 transition-transform leading-none"
                                                                    title={`Envoyer ${emoji}`}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-7 pb-5 pt-2 text-xs text-slate-300">Objectifs proratisés selon la période sélectionnée</div>
                    </div>
                    <style>{`
                        @keyframes reactPop {
                            0%   { transform: scale(0.4); opacity: 0; }
                            70%  { transform: scale(1.3); opacity: 1; }
                            100% { transform: scale(1); }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
}

export default function ClassementPage() {
    return <Suspense><ClassementInner /></Suspense>;
}
