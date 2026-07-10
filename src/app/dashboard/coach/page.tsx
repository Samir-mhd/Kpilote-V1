"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMissionsCompletes, MissionComplete, getVentesAujourdhui } from "@/services/missionsReelles";
import { analyserDashboard } from "@/engine/contextEngine";
import { genererMessageCoach } from "@/engine/coachEngine";
import { detecterEvenement } from "@/engine/eventEngine";

const etatConfig = {
    termine:  { icon: "🏆", label: "Objectif atteint",   color: "text-green-600", bg: "bg-green-50" },
    avance:   { icon: "🚀", label: "En avance",           color: "text-blue-600",  bg: "bg-blue-50" },
    rythme:   { icon: "🔥", label: "Dans le rythme",      color: "text-amber-600", bg: "bg-amber-50" },
    retard:   { icon: "⚠️", label: "À rattraper",         color: "text-red-600",   bg: "bg-red-50" },
};

function CoachInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const nom = searchParams.get("nom") ?? "Conseiller";

    const [missions, setMissions] = useState<MissionComplete[]>([]);
    const [ventesJour, setVentesJour] = useState(0);
    const [messageCoach, setMessageCoach] = useState("");
    const [messageHero, setMessageHero] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        async function charger() {
            setLoading(true);
            try {
                const [missionsData, ventes] = await Promise.all([
                    getMissionsCompletes(conseillerId),
                    getVentesAujourdhui(conseillerId),
                ]);

                setMissions(missionsData);
                setVentesJour(ventes);

                // Contexte dashboard
                const contexte = analyserDashboard(missionsData.map((m) => ({
                    produit: m.produit,
                    objectif: m.objectifJour,
                    realise: m.realise,
                })));
                setMessageHero(contexte.messageHero);
                setMessageCoach(contexte.messageCoach);
            } finally {
                setLoading(false); }
        }
        charger();
    }, [conseillerId]);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>;
    }

    // Priorités : produits en retard d'abord, puis en rythme
    const priorites = [...missions].sort((a, b) => {
        const ordre = { retard: 0, rythme: 1, avance: 2, termine: 3 };
        return (ordre[a.etat] ?? 2) - (ordre[b.etat] ?? 2);
    });

    const resteTotal = missions.reduce((t, m) => t + m.resteAFaire, 0);
    const objectifJourTotal = missions.reduce((t, m) => t + m.objectifJour, 0);
    const rythmePct = objectifJourTotal > 0 ? Math.round((ventesJour / objectifJourTotal) * 100) : 0;

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">Coach IA</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Ton coach KPILOTE</h1>
            </div>

            {/* Message principal */}
            <div className="rounded-[24px] bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-900 p-8 text-white shadow-[0_8px_32px_rgba(0,0,0,.25)]">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">🤖</div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Message du jour</p>
                        <p className="mt-1 text-lg font-black">Bonjour {nom} 👋</p>
                    </div>
                </div>
                <p className="mt-5 text-lg leading-8 text-white/85">{messageHero}</p>
                <div className="mt-5 rounded-2xl bg-white/10 p-5">
                    <p className="text-white/70">{messageCoach}</p>
                </div>
            </div>

            {/* Rythme du jour */}
            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: "Ventes aujourd'hui", val: ventesJour, icon: "📦", color: "text-green-600" },
                    { label: "Objectif du jour", val: objectifJourTotal, icon: "🎯", color: "text-violet-600" },
                    { label: "Restant ce mois", val: resteTotal, icon: "⏳", color: "text-orange-500" },
                ].map(({ label, val, icon, color }) => (
                    <div key={label} className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <p className="text-2xl">{icon}</p>
                        <p className={`mt-2 text-3xl font-black ${color}`}>{val}</p>
                        <p className="text-xs text-slate-400">{label}</p>
                    </div>
                ))}
            </div>

            {/* Rythme bar */}
            <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-600">Rythme du jour</p>
                    <p className={`text-sm font-black ${rythmePct >= 100 ? "text-green-600" : rythmePct >= 60 ? "text-amber-600" : "text-red-500"}`}>
                        {rythmePct}%
                    </p>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${rythmePct >= 100 ? "bg-green-500" : rythmePct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(rythmePct, 100)}%` }}
                    />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    {rythmePct >= 100 ? "🏆 Tu es dans les temps !" : `${ventesJour} ventes / ${objectifJourTotal} visées aujourd'hui`}
                </p>
            </div>

            {/* Priorités produits */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Priorités & conseils produits</p>
                <div className="space-y-4">
                    {priorites.map((m, idx) => {
                        const cfg = etatConfig[m.etat];
                        return (
                            <div key={m.produit} className={`flex items-start gap-4 rounded-2xl p-5 ${cfg.bg}`}>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500 shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-black ${cfg.color}`}>{cfg.icon} {m.produit}</p>
                                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">{m.message}</p>
                                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                                        <span>Réalisé : <strong>{m.realise}</strong></span>
                                        <span>Objectif/jour : <strong>{m.objectifJour}</strong></span>
                                        <span>Progression : <strong>{m.progression}%</strong></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}

export default function CoachPage() {
    return <Suspense><CoachInner /></Suspense>;
}
