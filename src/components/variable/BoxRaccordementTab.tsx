"use client";

import { useEffect, useRef, useState } from "react";
import { BaremeVariable } from "@/services/variableConseiller";
import {
    FicheBoxRaccordement,
    ModeleBox,
    CanalOption,
    MODELE_BOX_LABELS,
    getFichesBoxRaccordement,
    creerFicheBoxRaccordement,
    basculerRaccordement,
    mettreAJourFiche,
    supprimerFicheBoxRaccordement,
    estPerdue,
    dateLimite,
    nomMois,
} from "@/services/boxRaccordement";

const CANAUX: { cle: CanalOption; label: string; champMontant: "montantCanal1" | "montantCanal2" | "montantCanal3" }[] = [
    { cle: "canal1", label: "C+1", champMontant: "montantCanal1" },
    { cle: "canal2", label: "C+2", champMontant: "montantCanal2" },
    { cle: "canal3", label: "C+3", champMontant: "montantCanal3" },
];

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtDateHeure(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const MODELES: ModeleBox[] = ["box_ultra", "box_pop", "box_pop_s_revolution_5g"];

export default function BoxRaccordementTab({ conseillerId, bareme }: { conseillerId: string; bareme: BaremeVariable }) {
    const [fiches, setFiches] = useState<FicheBoxRaccordement[]>([]);
    const [loading, setLoading] = useState(true);
    const [enCoursId, setEnCoursId] = useState<string | null>(null);
    const [ajoutOuvert, setAjoutOuvert] = useState(false);
    const [commentaires, setCommentaires] = useState<Record<string, string>>({});
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    async function charger() {
        const data = await getFichesBoxRaccordement(conseillerId);
        setFiches(data);
        setCommentaires(Object.fromEntries(data.map((f) => [f.id, f.commentaire ?? ""])));
        setLoading(false);
    }

    useEffect(() => {
        if (conseillerId) charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conseillerId]);

    function patchLocal(ficheId: string, patch: Partial<FicheBoxRaccordement>) {
        setFiches((prev) => prev.map((f) => (f.id === ficheId ? { ...f, ...patch } : f)));
    }

    async function toggleQuatreP(f: FicheBoxRaccordement) {
        const next = !f.quatreP;
        patchLocal(f.id, { quatreP: next });
        await mettreAJourFiche(f.id, { quatreP: next });
    }

    async function toggleMcafee(f: FicheBoxRaccordement) {
        const next = !f.mcafee;
        patchLocal(f.id, { mcafee: next });
        await mettreAJourFiche(f.id, { mcafee: next });
    }

    async function toggleCanal(f: FicheBoxRaccordement, cle: CanalOption) {
        const next = !f[cle];
        patchLocal(f.id, { [cle]: next } as Partial<FicheBoxRaccordement>);
        await mettreAJourFiche(f.id, { [cle]: next });
    }

    function changerCommentaire(ficheId: string, valeur: string) {
        setCommentaires((prev) => ({ ...prev, [ficheId]: valeur }));
        if (timers.current[ficheId]) clearTimeout(timers.current[ficheId]);
        timers.current[ficheId] = setTimeout(() => {
            mettreAJourFiche(ficheId, { commentaire: valeur });
        }, 700);
    }

    async function toggleRaccordee(f: FicheBoxRaccordement) {
        setEnCoursId(f.id);
        const next = !f.raccordee;
        try {
            await basculerRaccordement(f.id, next);
            patchLocal(f.id, { raccordee: next, raccordeeLe: next ? new Date().toISOString() : null });
        } finally {
            setEnCoursId(null);
        }
    }

    async function ajouter(modele: ModeleBox) {
        setAjoutOuvert(false);
        await creerFicheBoxRaccordement(conseillerId, modele, bareme);
        await charger();
    }

    async function supprimer(ficheId: string) {
        setFiches((prev) => prev.filter((f) => f.id !== ficheId));
        await supprimerFicheBoxRaccordement(ficheId);
    }

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const enAttente = fiches.filter((f) => !f.raccordee && !estPerdue(f));
    const raccordees = fiches.filter((f) => f.raccordee);
    const perdues = fiches.filter((f) => !f.raccordee && estPerdue(f));

    function ligneFiche(f: FicheBoxRaccordement, variante: "attente" | "raccordee" | "perdue") {
        const style =
            variante === "raccordee" ? "bg-emerald-50 border-emerald-100" :
            variante === "perdue" ? "bg-red-50 border-red-100" :
            "bg-slate-50 border-slate-100";
        return (
            <div key={f.id} className={`rounded-2xl border p-4 ${style}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900">{MODELE_BOX_LABELS[f.modele]}</p>
                            <span className="text-xs font-bold text-slate-400">{fmtEuro(f.montantBox)} figé</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Vendue le {fmtDateHeure(f.createdAt)}
                            {variante === "attente" && ` · à raccorder avant le ${dateLimite(f.moisPaiement).toLocaleDateString("fr-FR")}`}
                            {variante === "raccordee" && ` · payée en ${nomMois(f.moisPaiement)}`}
                            {variante === "perdue" && ` · non raccordée avant le paiement de ${nomMois(f.moisPaiement)} · non payée`}
                        </p>
                        <input
                            value={commentaires[f.id] ?? ""}
                            onChange={(e) => changerCommentaire(f.id, e.target.value)}
                            placeholder="Commentaire (ex: identifiant client)"
                            className="mt-2 h-8 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-violet-400"
                        />
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                        {variante !== "perdue" && (
                            <>
                                <button
                                    onClick={() => toggleQuatreP(f)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                                        f.quatreP ? "bg-emerald-500 text-white" : "border border-slate-200 bg-white text-slate-400"
                                    }`}
                                >
                                    4P {f.quatreP ? "✓" : ""}
                                </button>
                                <button
                                    onClick={() => toggleMcafee(f)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                                        f.mcafee ? "bg-emerald-500 text-white" : "border border-slate-200 bg-white text-slate-400"
                                    }`}
                                >
                                    McAfee {f.mcafee ? "✓" : ""}
                                </button>
                                {CANAUX.map((c) => (
                                    <button
                                        key={c.cle}
                                        onClick={() => toggleCanal(f, c.cle)}
                                        title={fmtEuro(f[c.champMontant])}
                                        className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                                            f[c.cle] ? "bg-emerald-500 text-white" : "border border-slate-200 bg-white text-slate-400"
                                        }`}
                                    >
                                        {c.label} {f[c.cle] ? "✓" : ""}
                                    </button>
                                ))}
                                <button
                                    onClick={() => toggleRaccordee(f)}
                                    disabled={enCoursId === f.id}
                                    className={`rounded-xl px-4 py-2 text-xs font-black transition-all disabled:opacity-60 ${
                                        f.raccordee ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-violet-600 text-white hover:bg-violet-700"
                                    }`}
                                    title={f.raccordee ? "Recliquer pour repasser en attente" : "Marquer comme raccordée"}
                                >
                                    {enCoursId === f.id ? "…" : f.raccordee ? "Raccordée ✓" : "Raccordée ?"}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => supprimer(f.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 transition-all hover:bg-red-100 hover:text-red-500"
                            title="Supprimer cette vente"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">📦 En attente de raccordement</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Coche les options vendues avec chaque box, puis valide le raccordement pour l'ajouter à ta variable.
                        </p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setAjoutOuvert((v) => !v)}
                            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-all hover:scale-[1.02]"
                        >
                            + Ajouter une vente
                        </button>
                        {ajoutOuvert && (
                            <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_32px_rgba(15,23,42,.15)]">
                                {MODELES.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => ajouter(m)}
                                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                                    >
                                        {MODELE_BOX_LABELS[m]}
                                        <span className="text-xs text-slate-400">{fmtEuro(bareme[m])}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {enAttente.length === 0 ? (
                    <p className="mt-4 py-6 text-center text-sm text-slate-300">Aucune box en attente de raccordement.</p>
                ) : (
                    <div className="mt-4 space-y-3">{enAttente.map((f) => ligneFiche(f, "attente"))}</div>
                )}
            </div>

            {raccordees.length > 0 && (
                <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">✓ Raccordées</p>
                    <div className="mt-4 space-y-3">{raccordees.map((f) => ligneFiche(f, "raccordee"))}</div>
                </div>
            )}

            {perdues.length > 0 && (
                <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">✕ Perdues (délai dépassé)</p>
                    <div className="mt-4 space-y-3">{perdues.map((f) => ligneFiche(f, "perdue"))}</div>
                </div>
            )}
        </div>
    );
}
