"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HeroHeader from "@/components/dashboard/HeroHeader";
import StatsBar from "@/components/dashboard/StatsBar";
import CoachCard from "@/components/dashboard/CoachCard";
import MorningCheck from "@/components/dashboard/MorningCheck";
import MissionCard from "@/components/MissionCard";
import { detecterEvenement } from "@/engine/eventEngine";
import { genererMessageCoach } from "@/engine/coachEngine";
import { traiterVente } from "@/engine/venteEngine";
import { getMissionsReelles } from "@/services/missionsReelles";
import { analyserDashboard } from "@/engine/contextEngine";

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

  const [morningCheckValidated, setMorningCheckValidated] = useState(false);
  const [totalVentesJour, setTotalVentesJour] = useState(0);
  const [heroMessage, setHeroMessage] = useState("Chargement de ta journée...");
  const [coachMessage, setCoachMessage] = useState(
    "🎯 Commence par ta mission prioritaire du jour."
  );
  const [missions, setMissions] = useState<MissionDashboard[]>([]);

  async function chargerMissions() {
    if (!conseillerId) return;

    const data = await getMissionsReelles(conseillerId);
    setMissions(data);

    const contexte = analyserDashboard(
      data.map((m) => ({
        produit: m.produit,
        objectif: m.objectif,
        realise: m.realise,
      }))
    );

    setHeroMessage(contexte.messageHero);
    setCoachMessage(contexte.messageCoach);
  }

  useEffect(() => {
    chargerMissions();
  }, [conseillerId]);

  if (!morningCheckValidated) {
    return (
      <MorningCheck
        nom={nom}
        onValidated={() => setMorningCheckValidated(true)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <HeroHeader nom={nom} message={heroMessage} />

        <StatsBar />

        <CoachCard nom={nom} message={coachMessage} />

        <section className="mt-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-green-600 font-bold uppercase tracking-widest">
                Mission du jour
              </p>

              <h2 className="text-4xl font-black text-slate-900">
                Tes objectifs
              </h2>
            </div>

            <p className="text-slate-500">
              Objectifs calculés depuis Supabase.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {missions.map((mission) => (
              <MissionCard
                key={mission.produit}
                titre={mission.produit}
                realise={mission.realise}
                objectif={mission.objectif}
                couleur={mission.couleur}
                onSale={async (titre, score, objectif) => {
                  if (conseillerId) {
                    await traiterVente({
                      conseillerId,
                      produit: titre,
                    });

                    await chargerMissions();
                  }

                  const nouveauTotal = totalVentesJour + 1;
                  setTotalVentesJour(nouveauTotal);

                  const event = detecterEvenement({
                    score,
                    objectif,
                    totalVentesJour: nouveauTotal,
                  });

                  const reste = Math.max(objectif - score, 0);

                  setCoachMessage(
                    genererMessageCoach({
                      event,
                      produit: titre,
                      reste,
                      prenom: nom,
                      totalVentesJour: nouveauTotal,
                    })
                  );
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}