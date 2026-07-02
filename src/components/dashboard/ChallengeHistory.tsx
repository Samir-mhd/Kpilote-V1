"use client";

type ChallengeItem = {

    id: string;

    adversaire: string;

    produit: string;

    score: string;

    duree: string;

    resultat: "victory" | "defeat" | "draw";

    date: string;

};

type Props = {

    historique: ChallengeItem[];

};

const styles = {

    victory: {

        emoji: "🏆",

        color: "text-green-600",

        bg: "bg-green-50 border-green-200",

        titre: "Victoire",

    },

    defeat: {

        emoji: "💪",

        color: "text-red-600",

        bg: "bg-red-50 border-red-200",

        titre: "Défaite",

    },

    draw: {

        emoji: "🤝",

        color: "text-orange-600",

        bg: "bg-orange-50 border-orange-200",

        titre: "Égalité",

    },

};

export default function ChallengeHistory({

    historique,

}: Props) {

    return (

        <section className="rounded-[32px] border border-white/30 bg-white/80 p-7 shadow-[0_15px_45px_rgba(15,23,42,.10)] backdrop-blur-xl">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">

                        Défis

                    </p>

                    <h2 className="mt-2 text-3xl font-black text-slate-800">

                        Historique

                    </h2>

                </div>

                <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 text-white font-black shadow-xl">

                    {historique.length}

                </div>

            </div>

            {historique.length === 0 ? (

                <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-5xl">

                        ⚔️

                    </div>

                    <h3 className="mt-6 text-2xl font-black text-slate-800">

                        Aucun défi terminé

                    </h3>

                    <p className="mt-4 text-slate-500">

                        Ton historique apparaîtra ici après ton premier défi.

                    </p>

                </div>

            ) : (

                <div className="mt-8 space-y-5">

                    {historique.map((challenge) => {

                        const style =

                            styles[challenge.resultat];

                        return (

                            <div

                                key={challenge.id}

                                className={`rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.bg}`}

                            >

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className={`font-black ${style.color}`}>

                                            {style.emoji} {style.titre}

                                        </p>

                                        <p className="mt-3 text-xl font-black text-slate-800">

                                            contre {challenge.adversaire}

                                        </p>

                                        <p className="mt-1 text-slate-500">

                                            Produit : {challenge.produit}

                                        </p>

                                    </div>

                                    <div className="text-right">

                                        <p className="text-3xl font-black text-slate-800">

                                            {challenge.score}

                                        </p>

                                        <p className="mt-2 text-sm text-slate-500">

                                            {challenge.duree}

                                        </p>

                                        <p className="text-xs text-slate-400">

                                            {challenge.date}

                                        </p>

                                    </div>

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

        </section>

    );

}