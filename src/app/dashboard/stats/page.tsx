"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import MorningCheck from "@/components/dashboard/MorningCheck";
import { resetCheckDate, marquerCheckFait } from "@/services/resetService";

/* ─── Types ──────────────────────────────────────────────── */
type Vente = { id: string; produits: any; created_at: string; };

type Insight = {
    meilleureHeure: number | null;
    meilleurJour: string | null;
    meilleurProduit: string | null;
    semaineCourante: number;
    semainePrecedente: number;
    tendance: number; // % diff
};

/* ─── Constantes ─────────────────────────────────────────── */
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HEATMAP_COLORS = [
    "bg-slate-100 text-slate-300",
    "bg-violet-100 text-violet-400",
    "bg-violet-300 text-violet-700",
    "bg-violet-500 text-white",
    "bg-violet-700 text-white",
];

function heatColor(n: number, max: number): string {
    if (n === 0 || max === 0) return HEATMAP_COLORS[0];
    const idx = Math.ceil((n / max) * (HEATMAP_COLORS.length - 1));
    return HEATMAP_COLORS[Math.min(idx, HEATMAP_COLORS.length - 1)];
}

function fmtHeure(h: number) { return `${h}h`; }

function jourSemaine(iso: string): number {
    const d = new Date(iso);
    return (d.getDay() + 6) % 7; // 0=Lun … 6=Dim
}

