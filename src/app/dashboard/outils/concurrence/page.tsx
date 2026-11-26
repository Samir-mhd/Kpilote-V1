"use client";

/**
 * Outils → Concurrence : offres box et mobile du moment chez Orange, Sosh, SFR, RED by SFR,
 * Bouygues Telecom et B&You, relevées automatiquement sur leurs sites (src/services/concurrenceService.ts).
 * Box : une carte par opérateur (vue A). Mobile : forfaits rangés par volume de data.
 */
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { OperateurId, OffreBoxConc, OffreMobileConc } from "@/services/concurrenceService";
import type { EtatOperateur } from "@/services/concurrenceCache";

const OP: Record<OperateurId, { nom: string; couleur: string }> = {
    orange: { nom: "Orange", couleur: "#ff7900" },
    sosh: { nom: "Sosh", couleur: "#2b2f6b" },
    sfr: { nom: "SFR", couleur: "#e2001a" },
    red: { nom: "RED by SFR", couleur: "#b5001c" },
    bt: { nom: "Bouygues", couleur: "#0098d4" },
    byou: { nom: "B&You", couleur: "#00a88f" },
};
/** Au-delà, le relevé est affiché « à vérifier » (deux relectures par jour sont prévues). */
const RELEVE_ANCIEN_H = 30;

/** Repère Free par tranche de data (prix publics Free Mobile). */
const TRANCHES: { titre: string; min: number; max: number; free: string }[] = [
    { titre: "Petits forfaits", min: 0, max: 15, free: "Forfait 2 € : 2,00 €" },
    { titre: "20 à 50 Go", min: 15, max: 60, free: "Série Free : 12,99 € puis 19,99 €" },
    { titre: "80 à 150 Go", min: 60, max: 160, free: "Série Free : 12,99 € puis 19,99 €" },
    { titre: "170 Go et plus", min: 160, max: Infinity, free: "Forfait Free 5G+ : 19,99 €" },
];

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const dateCourte = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
};
const ageH = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;

function Puce({ op, taille = 10 }: { op: OperateurId; taille?: number }) {
    return <span className="inline-block shrink-0 rounded-full" style={{ width: taille, height: taille, background: OP[op].couleur }} />;
}

function LienOffre({ url, op }: { url: string; op: OperateurId }) {
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" title={`Voir l'offre sur le site ${OP[op].nom}`}
            className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-900 hover:underline">
            Voir l&apos;offre <ExternalLink size={12} />
        </a>
    );
}

function Releve({ etat }: { etat: EtatOperateur }) {
    if ("erreur" in etat) return <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">⚠ Lecture impossible pour le moment</span>;
    return ageH(etat.releveLe) > RELEVE_ANCIEN_H
        ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">⚠ Relevé du {dateCourte(etat.releveLe)} · à vérifier</span>
        : <span className="text-[11px] font-bold text-slate-400">✓ Relevé le {dateCourte(etat.releveLe)}</span>;
}

