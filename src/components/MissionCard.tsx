"use client";

import { useState } from "react";

type MissionCardProps = {
  titre: string;
  realise: number;
  objectif: number;
  couleur: string;
  onSale?: (produit: string, score: number, objectif: number) => void;
};

const icones: Record<string, string> = {
  Box: "📦",
  Forfaits: "📱",
  Téléphones: "📲",
  McAfee: "🛡️",
  Assurance: "✅",
};

const labels: Record<string, string> = {
  Box: "une Box",
  Forfaits: "un Forfait",
  Téléphones: "un Téléphone",
  McAfee: "McAfee",
  Assurance: "une Assurance",
};

export default function MissionCard({
  titre,
  realise,
  objectif,
  couleur,
  onSale,
}: MissionCardProps) {
  const [score, setScore] = useState(realise);

  const progression = Math.min((score / objectif) * 100, 100);
  const termine = score >= objectif;

  function ajouter() {
    const nouveauScore = score + 1;
    setScore(nouveauScore);
    onSale?.(titre, nouveauScore, objectif);
  }

  return (
    <div
      className={`rounded-[30px] p-8 shadow-xl transition-all duration-300 hover:scale-[1.02] ${
        termine
          ? "bg-gradient-to-br from-green-500 to-emerald-400 text-white"
          : "bg-white"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-5">
          <div className="text-6xl">{icones[titre]}</div>
          <div>
            <h2 className="text-3xl font-black">{titre}</h2>
            <p className={termine ? "text-green-100" : "text-slate-500"}>
              {score} / {objectif}
            </p>
          </div>
        </div>

        <div className="text-5xl">{termine ? "🏆" : "🎯"}</div>
      </div>

      <div
        className={`mt-8 h-4 rounded-full overflow-hidden ${
          termine ? "bg-white/30" : "bg-slate-200"
        }`}
      >
        <div
          className={`h-full transition-all duration-700 ${
            termine ? "bg-white" : couleur
          }`}
          style={{ width: `${progression}%` }}
        />
      </div>

      <div className="mt-8 flex justify-between items-center">
        <div>
          {termine ? (
            <>
              <p className="text-lg font-bold">🎉 Mission accomplie</p>
              <p className="text-sm opacity-90">
                Continue pour prendre de l’avance
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Encore</p>
              <p className="text-2xl font-black">{objectif - score}</p>
            </>
          )}
        </div>

        <button
          onClick={ajouter}
          className={`rounded-2xl px-6 py-4 text-lg font-bold transition-all ${
            termine
              ? "bg-white/20 text-white hover:bg-white/30 active:scale-95"
              : "bg-slate-900 text-white hover:bg-green-500 hover:scale-105 active:scale-95"
          }`}
        >
          J’ai vendu {labels[titre]}
        </button>
      </div>
    </div>
  );
}