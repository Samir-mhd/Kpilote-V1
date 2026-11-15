"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { couleurTaux } from "@/utils/periodes";
import { chargerCockpit, Cockpit, RO, EtatConseiller } from "@/services/cockpitManagerService";
import { getPhotosByIds } from "@/services/photoService";
import { chargerDefisActifsManager, DefiActifManager } from "@/services/challengeRepository";
import { cloturerChallengesExpires } from "@/services/defisService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import TeamFeed from "@/components/dashboard/TeamFeed";
import LancerDefiCard from "@/components/manager/LancerDefiCard";
import CarteDefiActif from "@/components/manager/CarteDefiActif";

/**
 * Dashboard manager repensé (variante &dashboard=v2) : un cockpit du jour.
 * 1. Actes équipe jour / semaine / mois avec les VRAIS objectifs des conseillers (planning,
 *    semaine figée) + projection de fin de mois.
 * 2. L'équipe aujourd'hui : qui est en boutique, ses actes, sa dernière vente, son défi du jour.
 * 3. Avancée par produit en un seul tableau (jour / semaine / mois côte à côte).
 * 4. Fil d'actu et défis 1v1 en bas.
 */

const OUVERTURE_H = 10;
const FERMETURE_H = 20;
const INACTIF_MIN = 90;

const STATUT_LABEL: Record<string, string> = {
    present: "En boutique", off: "Repos", formation: "Formation", arret_maladie: "Arrêt", conges_payes: "Congés", ferie: "Férié",
};

function pct(r: RO) { return r.objectif > 0 ? Math.round((r.realise / r.objectif) * 100) : null; }

function Barre({ r, fine = false }: { r: RO; fine?: boolean }) {
    const p = pct(r);
    const c = couleurTaux(r.realise, r.objectif);
    return (
        <div className={`${fine ? "h-1.5" : "h-2.5"} overflow-hidden rounded-full bg-slate-100`}>
            <div className={`h-full rounded-full transition-[width] duration-700 ${p === null ? "bg-slate-300" : c.bar}`} style={{ width: `${p === null ? 0 : Math.min(p, 100)}%` }} />
        </div>
    );
}

function depuis(iso: string): number { return Math.round((Date.now() - new Date(iso).getTime()) / 60000); }
function fmtDepuis(min: number): string {
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return `il y a ${h} h${m > 0 ? String(m).padStart(2, "0") : ""}`;
}

