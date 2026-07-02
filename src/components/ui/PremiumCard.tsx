"use client";

import { ReactNode } from "react";

type Props = {

    title?: string;

    subtitle?: string;

    icon?: ReactNode;

    children: ReactNode;

    className?: string;

};

export default function PremiumCard({

    title,

    subtitle,

    icon,

    children,

    className = "",

}: Props) {

    return (

        <section

            className={`
            relative
            overflow-hidden
            rounded-[32px]
            border
            border-white/20
            bg-white/80
            backdrop-blur-xl
            shadow-[0_15px_50px_rgba(15,23,42,.15)]
            transition-all
            duration-300
            hover:-translate-y-1
            hover:shadow-[0_25px_70px_rgba(15,23,42,.20)]
            ${className}
        `}

        >

            <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl"/>

            <div className="absolute -left-20 bottom-0 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl"/>

            <div className="relative p-7">

                {(title || icon) && (

                    <div className="mb-6 flex items-center justify-between">

                        <div>

                            {subtitle && (

                                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">

                                    {subtitle}

                                </p>

                            )}

                            {title && (

                                <h2 className="mt-2 text-2xl font-black text-slate-800">

                                    {title}

                                </h2>

                            )}

                        </div>

                        {icon && (

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-2xl text-white shadow-xl">

                                {icon}

                            </div>

                        )}

                    </div>

                )}

                {children}

            </div>

        </section>

    );

}