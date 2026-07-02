"use client";

type Props = {

    onCreate: () => void;

};

export default function CreateChallengeCard({

    onCreate,

}: Props) {

    return (

        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-2xl">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-sm font-bold uppercase tracking-widest opacity-80">

                        Défi

                    </p>

                    <h2 className="mt-2 text-3xl font-black">

                        ⚔ Défier un collègue

                    </h2>

                    <p className="mt-4 max-w-lg text-white/90">

                        Lance un défi personnalisé à un collègue.
                        Choisis le KPI, la durée et tente de prendre
                        l'avantage.

                    </p>

                </div>

                <button

                    onClick={onCreate}

                    className="rounded-2xl bg-white px-8 py-4 font-black text-slate-900 transition hover:scale-105"

                >

                    Nouveau défi

                </button>

            </div>

        </div>

    );

}