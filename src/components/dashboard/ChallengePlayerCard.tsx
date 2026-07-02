"use client";

type Props = {

    prenom: string;

    avatar?: string;

    score: number;

    leader?: boolean;

    pulse?: boolean;

};

export default function ChallengePlayerCard({

    prenom,

    avatar,

    score,

    leader = false,

    pulse = false,

}: Props) {

    return (

        <div
            className={`relative flex w-72 flex-col items-center rounded-[34px] border transition-all duration-500 ${
                leader
                    ? "border-violet-400 bg-gradient-to-b from-violet-700 to-slate-900 shadow-[0_0_80px_rgba(124,58,237,.55)]"
                    : "border-white/10 bg-slate-900"
            }`}
        >

            {leader && (

                <div className="absolute -top-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-2 text-sm font-black text-slate-900">

                    EN TÊTE

                </div>

            )}

            <div className="pt-8">

                <div className="relative">

                    <div className="absolute inset-0 rounded-full bg-violet-500 blur-2xl opacity-40"/>

                    <div className="relative h-40 w-40 overflow-hidden rounded-full border-[6px] border-white/20 bg-slate-800">

                        {avatar ? (

                            <img

                                src={avatar}

                                alt={prenom}

                                className="h-full w-full object-cover"

                            />

                        ) : (

                            <div className="flex h-full items-center justify-center text-7xl">

                                😎

                            </div>

                        )}

                    </div>

                </div>

            </div>

            <h2 className="mt-6 text-3xl font-black text-white">

                {prenom}

            </h2>

            <div
                className={`mt-8 mb-10 rounded-3xl px-10 py-6 transition-all duration-300 ${
                    pulse
                        ? "scale-125 bg-violet-600"
                        : "bg-white/10"
                }`}
            >

                <p className="text-6xl font-black text-white">

                    {score}

                </p>

            </div>

        </div>

    );

}