export default function DashboardV2() {
    const [cockpit, setCockpit] = useState<Cockpit | null>(null);
    const [photos, setPhotos] = useState<Record<string, string | null>>({});
    const [maj, setMaj] = useState("");
    const [erreur, setErreur] = useState(false);
    const [defisActifs, setDefisActifs] = useState<DefiActifManager[]>([]);
    const [defisOuverts, setDefisOuverts] = useState(false);
    const [, setTic] = useState(0);

    async function charger() {
        try {
            const c = await chargerCockpit();
            setCockpit(c);
            setErreur(false);
            setMaj(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
            if (Object.keys(photos).length === 0) getPhotosByIds(c.conseillers.map((x) => x.id)).then(setPhotos).catch(() => {});
        } catch { setErreur(true); }
    }
    async function chargerDefis() {
        await cloturerChallengesExpires().catch(() => {});
        setDefisActifs(await chargerDefisActifsManager().catch(() => []));
    }

    useEffect(() => {
        charger();
        chargerDefis();
        const ch = supabase.channel("cockpit-manager")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, () => charger())
            .on("postgres_changes", { event: "*", schema: "public", table: "defis_jour" }, () => charger())
            .subscribe();
        const poll = setInterval(() => { charger(); setTic((t) => t + 1); }, 60_000);
        const pollDefis = setInterval(chargerDefis, 60_000);
        return () => { supabase.removeChannel(ch); clearInterval(poll); clearInterval(pollDefis); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!cockpit) {
        return erreur ? (
            <p className="rounded-2xl bg-red-50 p-6 text-center font-bold text-red-600">Impossible de charger le cockpit. Vérifie la connexion puis recharge la page.</p>
        ) : (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const { actes, produits, conseillers } = cockpit;
    const heure = new Date().getHours();
    const ouvert = heure >= OUVERTURE_H && heure < FERMETURE_H;
    const enBoutique = conseillers.filter((c) => c.planifie);
    const dateDuJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const projPct = actes.projectionMois !== null && actes.mois.objectif > 0 ? Math.round((actes.projectionMois / actes.mois.objectif) * 100) : null;

    const kpis: { titre: string; r: RO; sous?: React.ReactNode }[] = [
        { titre: "Aujourd'hui", r: actes.jour, sous: enBoutique.length === 0 ? "Personne n'est planifié aujourd'hui" : `${enBoutique.length} en boutique` },
        { titre: "Semaine", r: actes.semaine, sous: "objectif boutique décliné selon le planning" },
        {
            titre: "Mois", r: actes.mois,
            sous: actes.projectionMois !== null
                ? <>Projection fin de mois : <span className={`font-black ${projPct !== null && projPct >= 100 ? "text-emerald-600" : "text-amber-600"}`}>{actes.projectionMois}</span>{projPct !== null && <> ({projPct} %)</>}</>
                : "Projection disponible dès demain",
        },
    ];

    function chipDefi(c: EtatConseiller) {
        if (!c.defi) return c.planifie ? <span className="text-xs font-semibold text-slate-300">Pas encore de défi</span> : null;
        const { statut, libelle } = c.defi;
        const styles = {
            reussi: ["🏆", "bg-emerald-50 text-emerald-700", "Réussi"],
            accepte: ["🎯", "bg-violet-50 text-violet-700", "En cours"],
            refuse: ["⭐", "bg-slate-100 text-slate-600", "Priorité"],
            propose: ["⏳", "bg-amber-50 text-amber-700", "Sans réponse"],
        }[statut];
        return (
            <span className={`inline-flex max-w-full items-center gap-1 truncate rounded-lg px-2 py-1 text-xs font-bold ${styles[1]}`} title={`${styles[2]} : ${libelle}`}>
                {styles[0]} <span className="truncate">{libelle}</span>
            </span>
        );
    }

    return (
        <main className="space-y-6">
            {/* ── En-tête ───────────────────────────────────────────── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-500">KPILOTE Manager</p>
                    <h1 className="mt-2 text-4xl font-black text-slate-900">Cockpit du jour</h1>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-400">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        <span className="capitalize">{dateDuJour}</span> · mis à jour à {maj}
                    </p>
                </div>
            </div>

            {/* ── Actes équipe ──────────────────────────────────────── */}
            <section className="grid gap-4 md:grid-cols-3">
                {kpis.map((k) => {
                    const p = pct(k.r);
                    const c = couleurTaux(k.r.realise, k.r.objectif);
                    return (
                        <div key={k.titre} className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Actes · {k.titre}</p>
                                {p !== null && <p className={`text-lg font-black ${c.text}`}>{p} %</p>}
                            </div>
                            <p className="mt-2 text-4xl font-black tabular-nums text-slate-900">
                                {k.r.realise}<span className="text-xl font-bold text-slate-300"> / {k.r.objectif}</span>
                            </p>
                            <div className="mt-3"><Barre r={k.r} /></div>
                            {k.sous && <p className="mt-2 text-xs font-semibold text-slate-400">{k.sous}</p>}
                        </div>
                    );
                })}
            </section>

            {/* ── L'équipe aujourd'hui ──────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">👥 L&apos;équipe aujourd&apos;hui</h2>
                <div className="space-y-2">
                    {conseillers.map((c) => {
                        const prenom = c.nom.split(" ")[0];
                        const min = c.derniereVente ? depuis(c.derniereVente) : null;
                        const alerte = c.planifie && ouvert && (min === null ? heure >= 12 : min >= INACTIF_MIN);
                        const statut = c.planifie ? "En boutique" : c.statut ? STATUT_LABEL[c.statut] : "Repos";
                        return (
                            <div key={c.id} className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-2xl p-3 sm:grid-cols-[auto_9rem_minmax(8rem,1fr)_10rem_minmax(10rem,14rem)] ${c.planifie ? "bg-slate-50" : "bg-slate-50/50 opacity-60"}`}>
                                <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={40} />
                                <div className="min-w-0">
                                    <p className="truncate font-black text-slate-900">{prenom}</p>
                                    <p className={`text-xs font-bold ${c.planifie ? "text-emerald-600" : "text-slate-400"}`}>{statut}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    {c.planifie || c.actesJour.realise > 0 ? (
                                        <>
                                            <p className="text-sm font-black tabular-nums text-slate-800">
                                                {c.actesJour.realise}<span className="font-semibold text-slate-400"> / {c.actesJour.objectif} actes</span>
                                            </p>
                                            <div className="mt-1"><Barre r={c.actesJour} fine /></div>
                                        </>
                                    ) : <p className="text-xs font-semibold text-slate-300">—</p>}
                                </div>
                                <p className={`text-xs font-bold ${alerte ? "text-red-600" : "text-slate-500"}`}>
                                    {c.derniereVente
                                        ? <>{alerte ? "⚠️ " : ""}Dernière vente {fmtDepuis(min!)}</>
                                        : c.planifie ? (alerte ? `⚠️ Aucune vente aujourd'hui` : "Pas encore de vente") : ""}
                                </p>
                                <div className="col-span-2 min-w-0 sm:col-span-1">{chipDefi(c)}</div>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">⚠️ = en boutique, sans vente depuis {INACTIF_MIN} min (ou aucune vente après midi), entre {OUVERTURE_H}h et {FERMETURE_H}h.</p>
            </section>

            {/* ── Avancée par produit ───────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">📦 Avancée par produit</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                                <th className="px-3 pb-1">Produit</th>
                                <th className="px-3 pb-1">Aujourd&apos;hui</th>
                                <th className="px-3 pb-1">Semaine</th>
                                <th className="px-3 pb-1">Mois</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produits.map((p) => (
                                <tr key={p.code} className="bg-slate-50">
                                    <td className="rounded-l-xl px-3 py-2.5 font-black text-slate-800">
                                        <span aria-hidden="true">{p.emoji}</span> {p.label}
                                        {!p.actes && <span className="ml-1.5 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-500">{p.code === "canal_plus" ? "hors actes" : "Quali"}</span>}
                                    </td>
                                    {(["jour", "semaine", "mois"] as const).map((per, i) => (
                                        <td key={per} className={`w-[24%] px-3 py-2.5 ${i === 2 ? "rounded-r-xl" : ""}`}>
                                            <p className="tabular-nums">
                                                <span className="font-black text-slate-800">{p[per].realise}</span>
                                                <span className="text-slate-400"> / {p[per].objectif}</span>
                                                {pct(p[per]) !== null && <span className={`ml-1.5 text-xs font-black ${couleurTaux(p[per].realise, p[per].objectif).text}`}>{pct(p[per])} %</span>}
                                            </p>
                                            <div className="mt-1"><Barre r={p[per]} fine /></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Mois = objectifs boutique (matrice). Semaine et jour = ce qu&apos;il reste à faire, réparti selon les jours planifiés de l&apos;équipe. Les objectifs individuels (ligne de chaque conseiller) restent ceux de leur Accueil.</p>
            </section>

            {/* ── Fil + défis ───────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
                <section>
                    <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">⚡ Fil d&apos;actu</h2>
                    <TeamFeed conseillerId="" condense />
                </section>
                <section className="rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <button onClick={() => setDefisOuverts(!defisOuverts)} aria-expanded={defisOuverts} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6">
                        <span>
                            <span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">⚔️ Défis 1v1</span>
                            <span className="mt-1 block text-sm text-slate-500">{defisActifs.length > 0 ? `${defisActifs.length} en cours` : "Aucun en cours — lancer un défi"}</span>
                        </span>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${defisOuverts ? "rotate-180" : ""}`} />
                    </button>
                    {defisOuverts && (
                        <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                            {conseillers.length >= 2 && <LancerDefiCard conseillers={conseillers.map((c) => ({ id: c.id, prenom: c.nom.split(" ")[0] }))} />}
                            {defisActifs.map((d) => <CarteDefiActif key={d.id} defi={d} onCloture={chargerDefis} />)}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
