"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConseillers } from "@/services/conseillers";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { useGenres, accord } from "@/utils/genre";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

/** Proposition D — mélange B + C : ambiance sombre « vitrine » et titre « Chaque vente compte. »,
 *  priorité aux conseillers (connexion en un clic sur sa photo), espace manager en haut à droite. */

type Conseiller = { id: string; nom: string; avatar?: string | null; profil_actif?: boolean | null; last_check_date?: string | null; journee_validee_date?: string | null };

function jourLocal(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AccueilD() {
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

    const brute = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const date = brute.charAt(0).toUpperCase() + brute.slice(1);
    // "En boutique" seulement une fois le Cerebro Check du jour validé ; avant : "Planifié aujourd'hui".
    const aujourdhui = jourLocal();
    const estPlanifie = (c: Conseiller) => (planifies[c.id] ?? 0) > 0;
    // Journée validée ("Valider ma journée") → "Déconnecté(e)", pastille rouge.
    const estParti = (c: Conseiller) => c.journee_validee_date === aujourdhui;
    const estArrive = (c: Conseiller) => estPlanifie(c) && c.last_check_date === aujourdhui && !estParti(c);
    const nbBoutique = equipe ? equipe.filter(estArrive).length : 0;

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#07060d] px-5 py-7 sm:px-10">
            <div className="pointer-events-none absolute left-1/2 top-[-25%] h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/40 via-fuchsia-600/25 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />

            <div className="relative mx-auto max-w-5xl">
                {/* En-tête : logo + accès manager discret */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-black text-white shadow-[0_0_30px_rgba(168,85,247,.5)]">K</span>
                        <span className="text-lg font-black tracking-[0.25em] text-white"><span className="text-violet-300">KPI</span>LOTE</span>
                    </div>
                    <Link href="/manager/dashboard" className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white/80 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/[0.12] hover:text-white">
                        📊 Espace manager
                    </Link>
                </header>

                {/* Titre */}
                <div className="mt-14 text-center">
                    <p className="text-sm font-bold text-violet-300">{date}{equipe && <span className="text-white/40"> · {nbBoutique} en boutique</span>}</p>
                    <h1 className="mt-4 text-5xl font-black leading-[1.05] text-white sm:text-7xl">
                        Chaque vente <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">compte.</span>
                    </h1>
                </div>

                {/* L'équipe */}
                <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {equipe === null
                        ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-[28px] bg-white/[0.05]" />)
                        : equipe.map((c) => {
                            const photo = c.avatar && (c.avatar.startsWith("http") || c.avatar.startsWith("data:")) ? c.avatar : null;
                            const planifie = estPlanifie(c);
                            const present = estArrive(c);
                            const parti = estParti(c);
                            return (
                                <Link
                                    key={c.id}
                                    href={`/dashboard?nom=${encodeURIComponent(c.nom)}&id=${c.id}`}
                                    className={`group relative flex flex-col items-center overflow-hidden rounded-[28px] bg-white/[0.05] p-6 ring-1 ring-white/10 backdrop-blur-xl transition-all hover:-translate-y-1.5 hover:bg-white/[0.09] hover:ring-white/25 ${planifie ? "" : "scale-[0.97] opacity-45 blur-[0.6px] hover:scale-100 hover:opacity-100 hover:blur-0"}`}
                                >
                                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 opacity-0 blur-3xl transition-opacity group-hover:opacity-40" />
                                    <div className="relative">
                                        <div className={`overflow-hidden rounded-full ring-4 transition-all ${parti ? "ring-rose-500/35 group-hover:ring-rose-500/60" : present ? "ring-emerald-400/40 group-hover:ring-emerald-400/70" : planifie ? "ring-violet-400/30 group-hover:ring-violet-400/60" : "ring-white/10 group-hover:ring-white/25"}`}>
                                            <PhotoAvatar nom={c.nom} photoUrl={photo} size={84} />
                                        </div>
                                        <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-[3px] ring-[#07060d] ${parti ? "bg-rose-500" : present ? "bg-emerald-400" : planifie ? "bg-violet-400" : "bg-slate-500"}`} aria-hidden="true" />
                                    </div>
                                    <p className="relative mt-4 text-xl font-black text-white">{c.nom.split(" ")[0]}</p>
                                    <p className={`relative text-xs font-bold ${parti ? "text-rose-300" : present ? "text-emerald-300" : planifie ? "text-violet-300" : "text-white/40"}`}>
                                        {parti ? accord(genres[c.id], "Déconnecté", "Déconnectée")
                                            : present ? "En boutique"
                                            : planifie ? `${accord(genres[c.id], "Planifié", "Planifiée")} aujourd'hui`
                                            : `Pas ${accord(genres[c.id], "planifié", "planifiée")}`}
                                    </p>
                                </Link>
                            );
                        })}
                </div>

                <p className="mt-14 text-center text-xs font-bold uppercase tracking-[0.4em] text-white/25">Piloter · Optimiser · Performer</p>
            </div>
        </main>
    );
}
