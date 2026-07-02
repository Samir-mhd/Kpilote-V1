"use client";

import { User } from "lucide-react";

type Props = {

    prenom: string;

    photo?: string;

    badge?: string;

    taille?: "sm" | "md" | "lg";

    statut?:

        | "normal"

        | "hot"

        | "warning";

};

export default function Avatar({

    prenom,

    photo,

    badge,

    taille = "md",

    statut = "normal",

}: Props) {

    const size =

        taille === "lg"

            ? "h-28 w-28"

            : taille === "sm"

            ? "h-14 w-14"

            : "h-20 w-20";

    const icon =

        taille === "lg"

            ? 54

            : taille === "sm"

            ? 24

            : 36;

    const ring =

        statut === "hot"

            ? "ring-4 ring-emerald-400"

            : statut === "warning"

            ? "ring-4 ring-orange-400"

            : "ring-2 ring-slate-300";

    return (

        <div className="flex flex-col items-center">

            <div

                className={`

                ${size}

                ${ring}

                relative

                overflow-hidden

                rounded-full

                bg-gradient-to-br

                from-violet-600

                via-indigo-600

                to-slate-800

                shadow-[0_10px_30px_rgba(0,0,0,.25)]

                transition-all

                duration-300

                hover:scale-105

            `}

            >

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.25),transparent_60%)]"/>

                {photo ? (

                    <img

                        src={photo}

                        alt={prenom}

                        className="h-full w-full object-cover"

                    />

                ) : (

                    <div className="flex h-full items-center justify-center">

                        <User

                            size={icon}

                            color="white"

                            strokeWidth={2.2}

                        />

                    </div>

                )}

            </div>

            <p className="mt-3 font-black text-slate-800">

                {prenom}

            </p>

            {badge && (

                <span className="mt-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow">

                    {badge}

                </span>

            )}

        </div>

    );

}