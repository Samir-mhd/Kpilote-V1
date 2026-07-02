"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HeroHeader from "@/components/dashboard/HeroHeader";
import StatsBar from "@/components/dashboard/StatsBar";
import MorningCheck from "@/components/dashboard/MorningCheck";
import MissionCard from "@/components/MissionCard";
import { detecterEvenement } from "@/engine/eventEngine";
import { genererMessageCoach } from "@/engine/coachEngine";
import { traiterVente } from "@/engine/venteEngine";
import { getMissionsReelles } from "@/services/missionsReelles";
import { analyserDashboard } from "@/engine/contextEngine";
import { supabase } from "@/lib/supabase";

type MissionDashboard = {
    produit: string;
    objectif: number;
    realise: number;
    couleur: string;
    message: string;
};

export default function Dashboard() {
    const searchParams = useSearchParams();
    const nom = searchParams.get("nom") || "Conseiller";
    const conseillerId = searchParams.get("id") || "";

    const cleCheck = conseillerId
        ? `morning-check-${conseillerId}-${new Date().toISOString().slice(0, 10)}`
        : null;

    const [morningCheckValidated, setMorningCheckValidated] = useState(() => {
        if (!conseillerId) return true;
        try {
            return localStorage.getItem(
                `morning-check-${conseillerId}-${new Date().toISOString().slice(0, 10)}`
            ) === "done";
        } catch { return false; }
    });

    const [totalVentesJour, setTotalVentesJour] = useState(0);
    const [heroMessage, setHeroMessage] = useState("Chargement de ta journée...");
    const [coachMessage, setCoachMessage] = useState("🎯 Commence par ta mission prioritaire du jour.");
    const [missions, setMissions] = useState<MissionDashboard[]>([]);
    const [rang, setRang] = useState(0);

    async function chargerMissions() {
        if (!conseillerId) return;
        const data = await getMissionsReelles(conseillerId);
        setMissions(data);
        const contexte = analyserDashboard(
            data.map((m) => ({ produit: m.produit, objectif: m.objectif, realise: m.realise }))
        );
        setHeroMessage(contexte.messageHero);
        setCoachMessage(contexte.messageCoach);
    }

    async function chargerRang() {
        if (!conseillerId) return;
        try {
            const debut = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { data } = await supabase
                .from("ventes")
                .select("conseiller_id, quantite")
                .gte("created_at", debut);
            if (!data) return;
            const totaux: Record<string, number> = {};
            data.forEach((v: any) => {
                totaux[v.conseiller_id] = (totaux[v.conseiller_id] ?? 0) + v.quantite;
            });
            const sorted = Object.entries(totaux).sort((a, b) => b[1] - a[1]);
            const pos = sorted.findIndex(([id]) => id === conseillerId) + 1;
            setRang(pos > 0 ? pos : 0);
        } catch { /* silencieux */ }
    }

    useEffect(() => {
        chargerMissions();
        chargerRang();
    }, [conseillerId]);

    if (!morningCheckValidated) {
        return (
            <MorningCheck
                nom={nom}
                conseillerId={conseillerId}
                onValidated={() => {
                    if (cleCheck) { try { localStorage.setItem(cleCheck, "done"); } catch {} }
                    setMorningCheckValidated(true);
                }}
            />
        );
    }

    const realiseGlobal = missions.reduce((t, m) => t + m.realise, 0);
    const objectifGlobal = missions.reduce((t, m) => t + m.objectif, 0);
    const tauxGlobal = objectifGlobal > 0 ? Math.round((realiseGlobal / objectifGlobal) * 100) : 0;

    async function handleSale(produit: string) {
        const mission = missions.find((m) => m.produit === produit);
        if (!mission) return;
        if (conseillerId) {
            await traiterVente({ conseillerId, produit });
            await chargerMissions();
            await chargerRang();
        }
        const nouveauTotal = totalVentesJour + 1;
        setTotalVentesJour(nouveauTotal);
        const event = detecterEvenement({
            score: mission.realise + 1,
            objectif: mission.objectif,
            totalVentesJour: nouveauTotal,
        });
        setCoachMessage(
            genererMessageCoach({
                event,
                produit,
                reste: Math.max(mission.objectif - mission.realise - 1, 0),
                prenom: nom,
                totalVentesJour: nouveauTotal,
            })
        );
    }

    return (
        <div className="space-y-8">

            <HeroHeader
                nom={nom}
                message={heroMessage}
                coachMessage={coachMessage}
                progression={tauxGlobal}
                rang={rang}
            />

            <StatsBar
                ventes={realiseGlobal}
                objectif={objectifGlobal}
                taux={tauxGlobal}
                rang={rang}
            />

            <section>
                <div className="flex items-end justify-between mb-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">
                            Mission du jour
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">Tes objectifs</h2>
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {missions.map((mission) => (
                        <MissionCard
                            key={mission.produit}
                            titre={mission.produit}
                            realise={mission.realise}
                            objectif={mission.objectif}
                            couleur={mission.couleur}
                            onSale={handleSale}
                        />
                    ))}
                </div>
            </section>

        </div>
    );
}
