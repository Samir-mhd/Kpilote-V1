"use client";

type Event = {

    id: string;

    heure: string;

    texte: string;

    type: "sale" | "coach" | "lead" | "finish";

};

type Props = {

    events: Event[];

};

const icons = {

    sale: "📦",

    coach: "🤖",

    lead: "🔥",

    finish: "🏆",

};

export default function ChallengeTimeline({

    events,

}: Props) {

    return (

        <div className="rounded-[32px] bg-slate-900 p-6 text-white shadow-2xl">

            <h3 className="text-2xl font-black">

                Timeline du défi

            </h3>

            <div className="mt-8 space-y-6">

                {events.map(event => (

                    <div

                        key={event.id}

                        className="flex gap-5"

                    >

                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-2xl">

                            {icons[event.type]}

                        </div>

                        <div className="flex-1">

                            <p className="text-sm text-slate-400">

                                {event.heure}

                            </p>

                            <p className="mt-1 text-lg font-semibold">

                                {event.texte}

                            </p>

                        </div>

                    </div>

                ))}

            </div>

        </div>

    );

}