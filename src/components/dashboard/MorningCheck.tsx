"use client";

import { useState } from "react";

type MorningCheckProps = {
  nom: string;
  onValidated: () => void;
};

const kpis = ["Box", "Forfaits", "Téléphones", "McAfee", "Assurance"];

export default function MorningCheck({ nom, onValidated }: MorningCheckProps) {
  const [correction, setCorrection] = useState(false);

  return (
    <main className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-8">
      <section className="w-full max-w-3xl bg-white rounded-[36px] p-10 shadow-2xl">
        <p className="text-green-600 font-black uppercase tracking-widest">
          Check du matin
        </p>

        <h1 className="text-5xl font-black mt-3">
          Bonjour {nom} 👋
        </h1>

        <p className="text-slate-500 text-xl mt-4">
          Avant de commencer, vérifie tes résultats à date avec Cerebro.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {kpis.map((kpi) => (
            <div key={kpi} className="rounded-2xl bg-slate-100 p-5">
              <p className="text-slate-500">{kpi}</p>
              {correction ? (
                <input
                  type="number"
                  defaultValue={0}
                  className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-2xl font-black outline-none"
                />
              ) : (
                <p className="text-3xl font-black mt-2">0</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onValidated}
            className="flex-1 rounded-2xl bg-green-500 text-white py-4 text-xl font-black hover:bg-green-600"
          >
            ✅ C’est correct
          </button>

          <button
            onClick={() => setCorrection(true)}
            className="flex-1 rounded-2xl bg-slate-900 text-white py-4 text-xl font-black hover:bg-slate-800"
          >
            ✏️ Corriger
          </button>
        </div>
      </section>
    </main>
  );
}