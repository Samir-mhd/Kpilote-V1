"use client";

type Props = {
    open: boolean;
    conseiller: string;
    adversaire: string;
    conseillerAvatar?: string;
    adversaireAvatar?: string;
    produit: string;
    scoreConseiller: number;
    scoreAdversaire: number;
    tempsRestant: string;
    message: string;
    onClose: () => void;
};

export default function ChallengeVS({
    open,
    conseiller,
    adversaire,
    conseillerAvatar,
    adversaireAvatar,
    produit,
    scoreConseiller,
    scoreAdversaire,
    tempsRestant,
    message,
    onClose,
}: Props) {

    if (!open) return null;

    return (

        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fadeIn">

            <div className="relative w-full max-w-5xl overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-950 shadow-2xl">

                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 text-2xl text-white/60 hover:text-white transition"
                >
                    ✕
                </button>

                <div className="px-12 py-10">

                    <p className="text-center text-sm uppercase tracking-[0.45em] text-violet-300">

                        Défi en cours

                    </p>

                    <h2 className="mt-3 text-center text-5xl font-black text-white">

                        ⚔ {produit}

                    </h2>

                    <div className="mt-14 grid grid-cols-3 items-center">

                        <div className="flex flex-col items-center">

                            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-violet-400 bg-slate-800">

                                {conseillerAvatar ? (

                                    <img
                                        src={conseillerAvatar}
                                        alt={conseiller}
                                        className="h-full w-full object-cover"
                                    />

                                ) : (

                                    <span className="text-7xl">😎</span>

                                )}

                            </div>

                            <p className="mt-5 text-3xl font-bold text-white">

                                {conseiller}

                            </p>

                        </div>

                        <div className="text-center">

                            <p className="text-8xl font-black text-white">

                                {scoreConseiller}

                            </p>

                            <p className="my-4 text-3xl font-black tracking-widest text-violet-300">

                                VS

                            </p>

                            <p className="text-8xl font-black text-white">

                                {scoreAdversaire}

                            </p>

                        </div>

                        <div className="flex flex-col items-center">

                            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-pink-400 bg-slate-800">

                                {adversaireAvatar ? (

                                    <img
                                        src={adversaireAvatar}
                                        alt={adversaire}
                                        className="h-full w-full object-cover"
                                    />

                                ) : (

                                    <span className="text-7xl">👩</span>

                                )}

                            </div>

                            <p className="mt-5 text-3xl font-bold text-white">

                                {adversaire}

                            </p>

                        </div>

                    </div>

                    <div className="mt-12">

                        <div className="mb-3 flex justify-between text-lg text-white/80">

                            <span>Temps restant</span>

                            <span>{tempsRestant}</span>

                        </div>

                        <div className="h-4 overflow-hidden rounded-full bg-white/10">

                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                                style={{
                                    width: "55%",
                                }}
                            />

                        </div>

                    </div>

                    <div className="mt-10 rounded-3xl bg-white/10 p-6 backdrop-blur-md">

                        <p className="text-sm uppercase tracking-[0.3em] text-violet-300">

                            KPILOTE

                        </p>

                        <p className="mt-3 text-xl leading-8 text-white">

                            {message}

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}