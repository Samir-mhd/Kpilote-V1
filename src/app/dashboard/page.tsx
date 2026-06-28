"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import HeroHeader from "@/components/dashboard/HeroHeader";
import StatsBar from "@/components/dashboard/StatsBar";
import CoachCard from "@/components/dashboard/CoachCard";
import MorningCheck from "@/components/dashboard/MorningCheck";
import MissionCard from "@/components/MissionCard";
import { produits } from "@/lib/mockData";
import { detecterEvenement } from "@/engine/eventEngine";
import { genererMessageCoach } from "@/engine/coachEngine";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const nom = searchParams.get("nom") || "Conseiller";

  const [morningCheckValidated, setMorningCheckValidated] = useState(false);
  const [totalVentesJour, setTotalVentesJour] = useState(0);
  const [coachMessage, setCoachMessage] = useState(
    "🎯 Commence par ta mission prioritaire du jour."
  );

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
        <HeroHeader nom={nom} />

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
              Déclare tes ventes en un clic.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {produits.map((produit) => (
              <MissionCard
                key={produit.produit}
                titre={produit.produit}
                realise={produit.realise}
                objectif={produit.objectif}
                couleur={produit.couleur}
                onSale={(titre, score, objectif) => {
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