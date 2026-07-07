"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";
import { getPhotosByIds } from "@/services/photoService";

type Conseiller = { id: string; nom: string; avatar?: string | null };

export default function EntretienListPage() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [photos, setPhotos]           = useState<Record<string, string | null>>({});
    const [loading, setLoading]         = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await getConseillers();
                setConseillers(data);
                const ids = data.map((c: any) => c.id);
                if (ids.length) setPhotos(await getPhotosByIds(ids));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const moisLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">KPILOTE MANAGER</p>

            <h1 className="mt-4 text-5xl font-black text-slate-900">Entretiens</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-500">
                Génère le bilan mensuel de chaque conseiller pour préparer les entretiens individuels de <span className="font-semibold text-slate-700">{moisLabel}</span>.
            </p>

            {loading ? (
                <div className="mt-16 flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
            ) : (
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {conseillers.map((c) => {
                        const photo = photos[c.id];
                        const initiale = (c.nom ?? "?").charAt(0).toUpperCase();
                        return (
                            <Link
                                key={c.id}
                                href={`/manager/entretien/${c.id}`}
                                className="group flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                            >
                                {photo ? (
                                    <img src={photo} alt={c.nom} className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-violet-200" />
                                ) : (
                                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xl font-black text-violet-600 ring-2 ring-slate-100 group-hover:ring-violet-200">
                                        {initiale}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-lg font-black text-slate-900 truncate">{c.nom}</p>
                                    <p className="text-sm text-slate-400">Voir le bilan →</p>
                                </div>
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500 transition-all group-hover:bg-violet-500 group-hover:text-white">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                        <line x1="12" y1="18" x2="12" y2="12"/>
                                        <polyline points="9 15 12 18 15 15"/>
                                    </svg>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
