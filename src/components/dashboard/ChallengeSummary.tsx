"use client";

type ChallengeEvent = {

    id: string;

    icon: string;

    title: string;

    description: string;

    time: string;

};

type Props = {

    events: ChallengeEvent[];

    progression: number;

};

export default function ChallengeSummary({

    events,

    progression,

}: Props) {

    return (

        <section className="rounded-[36px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 shadow-2xl">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-sm uppercase tracking-[0.4em] text-violet-300">

                        Résumé du défi

                    </p>

                    <h2 className="mt-2 text-4xl font-black text-white">

                        Timeline

                    </h2>

                </div>

                <div className="text-right">

                    <p className="text-sm text-slate-400">

                        Progression

                    </p>

                    <p className="text-3xl font-black text-white">

                        {progression}%

                    </p>

                </div>

            </div>

            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">

                <div

                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500"

                    style={{

                        width: `${progression}%`,

                    }}

                />

            </div>

            <div className="mt-10 space-y-6">

                {events.map((event) => (

                    <div

                        key={event.id}

                        className="flex items-start gap-5 rounded-2xl bg-white/5 p-5 transition hover:bg-white/10"

                    >

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl">

                            {event.icon}

                        </div>

                        <div className="flex-1">

                            <div className="flex items-center justify-between">

                                <h3 className="text-xl font-bold text-white">

                                    {event.title}

                                </h3>

                                <span className="text-sm text-slate-400">

                                    {event.time}

                                </span>

                            </div>

                            <p className="mt-2 text-slate-300">

                                {event.description}

                            </p>

                        </div>

                    </div>

                ))}

            </div>

        </section>

    );

}