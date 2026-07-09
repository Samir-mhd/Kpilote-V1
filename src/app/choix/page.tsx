"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";
import { resetCheckDate } from "@/services/resetService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

type Conseiller = { id: string; nom: string; avatar?: string | null };

export default function ChoixConseiller() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [loading, setLoading]         = useState(true);
    const [resetingId, setResetingId]   = useState<string | null>(null);
    const [resetDoneId, setResetDoneId] = useState<string | null>(null);

    useEffect(() => {
        getConseillers().then((data) => {
            setConseillers(data as Conseiller[]);
            setLoading(false);
        });
    }, []);

    async function handleReset(e: React.MouseEvent, id: string) {
        e.preventDefault();
        e.stopPropagation();
        setResetingId(id);
        try {
            await resetCheckDate(id);
            setResetDoneId(id);
            setTimeout(() => setResetDoneId(null), 2500);
        } finally {
            setResetingId(null);
        }
    }

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
                        const photoUrl  = conseiller.avatar?.startsWith("http") ? conseiller.avatar : null;
                        const isReset   = resetingId  === conseiller.id;
                        const isDone    = resetDoneId  === conseiller.id;

                        return (
                            <div key={conseiller.id} className="relative group">
                                <Link
                                    href={`/dashboard?nom=${encodeURIComponent(conseiller.nom)}&id=${conseiller.id}`}
                                    className="block rounded-[32px] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,.08)] transition-all hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(15,23,42,.18)]"
                                >
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
                                </Link>

                                {/* Bouton reset Cerebro Check */}
                                <button
                                    onClick={(e) => handleReset(e, conseiller.id)}
                                    disabled={isReset}
                                    title="Réinitialiser le Cerebro Check"
                                    className={`absolute bottom-[72px] right-5 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                        isDone
                                            ? "bg-emerald-100 text-emerald-600"
                                            : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-violet-100 hover:text-violet-600"
                                    } disabled:opacity-50`}
                                >
                                    {isReset ? (
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                                    ) : isDone ? (
                                        <>✓ Check réinitialisé</>
                                    ) : (
                                        <>🧠 Reset check</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

            </div>
        </main>
    );
}
