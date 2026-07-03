"use client";

import CoachManagerCard from "@/components/manager/CoachManagerCard";
import RecommandationsManager from "@/components/manager/RecommandationsManager";
import LancerDefiCard from "@/components/manager/LancerDefiCard";

import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { construireAlertes } from "@/engine/managerAI/alertesEngine";
import { construireDecision } from "@/services/manager/ManagerCoachAI";

const niveauIcon: Record<string, string> = {
    success: "✅",
    warning: "⚠️",
    danger: "🔴",
};

const niveauColor: Record<string, string> = {
    success: "text-emerald-700",
    warning: "text-orange-700",
    danger: "text-red-700",
};

export default function BriefPage() {
    const { dashboard, loading } = useManagerDashboard();

    if (loading || !dashboard) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const alertes = construireAlertes(dashboard.kpis);

    return (
        <main>
            <h1 className="text-4xl font-black text-slate-900">Brief du matin</h1>
            <p className="mt-2 text-slate-400">
                Généré par votre IA — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {/* Carte résumé gradient */}
            <div className="mt-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-8 shadow-[0_16px_60px_rgba(109,40,217,.35)]">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur">
                        🤖
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-200">
                            KPILOTE IA
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-white">
                            Résumé de la journée en un coup d'œil
                        </h2>
                        <p className="mt-3 text-lg leading-8 text-white/80">
                            {dashboard.intelligence.summary}
                        </p>
                    </div>
                </div>

                {/* Points clés */}
                <div className="mt-8 space-y-3">
                    {dashboard.briefs.slice(0, 5).map((brief) => (
                        <div key={brief.titre} className="flex items-start gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                            <span className="text-lg">{niveauIcon[brief.niveau]}</span>
                            <div>
                                <p className="font-black text-white">{brief.titre}</p>
                                <p className="mt-0.5 text-sm text-white/70">{brief.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Coach IA */}
            {dashboard.classement.length > 0 && (
                <div className="mt-8">
                    <CoachManagerCard
                        coach={dashboard.coach}
                        decision={construireDecision({
                            kpis: dashboard.kpis,
                            classement: dashboard.classement,
                        })}
                    />
                </div>
            )}

            {/* Alertes + Recommandations en deux colonnes */}
            <div className="mt-8 grid gap-6 xl:grid-cols-2">

                {/* Alertes */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-sm">🚨</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Points de vigilance</p>
                    </div>

                    {alertes.length === 0 ? (
                        <p className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center font-semibold text-emerald-700">
                            ✅ Aucune alerte — la boutique est bien dans les clous.
                        </p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {alertes.map((alerte) => (
                                <div key={alerte.titre} className="rounded-2xl border-l-4 border-red-400 bg-red-50 px-5 py-4">
                                    <p className="font-black text-red-800">{alerte.titre}</p>
                                    <p className="mt-1 text-sm text-red-600">{alerte.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions recommandées */}
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-sm">⚡</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Actions recommandées</p>
                    </div>

                    <div className="mt-5 space-y-4">
                        {dashboard.recommandations.map((reco, index) => (
                            <div key={reco.titre} className="flex items-start gap-4 rounded-2xl bg-slate-50 p-5">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800">{reco.titre}</p>
                                    <p className="mt-1 text-sm text-slate-500">{reco.action}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Lancer un défi / challenge */}
            {dashboard.classement.length >= 2 && (
                <div className="mt-8">
                    <LancerDefiCard
                        conseillers={dashboard.classement.map(c => ({
                            id: c.id,
                            prenom: c.prenom,
                        }))}
                    />
                </div>
            )}

            {/* Intelligence observations */}
            {dashboard.intelligence.observations.length > 0 && (
                <div className="mt-8 rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-sm">🔬</span>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Observations IA détaillées</p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {dashboard.intelligence.observations.map((obs, idx) => (
                            <div key={`${obs.id}-${idx}`} className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-black text-slate-800">{obs.label}</p>
                                <p className="mt-1 text-xs text-slate-500">{obs.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </main>
    );
}
