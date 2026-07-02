"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  adversaire: string;
  produit: string;
  raison: string;
  onAccept: (duree: number) => void;
  onDecline: () => void;
};

export default function ChallengeModal({
  open,
  adversaire,
  produit,
  raison,
  onAccept,
  onDecline,
}: Props) {
  const [duree, setDuree] = useState(30);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">

      <div className="w-full max-w-xl rounded-[36px] bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95">

        <p className="text-center font-bold uppercase tracking-widest text-green-600">
          🤖 KPILOTE
        </p>

        <h2 className="mt-3 text-center text-3xl font-black text-slate-900">
          Nouveau défi
        </h2>

        <p className="mt-4 text-center text-slate-500">
          Je pense qu'un défi est une bonne opportunité aujourd'hui.
        </p>

        <div className="mt-10 flex items-center justify-center gap-10">

          <div className="text-center">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl">
              😎
            </div>

            <p className="mt-3 font-bold">
              Toi
            </p>

          </div>

          <div className="text-center">

            <div className="text-5xl font-black text-violet-600">
              ⚡
            </div>

            <p className="mt-2 font-black">
              VS
            </p>

          </div>

          <div className="text-center">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-5xl">
              😏
            </div>

            <p className="mt-3 font-bold">
              {adversaire}
            </p>

          </div>

        </div>

        <div className="mt-10 rounded-3xl bg-slate-100 p-6">

          <p className="text-sm uppercase tracking-widest text-slate-500">
            Produit
          </p>

          <h3 className="mt-2 text-2xl font-black">
            📦 {produit}
          </h3>

          <p className="mt-5 text-sm uppercase tracking-widest text-slate-500">
            Pourquoi ?
          </p>

          <p className="mt-2 text-slate-700">
            {raison}
          </p>

        </div>

        <div className="mt-8">

          <label className="font-bold">
            Durée du défi
          </label>

          <select
            value={duree}
            onChange={(e) =>
              setDuree(Number(e.target.value))
            }
            className="mt-3 w-full rounded-2xl border border-slate-300 p-4"
          >
            <option value={10}>10 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 heure</option>
            <option value={120}>2 heures</option>
          </select>

        </div>

        <div className="mt-10 flex justify-end gap-4">

          <button
            onClick={onDecline}
            className="rounded-2xl bg-slate-200 px-6 py-4 font-bold hover:bg-slate-300 transition"
          >
            Refuser
          </button>

          <button
            onClick={() => onAccept(duree)}
            className="rounded-2xl bg-green-500 px-8 py-4 font-bold text-white hover:bg-green-600 transition"
          >
            Accepter le défi ⚔️
          </button>

        </div>

      </div>

    </div>
  );
}