function computeInsights(ventes30j: Vente[], ventesSemCourante: number, ventesSemPrec: number): Insight {
    // Meilleure heure
    const parHeure: Record<number, number> = {};
    const parJour: Record<number, number>  = {};
    const parProduit: Record<string, number> = {};

    for (const v of ventes30j) {
        const h = new Date(v.created_at).getHours();
        const j = jourSemaine(v.created_at);
        parHeure[h]         = (parHeure[h] ?? 0) + 1;
        parJour[j]          = (parJour[j] ?? 0) + 1;
        const pNom = v.produits?.nom ?? v.produits?.code ?? "Produit";
        parProduit[pNom] = (parProduit[pNom] ?? 0) + 1;
    }

    const meilleureHeure = Object.keys(parHeure).length
        ? Number(Object.entries(parHeure).sort((a, b) => b[1] - a[1])[0][0])
        : null;

    const meilleurJourIdx = Object.keys(parJour).length
        ? Number(Object.entries(parJour).sort((a, b) => b[1] - a[1])[0][0])
        : null;
    const meilleurJour = meilleurJourIdx !== null ? JOURS[meilleurJourIdx] : null;

    const meilleurProduit = Object.keys(parProduit).length
        ? Object.entries(parProduit).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    const tendance = ventesSemPrec > 0
        ? Math.round(((ventesSemCourante - ventesSemPrec) / ventesSemPrec) * 100)
        : ventesSemCourante > 0 ? 100 : 0;

    return { meilleureHeure, meilleurJour, meilleurProduit, semaineCourante: ventesSemCourante, semainePrecedente: ventesSemPrec, tendance };
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

/* ─── Composant principal ────────────────────────────────── */
function StatsInner() {
    const searchParams  = useSearchParams();
    const conseillerId  = searchParams.get("id") ?? "";
    const nom           = searchParams.get("nom") ?? "Conseiller";

    const [ventesAujourdhui, setVentesAujourdhui] = useState<Vente[]>([]);
    const [heatmap, setHeatmap]   = useState<number[][]>([]);
    const [insight, setInsight]   = useState<Insight | null>(null);
    const [loading, setLoading]   = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [resetting,   setResetting]   = useState(false);
    const [showCheck,   setShowCheck]   = useState(false);

    useEffect(() => {
        if (!conseillerId) return;

        async function charger() {
            setLoading(true);
            const now   = new Date();
            const debutJour = new Date(now); debutJour.setHours(0, 0, 0, 0);
            const debut30j  = new Date(now); debut30j.setDate(now.getDate() - 30);

            // Lundi de cette semaine
            const lundi = new Date(now);
            lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            lundi.setHours(0, 0, 0, 0);

            // Lundi semaine précédente
            const lundiPrec = new Date(lundi);
            lundiPrec.setDate(lundi.getDate() - 7);

            const [resAujourd, res30j, resSemCour, resSemPrec] = await Promise.all([
                supabase.from("ventes").select("id,created_at,produits(nom,code)")
                    .eq("conseiller_id", conseillerId)
                    .or("source.neq.cerebro_check,source.is.null")
                    .gte("created_at", debutJour.toISOString())
                    .order("created_at", { ascending: true }),

                supabase.from("ventes").select("id,created_at,produits(nom,code)")
                    .eq("conseiller_id", conseillerId)
                    .or("source.neq.cerebro_check,source.is.null")
                    .gte("created_at", debut30j.toISOString()),

                supabase.from("ventes").select("id", { count: "exact", head: true })
                    .eq("conseiller_id", conseillerId)
                    .or("source.neq.cerebro_check,source.is.null")
                    .gte("created_at", lundi.toISOString()),

                supabase.from("ventes").select("id", { count: "exact", head: true })
                    .eq("conseiller_id", conseillerId)
                    .or("source.neq.cerebro_check,source.is.null")
                    .gte("created_at", lundiPrec.toISOString())
                    .lt("created_at", lundi.toISOString()),
            ]);

            const auj   = resAujourd.data ?? [];
            const j30   = res30j.data ?? [];
            const semC  = resSemCour.count ?? 0;
            const semP  = resSemPrec.count ?? 0;

            setVentesAujourdhui(auj);
            setHeatmap(buildHeatmap(j30));
            setInsight(computeInsights(j30, semC, semP));
            setLoading(false);
        }

        charger();
    }, [conseillerId]);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        </div>
    );

    const heatMax = heatmap.length ? Math.max(...heatmap.flat()) : 1;

    const tendanceCouleur = !insight ? "text-slate-500"
        : insight.tendance > 0 ? "text-green-600"
        : insight.tendance < 0 ? "text-red-500"
        : "text-slate-500";

    const TendanceIcon = !insight ? Minus
        : insight.tendance > 0 ? TrendingUp
        : insight.tendance < 0 ? TrendingDown
        : Minus;

    return (
    <>
        <div className="space-y-7">

            {/* ── Header ──────────────────────────────────────── */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">Analytics</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Mes stats</h1>
                <p className="mt-1 text-sm text-slate-400">Analyse de tes 30 derniers jours</p>
            </div>

            {/* ── KPI rapides ─────────────────────────────────── */}
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
                            <TendanceIcon size={22} strokeWidth={2.5} />
                        </div>
                        <p className="text-xs text-slate-400">vs semaine préc.</p>
                    </div>
                    <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Produit fort</p>
                        <p className="mt-2 text-3xl font-black text-slate-900 truncate">{insight.meilleurProduit ?? "—"}</p>
                        <p className="text-xs text-slate-400">30 derniers jours</p>
                    </div>
                </div>
            )}

            {/* ── Analyse IA ──────────────────────────────────── */}
            {insight && (insight.meilleureHeure !== null || insight.meilleurJour || insight.tendance !== 0) && (
                <div className="rounded-[24px] bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-[0_8px_32px_rgba(109,40,217,.3)]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl">🤖</div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Analyse automatique</p>
                            <p className="font-black text-white">Ce que tes données révèlent</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {insight.meilleureHeure !== null && (
                            <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                <span className="text-xl flex-shrink-0">🕐</span>
                                <p className="text-sm text-white/90">
                                    Tu vends le plus souvent autour de <strong className="text-white">{fmtHeure(insight.meilleureHeure)}</strong> — c'est ton créneau golden hour.
                                </p>
                            </div>
                        )}
                        {insight.meilleurJour && (
                            <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                <span className="text-xl flex-shrink-0">📅</span>
                                <p className="text-sm text-white/90">
                                    Le <strong className="text-white">{insight.meilleurJour}di</strong> est ton meilleur jour de la semaine.
                                </p>
                            </div>
                        )}
                        {insight.meilleurProduit && (
                            <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                <span className="text-xl flex-shrink-0">🏆</span>
                                <p className="text-sm text-white/90">
                                    <strong className="text-white">{insight.meilleurProduit}</strong> est ton produit phare. Tu excelles dessus — capitalise.
                                </p>
                            </div>
                        )}
                        {insight.tendance !== 0 && (
                            <div className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3">
                                <span className="text-xl flex-shrink-0">{insight.tendance > 0 ? "🚀" : "⚠️"}</span>
                                <p className="text-sm text-white/90">
                                    {insight.tendance > 0
                                        ? <>Ta dynamique est <strong className="text-green-300">en hausse de {insight.tendance}%</strong> cette semaine. Continue !</>
                                        : <>Cette semaine est <strong className="text-red-300">en baisse de {Math.abs(insight.tendance)}%</strong> vs la semaine passée. Redresse la barre !</>
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Timeline du jour ────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    🕐 Mes ventes aujourd'hui — {ventesAujourdhui.length} vente{ventesAujourdhui.length !== 1 ? "s" : ""}
                </p>
                {ventesAujourdhui.length === 0 ? (
                    <p className="text-center py-8 text-slate-300 text-sm">Pas encore de vente aujourd'hui</p>
                ) : (
                    <div className="space-y-2">
                        {ventesAujourdhui.map((v, i) => {
                            const d = new Date(v.created_at);
                            const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                            return (
                                <div key={v.id} className="flex items-center gap-4" style={{ animation: `fadeIn .3s ease ${i * 0.04}s both` }}>
                                    <span className="w-12 flex-shrink-0 text-right text-xs font-black text-slate-400 tabular-nums">{hm}</span>
                                    <div className="flex h-3 w-3 flex-shrink-0 items-center justify-center">
                                        <div className="h-3 w-3 rounded-full bg-violet-500" />
                                    </div>
                                    <div className="flex-1 rounded-2xl bg-violet-50 px-4 py-2.5">
                                        <span className="text-sm font-black text-violet-700">{v.produits?.nom ?? v.produits?.code ?? "—"}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Heatmap ─────────────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    📊 Heatmap — 30 derniers jours
                </p>
                <p className="mb-5 text-xs text-slate-300">Tes heures et jours les plus prolifiques</p>

                <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                        {/* Header heures */}
                        <div className="mb-2 flex items-center gap-1 pl-12">
                            {HEURES.map(h => (
                                <div key={h} className="w-10 text-center text-[10px] font-bold text-slate-300">{fmtHeure(h)}</div>
                            ))}
                        </div>

                        {/* Grille */}
                        {JOURS.map((jour, ji) => (
                            <div key={jour} className="mb-1 flex items-center gap-1">
                                <div className="w-10 flex-shrink-0 text-right text-[10px] font-bold text-slate-400 pr-2">{jour}</div>
                                {HEURES.map((_, hi) => {
                                    const n = heatmap[ji]?.[hi] ?? 0;
                                    return (
                                        <div
                                            key={hi}
                                            title={`${jour} ${fmtHeure(HEURES[hi])} : ${n} vente${n !== 1 ? "s" : ""}`}
                                            className={`flex h-9 w-10 items-center justify-center rounded-lg text-[10px] font-bold ${heatColor(n, heatMax)}`}
                                        >
                                            {n > 0 ? n : ""}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {/* Légende */}
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

            {/* ── Corriger mes chiffres ───────────────────────── */}
            {conseillerId && (
                <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
                                🧠 Corriger mes chiffres
                            </p>
                            <p className="mt-1 font-black text-slate-900">Une erreur sur un produit ?</p>
                            <p className="mt-1 text-sm text-slate-400">
                                Ajuste les totaux du mois sans toucher à tes ventes saisies.
                            </p>
                        </div>
                        {!showConfirm && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="flex-shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100 active:scale-[0.97]"
                            >
                                Corriger
                            </button>
                        )}
                    </div>

                    {showConfirm && (
                        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                            <p className="text-sm font-semibold text-violet-800">
                                Tes ventes saisies restent intactes. Tu pourras ajuster les totaux par produit dans l'écran suivant.
                            </p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:border-slate-300"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        setResetting(true);
                                        await resetCheckDate(conseillerId);
                                        setResetting(false);
                                        setShowConfirm(false);
                                        setShowCheck(true);
                                    }}
                                    disabled={resetting}
                                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition-all hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {resetting ? "Chargement…" : "Corriger mes chiffres"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity:0; transform:translateX(-8px); }
                    to   { opacity:1; transform:translateX(0); }
                }
            `}</style>
        </div>

        {showCheck && (
            <MorningCheck
                nom={nom}
                conseillerId={conseillerId}
                isReset={false}
                onValidated={() => {
                    marquerCheckFait(conseillerId).catch(() => {});
                    setShowCheck(false);
                }}
            />
        )}
    </>
    );
}

export default function StatsPage() {
    return <Suspense><StatsInner /></Suspense>;
}
