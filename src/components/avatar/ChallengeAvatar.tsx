"use client";

import { Avatar } from "@/components/avatar";

type Props = {

    prenom: string;

    score: number;

    gagnant?: boolean;

    animation?: boolean;

};

export default function ChallengeAvatar({

    prenom,

    score,

    gagnant = false,

    animation = false,

}: Props) {

    return (

        <div
            className={`flex flex-col items-center transition-all duration-500 ${
                animation
                    ? "scale-110"
                    : "scale-100"
            }`}
        >

            <div
                className={`rounded-full p-2 transition-all duration-500 ${
                    gagnant
                        ? "bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.8)]"
                        : "bg-white/10"
                }`}
            >

                <Avatar

                    prenom={prenom}

                    taille="lg"

                    statut={
                        gagnant
                            ? "hot"
                            : "normal"
                    }

                />

            </div>

            <p className="mt-4 text-2xl font-black text-white">

                {prenom}

            </p>

            <div
                className={`mt-4 rounded-2xl px-6 py-2 text-5xl font-black transition-all duration-300 ${
                    animation
                        ? "scale-125 bg-violet-500"
                        : "bg-white/10"
                }`}
            >

                {score}

            </div>

        </div>

    );

}