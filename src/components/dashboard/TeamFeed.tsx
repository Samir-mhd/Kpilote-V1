"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";

type Entry = {
    id: string;
    conseiller_id: string;
    nom: string;
    produit: string;
    created_at: string;
    isNew: boolean;
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h`;
}

const FEED_EMOJIS: Record<string, string> = {
    box: "📦", forfait: "📱", forfaits: "📱",
    mcafee: "🛡️", assurance: "🔐",
};
function feedEmoji(produit: string) {
    return FEED_EMOJIS[produit.toLowerCase()] ?? "✅";
}

export default function TeamFeed({ conseillerId }: { conseillerId: string }) {
    const [entries,  setEntries]  = useState<Entry[]>([]);
    const namesRef = useRef<Record<string, string>>({});

    useEffect(() => {
        supabase.from("conseillers").select("id, nom").then(({ data }) => {
            if (!data) return;
            const map: Record<string, string> = {};
            data.forEach((c: any) => { map[c.id] = c.nom; });
            namesRef.current = map;

            const debut = new Date();
            debut.setHours(0, 0, 0, 0);

            supabase
                .from("ventes")
                .select("id, conseiller_id, produit, created_at")
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", debut.toISOString())
                .order("created_at", { ascending: false })
                .limit(12)
                .then(({ data: ventes }) => {
                    if (!ventes) return;
                    setEntries(ventes.map((v: any) => ({
                        ...v,
                        nom: map[v.conseiller_id] ?? "Équipe",
                        isNew: false,
                    })));
                });
        });
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("team-feed-rt")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, (payload: any) => {
                const v = payload.new;
                if (v.source === "cerebro_check") return;
                const entry: Entry = {
                    id: v.id,
                    conseiller_id: v.conseiller_id,
                    nom: namesRef.current[v.conseiller_id] ?? "Équipe",
                    produit: v.produit,
                    created_at: v.created_at,
                    isNew: true,
                };
                setEntries(prev => [entry, ...prev].slice(0, 12));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-xl">⚡</div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Live</p>
                    <p className="text-sm font-black text-slate-900">Ventes équipe</p>
                </div>
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {entries.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-300">Pas encore de vente aujourd'hui — soyez le premier ! 🚀</p>
            ) : null}

            <div className="space-y-2">
                {entries.map((e) => {
                    const isMoi = e.conseiller_id === conseillerId;
                    return (
                        <div
                            key={e.id}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-all ${
                                isMoi ? "bg-violet-50 border border-violet-100" : "bg-slate-50"
                            } ${e.isNew ? "animate-feedIn" : ""}`}
                        >
                            <CartoonAvatar prenom={e.nom} etat="souriant_main" size={32} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">
                                    {e.nom.split(" ")[0]}
                                    {isMoi && <span className="ml-1 text-[10px] font-bold text-violet-500">(toi)</span>}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {feedEmoji(e.produit)} {e.produit}
                                </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <p className="text-xs font-black text-green-600">+1</p>
                                <p className="text-[10px] text-slate-300">{timeAgo(e.created_at)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes feedIn {
                    from { opacity: 0; transform: translateY(-10px) scale(.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-feedIn { animation: feedIn .35s cubic-bezier(.34,1.56,.64,1); }
            `}</style>
        </div>
    );
}
