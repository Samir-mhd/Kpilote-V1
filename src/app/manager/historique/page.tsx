"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";

/* ─── Types ───────────────────────────────────────────────── */
type Conseiller = { id: string; nom: string; };
type Vente = { id: string; conseiller_id: string; produit: string; created_at: string; };

type Insight = {
    meilleureHeure: number | null;
    meilleurJour: string | null;
    meilleurProduit: string | null;
    semaineCourante: number;
    semainePrecedente: number;
    tendance: number;
    meilleurePersonne?: string | null;
};

/* ─── Constantes ──────────────────────────────────────────── */
const JOURS    = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES   = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HEATMAP_COLORS = [
    "bg-slate-100 text-slate-300",
    "bg-violet-100 text-violet-400",
    "bg-violet-300 text-violet-700",
    "bg-violet-500 text-white",
    "bg-violet-700 text-white",
];

const PROD_EMOJI: Record<string, string> = {
    box: "📦", forfait: "📱", forfaits: "📱",
    mcafee: "🛡️", assurance: "🔐", téléphone: "📲", telephone: "📲",
};

function heatColor(n: number, max: number) {
    if (n === 0 || max === 0) return HEATMAP_COLORS[0];
    return HEATMAP_COLORS[Math.min(Math.ceil((n / max) * (HEATMAP_COLORS.length - 1)), HEATMAP_COLORS.length - 1)];
}

function jourSemaine(iso: string) { return (new Date(iso).getDay() + 6) % 7; }
function fmtHeure(h: number) { return `${h}h`; }

