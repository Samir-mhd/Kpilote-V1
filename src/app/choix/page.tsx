"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";

type Conseiller = {
  id: string;
  nom: string;
  avatar: string | null;
};

export default function ChoixConseiller() {
  const [conseillers, setConseillers] = useState<Conseiller[]>([]);

  useEffect(() => {
    async function charger() {
      const data = await getConseillers();
      setConseillers(data);
    }

    charger();
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F7FB] p-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-black">Bonjour 👋</h1>

        <p className="text-slate-500 mt-3 text-xl">
          Qui se connecte aujourd'hui ?
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {conseillers.map((conseiller) => (
            <Link
              key={conseiller.id}
              href={`/dashboard?nom=${encodeURIComponent(
                conseiller.nom
              )}&id=${conseiller.id}`}
              className="block"
            >
              <div className="bg-white rounded-[32px] p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all">
                <div className="text-7xl text-center">
                  {conseiller.avatar ?? "😀"}
                </div>

                <h2 className="text-3xl font-black text-center mt-6">
                  {conseiller.nom}
                </h2>

                <p className="text-center text-green-600 font-bold mt-3">
                  Se connecter →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}