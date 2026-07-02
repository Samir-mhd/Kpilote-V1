"use client";

type Props = {

  conseillerId: string;

  conseiller: string;

  managerId: string;

  onSend: (
    message: string
  ) => void;

};

const messages = [

  "👏 Bravo !",

  "🔥 Excellent travail !",

  "🚀 Continue comme ça !",

  "💪 Belle progression !",

  "🏆 Très beau défi !",

  "⭐ Merci pour ton implication !",

];

export default function FelicitationCard({

  conseiller,

  onSend,

}: Props) {

  return (

    <div className="rounded-3xl bg-white p-6 shadow-xl">

      <p className="text-green-600 font-black uppercase">

        Félicitations

      </p>

      <h2 className="mt-2 text-2xl font-black">

        {conseiller}

      </h2>

      <div className="mt-6 space-y-3">

        {messages.map(message => (

          <button

            key={message}

            onClick={() => onSend(message)}

            className="w-full rounded-2xl border p-4 text-left hover:bg-green-50 transition"

          >

            {message}

          </button>

        ))}

      </div>

    </div>

  );

}