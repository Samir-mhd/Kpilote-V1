"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getConseillers } from "@/services/conseillers";
import { getJoursTravailPlageTous } from "@/services/planningService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

type Conseiller = { id: string; nom: string; avatar?: string | null; profil_actif?: boolean | null };

function salutation(): string {
    const h = new Date().getHours();
    return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export default function ChoixConseiller() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [planifies, setPlanifies] = useState<Record<string, number> | null>(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState(false);

    useEffect(() => {
        getConseillers()
            .then((data) => {
                // Profils désactivés : invisibles ici comme partout ailleurs.
                const actifs = (data as Conseiller[]).filter((c) => c.profil_actif !== false);
                setConseillers(actifs);
                const aujourdhui = new Date();
                getJoursTravailPlageTous(actifs.map((c) => c.id), aujourdhui, aujourdhui).then(setPlanifies).catch(() => {});
            })
            .catch(() => setErreur(true))
            .finally(() => setLoading(false));
    }, []);

    const dateDuJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const nbEnBoutique = planifies ? conseillers.filter((c) => (planifies[c.id] ?? 0) > 0).length : null;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-10 sm:py-10">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                    <ArrowLeft size={16} /> Retour
                </Link>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-500">KPILOTE</p>
                        <h1 className="mt-2 text-4xl font-black text-slate-900 sm:text-5xl">{salutation()} 👋</h1>
                        <p className="mt-2 text-lg text-slate-400 sm:text-xl">Qui se connecte aujourd&apos;hui ?</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-slate-100">
                        <p className="text-sm font-black capitalize text-slate-800">{dateDuJour}</p>
                        {nbEnBoutique !== null && (
                            <p className="text-xs font-semibold text-slate-400">{nbEnBoutique} conseiller{nbEnBoutique > 1 ? "s" : ""} en boutique</p>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    </div>
                ) : erreur ? (
                    <p className="mt-12 rounded-2xl bg-red-50 p-6 text-center font-bold text-red-600">Impossible de charger les conseillers. Vérifie ta connexion et recharge la page.</p>
                ) : (
                    <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-3">
                        {conseillers.map((conseiller) => {
                            const av = conseiller.avatar;
                            const photoUrl = av && (av.startsWith("http") || av.startsWith("data:")) ? av : null;
                            const enBoutique = planifies ? (planifies[conseiller.id] ?? 0) > 0 : null;
                            return (
                                <Link
                                    key={conseiller.id}
                                    href={`/dashboard?nom=${encodeURIComponent(conseiller.nom)}&id=${conseiller.id}`}
                                    className="group block rounded-[28px] focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                                >
                                    <div className={`flex h-full flex-col items-center rounded-[28px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.08)] transition-all group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_60px_rgba(15,23,42,.16)] sm:p-7 ${enBoutique === false ? "opacity-70" : ""}`}>
                                        <div className="relative">
                                            <div className="overflow-hidden rounded-full shadow-lg">
                                                <PhotoAvatar nom={conseiller.nom} photoUrl={photoUrl} size={88} />
                                            </div>
                                            {enBoutique !== null && (
                                                <span
                                                    className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-[3px] ring-white ${enBoutique ? "bg-emerald-500" : "bg-slate-300"}`}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>

                                        <h2 className="mt-4 text-center text-xl font-black text-slate-900 sm:text-2xl">{conseiller.nom}</h2>
                                        {enBoutique !== null && (
                                            <p className={`mt-1 text-xs font-bold ${enBoutique ? "text-emerald-600" : "text-slate-400"}`}>
                                                {enBoutique ? "En boutique aujourd'hui" : "Pas planifié aujourd'hui"}
                                            </p>
                                        )}

                                        <div className="mt-4 w-full rounded-2xl bg-violet-50 py-2.5 text-center text-sm font-black text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                            Se connecter →
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