function CarteOffreBox({ o, op }: { o: OffreBoxConc; op: OperateurId }) {
    return (
        <div className="border-b border-slate-100 py-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black text-slate-900">{o.nom}</p>
                {o.fin && <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">jusqu&apos;au {o.fin}</span>}
            </div>
            <p className="mt-1.5 text-xl font-black tabular-nums leading-none text-slate-900">{eur(o.prix)}<span className="text-xs font-bold text-slate-400">/mois</span></p>
            <p className="mt-1 text-xs font-bold text-slate-500">
                {o.puis ? <>{o.moisPromo} mois, puis <span className="text-slate-900">{eur(o.puis)}</span></> : "prix fixe"}
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-500">
                {[o.engagement ? `Engagement ${o.engagement} mois` : "Sans engagement", o.debit, o.wifi].filter(Boolean).join(" · ")}
            </p>
            {(o.tv || o.miseEnService) && <p className="text-xs font-semibold text-slate-500">{[o.tv && `📺 ${o.tv}`, o.miseEnService].filter(Boolean).join(" · ")}</p>}
            <div className="mt-1.5"><LienOffre url={o.url} op={op} /></div>
        </div>
    );
}

function Contenu() {
    const sp = useSearchParams();
    const manager = usePathname().startsWith("/manager");
    const qs = sp.get("id") ? `?id=${encodeURIComponent(sp.get("id")!)}&nom=${encodeURIComponent(sp.get("nom") ?? "")}` : "";
    const [onglet, setOnglet] = useState<"box" | "mobile">("box");
    const [filtre, setFiltre] = useState<OperateurId | null>(null);
    const [etats, setEtats] = useState<EtatOperateur[] | null>(null);
    const [erreur, setErreur] = useState(false);

    useEffect(() => {
        fetch("/api/concurrence")
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((j) => setEtats(j.operateurs))
            .catch(() => setErreur(true));
    }, []);

    const visibles = useMemo(() => (etats ?? []).filter((e) => !filtre || e.op === filtre), [etats, filtre]);
    const mobiles = useMemo(() => visibles.flatMap((e) => ("erreur" in e ? [] : e.mobile.map((o) => ({ ...o, op: e.op })))), [visibles]);

    return (
        <div className="pb-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Link href={manager ? "/manager/outils" : `/dashboard/outils${qs}`} className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-500 hover:underline">Outils</Link>
                    <h1 className="text-3xl font-black text-slate-900">🔭 Concurrence</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {onglet === "box" ? "Les offres box du moment, opérateur par opérateur" : "Forfaits mobile sans engagement, rangés par volume de data"}
                    </p>
                </div>
                <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-[0_4px_16px_rgba(15,23,42,.06)]">
                    {([["box", "💻 Box"], ["mobile", "📶 Mobile"]] as const).map(([id, l]) => (
                        <button key={id} onClick={() => setOnglet(id)}
                            className={`rounded-xl px-5 py-2 text-sm font-black transition-all ${onglet === id ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}>{l}</button>
                    ))}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => setFiltre(null)} className={`rounded-full px-4 py-1.5 text-sm font-black ${!filtre ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>Tous</button>
                {(Object.keys(OP) as OperateurId[]).map((op) => (
                    <button key={op} onClick={() => setFiltre(filtre === op ? null : op)}
                        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${filtre === op ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                        <Puce op={op} /> {OP[op].nom}
                    </button>
                ))}
            </div>

            {erreur ? (
                <div className="mt-6 rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
                    <p className="font-black text-slate-900">Offres concurrentes indisponibles</p>
                    <p className="mt-1 text-sm text-slate-500">Réessaie dans quelques minutes.</p>
                </div>
            ) : !etats ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}
                </div>
            ) : onglet === "box" ? (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibles.map((e) => {
                        const offres = "erreur" in e ? [] : e.box;
                        if (!("erreur" in e) && offres.length === 0) return null; // pas d'offre box (ex. Bouygues mobile)
                        return (
                            <section key={e.op} className="carte-accueil flex flex-col overflow-hidden rounded-[24px] border-2 border-slate-900 bg-white">
                                <div className="flex items-center justify-between px-5 py-3.5 text-white" style={{ background: OP[e.op].couleur }}>
                                    <p className="text-lg font-black">{OP[e.op].nom}</p>
                                    <p className="text-xs font-bold opacity-85">{offres.length} offre{offres.length > 1 ? "s" : ""}</p>
                                </div>
                                <div className="flex-1 px-5 py-1">
                                    {offres.map((o) => <CarteOffreBox key={o.nom} o={o} op={e.op} />)}
                                    {"erreur" in e && <p className="py-6 text-center text-sm font-semibold text-slate-400">Le site de l&apos;opérateur n&apos;a pas pu être lu.</p>}
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-2.5">
                                    <Releve etat={e} />
                                    {!("erreur" in e) && e.source.box && <a href={e.source.box} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black text-slate-400 hover:text-slate-700 hover:underline">Toutes les offres ↗</a>}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        {TRANCHES.map((t) => {
                            const liste = mobiles.filter((o) => o.go >= t.min && o.go < t.max).sort((a, b) => a.prix - b.prix);
                            return (
                                <section key={t.titre} className="carte-accueil rounded-[24px] border-2 border-slate-900 bg-white p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="text-lg font-black text-slate-900">{t.titre}</h2>
                                        <span className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-black text-[#cd1e25]">Free : {t.free}</span>
                                    </div>
                                    {liste.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Aucun forfait relevé dans cette tranche.</p>}
                                    {liste.map((o: OffreMobileConc & { op: OperateurId }) => (
                                        <div key={`${o.op}-${o.nom}`} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                                            <Puce op={o.op} taille={12} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-slate-900">{OP[o.op].nom} · {o.nom}</p>
                                                <div className="flex flex-wrap items-center gap-x-3">
                                                    {o.puis && <span className="text-xs font-bold tabular-nums text-slate-500">{o.moisPromo} mois, puis {eur(o.puis)}</span>}
                                                    <LienOffre url={o.url} op={o.op} />
                                                </div>
                                            </div>
                                            {o.fin && <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">jusqu&apos;au {o.fin}</span>}
                                            <p className="shrink-0 text-lg font-black tabular-nums text-slate-900">{eur(o.prix)}</p>
                                        </div>
                                    ))}
                                </section>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                        {visibles.filter((e) => "erreur" in e || e.mobile.length > 0).map((e) => (
                            <span key={e.op} className="flex items-center gap-1.5"><Puce op={e.op} taille={8} /><Releve etat={e} /></span>
                        ))}
                    </div>
                </>
            )}

            <p className="mt-6 text-[11px] text-slate-400">
                Offres publiques nouveaux clients relevées automatiquement sur les sites des opérateurs, deux fois par jour.
                Hors remises réservées aux abonnés et offres en boutique. Prix susceptibles d&apos;évoluer : se fier à la date de relevé et au site de l&apos;opérateur.
            </p>
        </div>
    );
}

export default function ConcurrencePage() {
    return <Suspense><Contenu /></Suspense>;
}