function timeAgo(iso: string) {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h`;
}

function buildHeatmap(ventes: Vente[]): number[][] {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(HEURES.length).fill(0));
    for (const v of ventes) {
        const j = jourSemaine(v.created_at);
        const h = new Date(v.created_at).getHours();
        const hi = HEURES.indexOf(h);
        if (hi !== -1) grid[j][hi]++;
    }
    return grid;
}

function computeInsights(ventes30j: Vente[], ventesSemC: number, ventesSemP: number, nomMap?: Record<string, string>): Insight {
    const parHeure: Record<number, number>  = {};
    const parJour:  Record<number, number>  = {};
    const parProduit: Record<string, number>= {};
    const parPersonne: Record<string, number> = {};

    for (const v of ventes30j) {
        const h = new Date(v.created_at).getHours();
        const j = jourSemaine(v.created_at);
        parHeure[h]          = (parHeure[h] ?? 0) + 1;
        parJour[j]           = (parJour[j] ?? 0) + 1;
        parProduit[v.produit]= (parProduit[v.produit] ?? 0) + 1;
        if (nomMap) parPersonne[v.conseiller_id] = (parPersonne[v.conseiller_id] ?? 0) + 1;
    }

    const meilleureHeure = Object.keys(parHeure).length
        ? Number(Object.entries(parHeure).sort((a,b)=>b[1]-a[1])[0][0]) : null;

    const mJourIdx = Object.keys(parJour).length
        ? Number(Object.entries(parJour).sort((a,b)=>b[1]-a[1])[0][0]) : null;

    const meilleurProduit = Object.keys(parProduit).length
        ? Object.entries(parProduit).sort((a,b)=>b[1]-a[1])[0][0] : null;

    const meilleurePersonneId = nomMap && Object.keys(parPersonne).length
        ? Object.entries(parPersonne).sort((a,b)=>b[1]-a[1])[0][0] : null;

    const tendance = ventesSemP > 0
        ? Math.round(((ventesSemC - ventesSemP) / ventesSemP) * 100)
        : ventesSemC > 0 ? 100 : 0;

    return {
        meilleureHeure,
        meilleurJour: mJourIdx !== null ? JOURS[mJourIdx] : null,
        meilleurProduit,
        semaineCourante: ventesSemC,
        semainePrecedente: ventesSemP,
        tendance,
        meilleurePersonne: meilleurePersonneId && nomMap ? (nomMap[meilleurePersonneId] ?? null) : null,
    };
}

/* ─── Composant principal ─────────────────────────────────── */
export default function HistoriquePage() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [selectedId,  setSelectedId]  = useState<string>("boutique");
    const [dropOpen,    setDropOpen]    = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    const [ventesAujourd, setVentesAujourd] = useState<Vente[]>([]);
    const [heatmap,   setHeatmap]   = useState<number[][]>([]);
    const [insight,   setInsight]   = useState<Insight | null>(null);
    const [loading,   setLoading]   = useState(true);
    const [nomMap,    setNomMap]    = useState<Record<string, string>>({});

    /* Fermer le dropdown au clic extérieur */
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* Charger liste conseillers */
    useEffect(() => {
        supabase.from("conseillers").select("id, nom").then(({ data }) => {
            if (!data) return;
            setConseillers(data);
            const map: Record<string, string> = {};
            data.forEach((c: any) => { map[c.id] = c.nom; });
            setNomMap(map);
        });
    }, []);

    /* Charger données selon la sélection */
    useEffect(() => {
        setLoading(true);

        async function charger() {
            const now       = new Date();
            const debutJour = new Date(now); debutJour.setHours(0, 0, 0, 0);
            const debut30j  = new Date(now); debut30j.setDate(now.getDate() - 30);

            const lundi = new Date(now);
            lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            lundi.setHours(0, 0, 0, 0);
            const lundiPrec = new Date(lundi);
            lundiPrec.setDate(lundi.getDate() - 7);

            const filtre = selectedId === "boutique" ? {} : { conseiller_id: selectedId };

            let q30j  = supabase.from("ventes").select("id,conseiller_id,produit,created_at")
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", debut30j.toISOString());
            let qauj  = supabase.from("ventes").select("id,conseiller_id,produit,created_at")
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", debutJour.toISOString())
                .order("created_at", { ascending: true });
            let qsemC = supabase.from("ventes").select("id", { count: "exact", head: true })
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", lundi.toISOString());
            let qsemP = supabase.from("ventes").select("id", { count: "exact", head: true })
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", lundiPrec.toISOString())
                .lt("created_at", lundi.toISOString());

            if (selectedId !== "boutique") {
                q30j  = (q30j  as any).eq("conseiller_id", selectedId);
                qauj  = (qauj  as any).eq("conseiller_id", selectedId);
                qsemC = (qsemC as any).eq("conseiller_id", selectedId);
                qsemP = (qsemP as any).eq("conseiller_id", selectedId);
            }

            const [r30j, rauj, rsemC, rsemP] = await Promise.all([q30j, qauj, qsemC, qsemP]);

            const ventes30j  = (r30j.data  ?? []) as Vente[];
            const ventesAuj  = (rauj.data  ?? []) as Vente[];
            const semC = rsemC.count ?? 0;
            const semP = rsemP.count ?? 0;

            setVentesAujourd(ventesAuj);
            setHeatmap(buildHeatmap(ventes30j));
            setInsight(computeInsights(ventes30j, semC, semP, selectedId === "boutique" ? nomMap : undefined));
            setLoading(false);
        }

        charger();
    }, [selectedId, nomMap]);

    /* ── Labels ── */
    const selectedLabel = selectedId === "boutique"
        ? "Toute la boutique"
        : conseillers.find(c => c.id === selectedId)?.nom ?? "…";

    const heatMax = heatmap.length ? Math.max(...heatmap.flat()) : 1;
    const tendanceCouleur = !insight ? "text-slate-500"
        : insight.tendance > 0 ? "text-green-600"
        : insight.tendance < 0 ? "text-red-500" : "text-slate-500";
    const TendIcon = !insight ? Minus : insight.tendance > 0 ? TrendingUp : insight.tendance < 0 ? TrendingDown : Minus;

    return (
        <div className="space-y-7">

            {/* ── Header + dropdown ─────────────────────────── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">Manager · Analytics</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Historique des ventes</h1>
                    <p className="mt-1 text-sm text-slate-400">30 derniers jours — heatmap, timeline, analyse</p>
                </div>

                {/* Dropdown sélection */}
                <div className="relative" ref={dropRef}>
                    <button
                        onClick={() => setDropOpen(o => !o)}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm hover:border-violet-300 transition-all"
                    >
                        {selectedId !== "boutique" && (
                            <CartoonAvatar prenom={selectedLabel} etat="souriant_main" size={28} />
                        )}
                        {selectedId === "boutique" && <span className="text-lg">🏪</span>}
                        {selectedLabel}
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
                    </button>

                    {dropOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_32px_rgba(15,23,42,.12)]">
                            {/* Option boutique */}
                            <button
                                onClick={() => { setSelectedId("boutique"); setDropOpen(false); }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-bold transition-colors hover:bg-slate-50 ${selectedId === "boutique" ? "text-violet-600 bg-violet-50" : "text-slate-700"}`}
                            >
                                <span className="text-xl">🏪</span>
                                Toute la boutique
                            </button>

                            {conseillers.length > 0 && (
                                <div className="mx-3 my-1 border-t border-slate-100" />
                            )}

                            {conseillers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedId(c.id); setDropOpen(false); }}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50 ${selectedId === c.id ? "text-violet-600 bg-violet-50" : "text-slate-700"}`}
                                >
                                    <CartoonAvatar prenom={c.nom} etat="souriant_main" size={28} />
                                    {c.nom}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            ) : (
                <>
                    {/* ── KPI ────────────────────────────────────── */}
                    {insight && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cette semaine</p>
                                <p className="mt-2 text-4xl font-black text-slate-900">{insight.semaineCourante}</p>
                                <p className="text-xs text-slate-400">ventes</p>
                            </div>
                            <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Semaine passée</p>
                                <p className="mt-2 text-4xl font-black text-slate-900">{insight.semainePrecedente}</p>
                                <p className="text-xs text-slate-400">ventes</p>
                            </div>
                            <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tendance</p>
                                <div className={`mt-2 flex items-center gap-1 text-4xl font-black ${tendanceCouleur}`}>
                                    {Math.abs(insight.tendance)}%
                                    <TendIcon size={22} strokeWidth={2.5} />
                                </div>
                                <p className="text-xs text-slate-400">vs semaine préc.</p>
                            </div>
                            <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {selectedId === "boutique" ? "Top vendeur" : "Produit fort"}
                                </p>
                                <p className="mt-2 text-2xl font-black text-slate-900 truncate">
                                    {selectedId === "boutique"
                                        ? (insight.meilleurePersonne?.split(" ")[0] ?? "—")
                                        : (insight.meilleurProduit ?? "—")}
                                </p>
                                <p className="text-xs text-slate-400">30 derniers jours</p>
                            </div>
                        </div>
                    )}

                    {/* ── Analyse ────────────────────────────────── */}
                    {insight && (
                        <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-violet-900 p-6 text-white shadow-[0_8px_32px_rgba(15,23,42,.2)]">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl">🤖</div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Analyse automatique</p>
                                    <p className="font-black text-white">
                                        {selectedId === "boutique" ? "Performance boutique" : `Profil de ${selectedLabel.split(" ")[0]}`}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {insight.meilleureHeure !== null && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                        <span className="text-xl flex-shrink-0">🕐</span>
                                        <p className="text-sm text-white/90">
                                            L'heure de pointe {selectedId === "boutique" ? "de la boutique" : ""} est autour de{" "}
                                            <strong className="text-white">{fmtHeure(insight.meilleureHeure)}</strong>.
                                        </p>
                                    </div>
                                )}
                                {insight.meilleurJour && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                        <span className="text-xl flex-shrink-0">📅</span>
                                        <p className="text-sm text-white/90">
                                            Le <strong className="text-white">{insight.meilleurJour}di</strong> est le jour le plus prolifique.
                                        </p>
                                    </div>
                                )}
                                {insight.meilleurProduit && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                        <span className="text-xl flex-shrink-0">🏆</span>
                                        <p className="text-sm text-white/90">
                                            Produit phare : <strong className="text-white">{insight.meilleurProduit}</strong>.
                                        </p>
                                    </div>
                                )}
                                {selectedId === "boutique" && insight.meilleurePersonne && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                        <span className="text-xl flex-shrink-0">⭐</span>
                                        <p className="text-sm text-white/90">
                                            Top performer des 30 derniers jours : <strong className="text-white">{insight.meilleurePersonne}</strong>.
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                    <span className="text-xl flex-shrink-0">{insight.tendance >= 0 ? "🚀" : "⚠️"}</span>
                                    <p className="text-sm text-white/90">
                                        {insight.tendance > 0
                                            ? <><strong className="text-green-300">+{insight.tendance}%</strong> vs semaine passée. Belle dynamique !</>
                                            : insight.tendance < 0
                                                ? <><strong className="text-red-300">{insight.tendance}%</strong> vs semaine passée. À surveiller.</>
                                                : <>Semaine stable par rapport à la précédente.</>
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Timeline aujourd'hui ────────────────────── */}
                    <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                            🕐 Ventes d'aujourd'hui — {ventesAujourd.length} vente{ventesAujourd.length !== 1 ? "s" : ""}
                        </p>
                        {ventesAujourd.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-300">Pas encore de vente aujourd'hui</p>
                        ) : (
                            <div className="space-y-2">
                                {[...ventesAujourd].reverse().map((v, i) => {
                                    const hm = new Date(v.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                                    const nom = nomMap[v.conseiller_id] ?? "—";
                                    return (
                                        <div key={v.id} className="flex items-center gap-4" style={{ animation: `fadeIn .3s ease ${i * 0.03}s both` }}>
                                            <span className="w-12 flex-shrink-0 text-right text-xs font-black text-slate-400 tabular-nums">{hm}</span>
                                            <div className="h-3 w-3 flex-shrink-0 rounded-full bg-violet-500" />
                                            <div className="flex flex-1 items-center justify-between rounded-2xl bg-slate-50 px-4 py-2.5">
                                                <span className="text-sm font-black text-slate-800">{v.produit}</span>
                                                {selectedId === "boutique" && (
                                                    <div className="flex items-center gap-2">
                                                        <CartoonAvatar prenom={nom} etat="souriant_main" size={24} />
                                                        <span className="text-xs font-bold text-slate-400">{nom.split(" ")[0]}</span>
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-slate-300">{timeAgo(v.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Heatmap ─────────────────────────────────── */}
                    <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">📊 Heatmap — 30 derniers jours</p>
                        <p className="mb-5 text-xs text-slate-300">Heures et jours les plus prolifiques</p>
                        <div className="overflow-x-auto">
                            <div className="min-w-[560px]">
                                <div className="mb-2 flex items-center gap-1 pl-12">
                                    {HEURES.map(h => (
                                        <div key={h} className="w-10 text-center text-[10px] font-bold text-slate-300">{fmtHeure(h)}</div>
                                    ))}
                                </div>
                                {JOURS.map((jour, ji) => (
                                    <div key={jour} className="mb-1 flex items-center gap-1">
                                        <div className="w-10 flex-shrink-0 pr-2 text-right text-[10px] font-bold text-slate-400">{jour}</div>
                                        {HEURES.map((_, hi) => {
                                            const n = heatmap[ji]?.[hi] ?? 0;
                                            return (
                                                <div
                                                    key={hi}
                                                    title={`${jour} ${fmtHeure(HEURES[hi])} : ${n} vente${n !== 1 ? "s" : ""}`}
                                                    className={`flex h-9 w-10 cursor-default items-center justify-center rounded-lg text-[10px] font-bold ${heatColor(n, heatMax)}`}
                                                >
                                                    {n > 0 ? n : ""}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                <div className="mt-4 flex items-center gap-2 pl-12">
                                    <span className="text-[10px] text-slate-300">Moins</span>
                                    {HEATMAP_COLORS.map((cls, i) => (
                                        <div key={i} className={`h-4 w-6 rounded ${cls.split(" ")[0]}`} />
                                    ))}
                                    <span className="text-[10px] text-slate-300">Plus</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0); }
                }
            `}</style>
        </div>
    );
}
