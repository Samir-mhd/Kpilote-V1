"use client";

type Props = {

    score1: number;

    score2: number;

};

export default function ChallengeScore({

    score1,

    score2,

}: Props) {

    return (

        <div className="flex items-center justify-center gap-8">

            <div className="rounded-2xl bg-white px-8 py-4 shadow">

                <p className="text-center text-5xl font-black">

                    {score1}

                </p>

            </div>

            <div className="animate-pulse text-3xl font-black text-red-500">

                VS

            </div>

            <div className="rounded-2xl bg-white px-8 py-4 shadow">

                <p className="text-center text-5xl font-black">

                    {score2}

                </p>

            </div>

        </div>

    );

}