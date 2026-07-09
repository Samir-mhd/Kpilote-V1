"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

type Conseiller = { id: string; nom: string; avatar?: string | null };

export default function ChoixConseiller() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getConseillers().then((data) => {
            setConseillers(data as Conseiller[]);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-10">
            <div className="mx-auto max-w-5xl">

                <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-500">KPILOTE</p>
                <h1 className="mt-3 text-5xl font-black text-slate-900">Bonjour 👋</h1>
                <p className="mt-3 text-xl text-slate-400">Qui se connecte aujourd'hui ?</p>

                <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {conseillers.map((conseiller) => {
                        const av = conseiller.avatar;
                        const photoUrl = av && (av.startsWith("http") || av.startsWith("data:")) ? av : null;
                        return (
                            <Link
                                key={conseiller.id}
                                href={`/dashboard?nom=${encodeURIComponent(conseiller.nom)}&id=${conseiller.id}`}
                                className="block"
                            >
                                <div className="rounded-[32px] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,.08)] transition-all hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(15,23,42,.18)]">

                                    <div className="flex justify-center">
                                        <div className="overflow-hidden rounded-full shadow-lg">
                                            <PhotoAvatar nom={conseiller.nom} photoUrl={photoUrl} size={96} />
                                        </div>
                                    </div>

                                    <h2 className="mt-6 text-center text-2xl font-black text-slate-900">
                                        {conseiller.nom}
                                    </h2>

                                    <div className="mt-4 rounded-2xl bg-violet-50 py-3 text-center text-sm font-black text-violet-600">
                                        Se connecter →
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </main>
    );
}
