"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { useGenres, accord } from "@/utils/genre";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

/** Proposition B — « L'équipe d'abord » : les conseillers se connectent en un clic depuis
 *  l'accueil (plus besoin de passer par /choix) ; l'accès manager est un bouton discret. */

type Conseiller = { id: string; nom: string; avatar?: string | null; profil_actif?: boolean | null };

export default function AccueilB() {
    const [equipe, setEquipe] = useState<Conseiller[] | null>(null);
    const [planifies, setPlanifies] = useState<Record<string, number>>({});
    const genres = useGenres();

    useEffect(() => {
        getConseillers().then((data) => {
            const actifs = (data as Conseiller[]).filter((c) => c.profil_actif !== false);
            setEquipe(actifs);
            const auj = new Date();
            getJoursTravailPlageTous(actifs.map((c) => c.id), auj, auj).then(setPlanifies).catch(() => {});
        }).catch(() => setEquipe([]));
    }, []);

    const h = new Date().getHours();
    const salut = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    const dateBrute = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const date = dateBrute.charAt(0).toUpperCase() + dateBrute.slice(1);

    return (
        <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white px-5 py-8 sm:px-10">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-violet-500/30">K</span>
                        <span className="text-lg font-black tracking-[0.2em] text-slate-900"><span className="text-violet-600">KPI</span>LOTE</span>
                    </div>
                    <Link href="/manager/dashboard" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5">
                        🔐 Espace manager
                    </Link>
                </header>

                <div className="mt-14 text-center">
                    <p className="text-sm font-bold text-violet-600">{date}</p>
                    <h1 className="mt-2 text-5xl font-black text-slate-900 sm:text-6xl">{salut} 👋</h1>
                    <p className="mt-3 text-lg text-slate-500">Touche ta photo pour commencer.</p>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {equipe === null
                        ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-[28px] bg-slate-100" />)
                        : equipe.map((c) => {
                            const photo = c.avatar && (c.avatar.startsWith("http") || c.avatar.startsWith("data:")) ? c.avatar : null;
                            const present = (planifies[c.id] ?? 0) > 0;
                            return (
                                <Link key={c.id} href={`/dashboard?nom=${encodeURIComponent(c.nom)}&id=${c.id}`} className="group flex flex-col items-center rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(91,33,182,.08)] ring-1 ring-violet-100 transition-all hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(91,33,182,.18)]">
                                    <div className="relative">
                                        <div className="overflow-hidden rounded-full ring-4 ring-violet-100 transition-all group-hover:ring-violet-300">
                                            <PhotoAvatar nom={c.nom} photoUrl={photo} size={84} />
                                        </div>
                                        <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-[3px] ring-white ${present ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
                                    </div>
                                    <p className="mt-4 text-xl font-black text-slate-900">{c.nom.split(" ")[0]}</p>
                                    <p className={`text-xs font-bold ${present ? "text-emerald-600" : "text-slate-400"}`}>
                                        {present ? "En boutique" : `Pas ${accord(genres[c.id], "planifié", "planifiée")}`}
                                    </p>
                                </Link>
                            );
                        })}
                </div>

                <p className="mt-14 text-center text-xs font-bold uppercase tracking-[0.4em] text-slate-300">Piloter · Optimiser · Performer</p>
            </div>
        </main>
    );
}
