"use client";

import { useEffect, useState } from "react";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { construireAlertes } from "@/engine/managerAI/alertesEngine";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { Periode, PERIODE_LABELS, proratiserObjectif, couleurTaux } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

const niveauColor: Record<string, string> = {
    success: "border-emerald-400/60 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-400/60 bg-amber-500/10 text-amber-300",
    danger:  "border-red-400/60 bg-red-500/10 text-red-300",
};
const niveauIcon: Record<string, string> = { success: "✅", warning: "⚠️", danger: "🔴" };

function dateAujourdhui() {
    return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ManagerDashboard() {
    const { dashboard, loading, refresh } = useManagerDashboard();
    const [periode, setPeriode]   = useState<Periode>("mois");
    const [kpiData, setKpiData]   = useState<ConseillerStats[]>([]);
    const [kpiLoad, setKpiLoad]   = useState(false);
    const [photos, setPhotos]     = useState<Record<string, string | null>>({});

    useEffect(() => {
        setKpiLoad(true);
        construireClassementPeriode(periode)
            .then(data => {
                setKpiData(data);
                getPhotosByIds(data.map(c => c.id)).then(setPhotos).catch(() => {});
            })
            .catch(() => {})
            .finally(() => setKpiLoad(false));
    }, [periode]);

    // Totaux boutique par produit
    const boutiqueTotaux = PRODUITS_ORDRE.map(p => {
        const realise  = kpiData.reduce((t, c) => t + c.produits[p.key], 0);
        const objectif = Math.round(kpiData.reduce((t, c) => t + proratiserObjectif(c.objectifs[p.key], periode), 0));
        const pct      = objectif > 0 ? Math.min(Math.round((realise / objectif) * 100), 100) : 0;
        const ct       = couleurTaux(realise, objectif);
        return { ...p, realise, objectif, pct, ct };
    });

    const totalRealise  = boutiqueTotaux.reduce((t, p) => t + p.realise, 0);
    const totalObjectif = boutiqueTotaux.reduce((t, p) => t + p.objectif, 0);
    const tauxGlobal    = totalObjectif > 0 ? Math.min(Math.round((totalRealise / totalObjectif) * 100), 100) : 0;
    const ctGlobal      = couleurTaux(totalRealise, totalObjectif);

    if (loading || !dashboard) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    <p className="mt-4 text-slate-400">Chargement du cockpit...</p>
                </div>
            </div>
        );
    }

    const alertes = construireAlertes(dashboard.kpis);
    const top3    = dashboard.classement.slice(0, 3);

    return (
        <main className="space-y-7">

            {/* ── Hero banner Objectifs Boutique ───────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_64px_rgba(15,23,42,.40)]">

                {/* Halos */}
                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

                <div className="relative p-8">

                    {/* Header ligne */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-400">
                                KPILOTE Manager
                            </p>
                            <h1 className="mt-2 text-4xl font-black text-white">
                                Bonjour 👋
                            </h1>
                            <p className="mt-1 text-sm font-medium capitalize text-white/40">
                                {dateAujourdhui()}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Période */}
                            <div className="flex gap-1.5 rounded-2xl bg-white/8 p-1.5">
                                {(["jour", "semaine", "mois"] as Periode[]).map(p => (
                                    <button key={p} onClick={() => setPeriode(p)}
                                        className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                                            periode === p
                                                ? "bg-white text-slate-900 shadow-md"
                                                : "text-white/50 hover:text-white/80"
                                        }`}>
                                        {PERIODE_LABELS[p]}
                                    </button>
                                ))}
                            </div>
                            <button onClick={refresh}
                                className="rounded-xl bg-white/8 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/15 hover:text-white transition-all">
                                ↻
                            </button>
                        </div>
                    </div>

                    {/* Cartes produits */}
                    {kpiLoad ? (
                        <div className="flex h-36 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 gap-4">
                            {boutiqueTotaux.map(p => (
                                <div
                                    key={p.code}
                                    className={`relative overflow-hidden rounded-[22px] border bg-white/6 p-5 backdrop-blur-sm transition-all hover:bg-white/10 ${
                                        p.pct >= 100 ? "border-emerald-400/30" :
                                        p.pct >= 50  ? "border-amber-400/30" :
                                                       "border-red-400/30"
                                    }`}
                                >
                                    {/* Accent couleur en haut */}
                                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-[22px] ${p.ct.bar}`} />

                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-2xl">{p.emoji}</span>
                                        <span className={`text-xs font-black ${p.ct.text}`}>{p.pct}%</span>
                                    </div>

                                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/40 mb-1">
                                        {p.label}
                                    </p>

                                    <p className="text-4xl font-black text-white leading-none">
                                        {p.realise}
                                    </p>

                                    {p.objectif > 0 && (
                                        <p className="text-xs text-white/30 mt-1">
                                            / {p.objectif}
                                        </p>
                                    )}

                                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className={`h-full rounded-full ${p.ct.bar} transition-all duration-700`}
                                            style={{ width: `${p.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer global */}
                    {!kpiLoad && (
                        <div className="mt-6 flex items-center gap-6 rounded-2xl bg-white/6 px-6 py-4">
                            <div className="flex-shrink-0">
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">Total boutique</p>
                                <p className="mt-0.5 text-2xl font-black text-white">
                                    {totalRealise}
                                    <span className="text-base text-white/30 ml-2">/ {totalObjectif}</span>
                                </p>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs text-white/30">Progression globale</p>
                                    <p className={`text-sm font-black ${ctGlobal.text}`}>{tauxGlobal}%</p>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full ${ctGlobal.bar} transition-all duration-700`}
                                        style={{ width: `${tauxGlobal}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <p className="text-xs text-white/30">{PERIODE_LABELS[periode]}</p>
                                <p className="text-xs font-semibold text-white/50">
                                    {kpiData.length} conseiller{kpiData.length > 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 3 colonnes : Brief IA | Alertes | Top ────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-3">

                {/* Brief IA */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-base">🧠</span>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Brief IA</p>
                    </div>

                    <p className="text-base font-black text-slate-900 mb-4">
                        {dashboard.intelligence.summary}
                    </p>

                    <div className="space-y-2.5">
                        {dashboard.briefs.slice(0, 4).map((brief) => (
                            <div key={brief.titre}
                                className={`flex items-start gap-3 rounded-2xl border-l-4 px-4 py-3 text-sm ${niveauColor[brief.niveau]}`}>
                                <span className="flex-shrink-0 mt-0.5">{niveauIcon[brief.niveau]}</span>
                                <div>
                                    <p className="font-black">{brief.titre}</p>
                                    <p className="mt-0.5 text-xs opacity-70">{brief.message}</p>
                                </div>
                            </div>
                        ))}
                        {dashboard.briefs.length === 0 && (
                            <p className="text-sm text-slate-400 italic">Aucun brief disponible.</p>
                        )}
                    </div>
                </div>

                {/* Alertes */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-base">🚨</span>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Alertes</p>
                    </div>

                    {alertes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl mb-3">✅</div>
                            <p className="font-black text-emerald-700">Aucune alerte</p>
                            <p className="mt-1 text-xs text-slate-400">La boutique est dans les clous.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {alertes.map((alerte) => (
                                <div key={alerte.titre} className="rounded-2xl bg-red-50 border border-red-100 p-4">
                                    <p className="text-sm font-black text-red-800">{alerte.titre}</p>
                                    <p className="mt-1 text-xs text-red-600">{alerte.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Performers */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-base">🏆</span>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Top Performers</p>
                    </div>

                    {top3.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Aucune donnée.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {top3.map((c, i) => {
                                const medals = ["🥇", "🥈", "🥉"];
                                const totalObj = PRODUITS_ORDRE.reduce((t, p) =>
                                    t + proratiserObjectif((c.objectifs as any)[p.key] ?? 0, periode), 0);
                                const taux = totalObj > 0 ? Math.round((c.ventes / totalObj) * 100) : 0;
                                const ct   = couleurTaux(c.ventes, totalObj);

                                return (
                                    <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 hover:bg-slate-100 transition-all">
                                        <span className="text-xl flex-shrink-0">{medals[i]}</span>
                                        <div className="overflow-hidden rounded-full flex-shrink-0">
                                            <PhotoAvatar nom={c.prenom} photoUrl={photos[c.id]} size={36} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 text-sm truncate">{c.prenom}</p>
                                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                                                <div className={`h-full rounded-full ${ct.bar}`} style={{ width: `${Math.min(taux, 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-lg font-black text-slate-800">{c.ventes}</p>
                                            <p className={`text-xs font-bold ${ct.text}`}>{taux}%</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {dashboard.classement.length > 3 && (
                        <p className="mt-4 text-center text-xs text-slate-400">
                            + {dashboard.classement.length - 3} autres conseillers
                        </p>
                    )}
                </div>

            </div>

            {/* ── Recommandation IA ────────────────────────────────────────── */}
            {dashboard.recommandations.length > 0 && (
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-violet-600 to-indigo-600 p-7 shadow-[0_8px_32px_rgba(109,40,217,.30)]">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl flex-shrink-0">💡</span>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200 mb-1">
                                    Recommandation IA
                                </p>
                                <p className="text-lg font-black text-white">
                                    {dashboard.recommandations[0].titre}
                                </p>
                                <p className="mt-1 text-sm text-violet-100">
                                    {dashboard.recommandations[0].action}
                                </p>
                            </div>
                        </div>
                        <button className="flex-shrink-0 rounded-2xl bg-white px-6 py-3 font-black text-violet-700 shadow transition-all hover:scale-[1.02]">
                            Lancer un challenge →
                        </button>
                    </div>
                </div>
            )}

        </main>
    );
}
