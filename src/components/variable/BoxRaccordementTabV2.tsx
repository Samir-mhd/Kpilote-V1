"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { BaremeVariable } from "@/services/variableConseiller";
import {
    FicheBoxRaccordement,
    ModeleBox,
    CanalOption,
    MODELE_BOX_LABELS,
    getFichesBoxRaccordement,
    creerFicheBoxRaccordement,
    basculerRaccordement,
    basculerBoxKo,
    mettreAJourFiche,
    supprimerFicheBoxRaccordement,
    estPerdue,
    estPerdueParDelai,
    estDisparu,
    dateLimite,
    nomMois,
    dateDuJour,
} from "@/services/boxRaccordement";

/**
 * "Mes box" simplifié (variante &box=v2) : résumé (en jeu, prochaine échéance, raccordées),
 * onglets En attente / Raccordées / Perdues, une ligne courte par box avec un seul bouton
 * principal "Raccordée", options et actions secondaires dans un panneau "⋯", recherche.
 */

const CANAUX: { cle: CanalOption; label: string }[] = [
    { cle: "canal1", label: "Canal+ 1" },
    { cle: "canal2", label: "Canal+ 2" },
    { cle: "canal3", label: "Canal+ 3" },
];
const MODELES: ModeleBox[] = ["box_ultra", "box_pop", "box_pop_s_revolution_5g"];
const SEUIL_URGENCE_JOURS = 21; // 3 semaines avant la date limite de raccordement

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtJour(dateIso: string) {
    const [, m, d] = dateIso.split("-");
    return `${d}/${m}`;
}
function joursAvant(date: Date) {
    return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}
/** Ce que rapporte la box, options comprises (hors boost). */
function valeur(f: FicheBoxRaccordement) {
    return f.montantBox
        + (f.quatreP ? f.montant4P : 0)
        + (f.mcafee ? f.montantMcafee : 0)
        + (f.canal1 ? f.montantCanal1 : 0) + (f.canal2 ? f.montantCanal2 : 0) + (f.canal3 ? f.montantCanal3 : 0);
}
function optionsVendues(f: FicheBoxRaccordement): string[] {
    const o: string[] = [];
    if (f.quatreP) o.push("4P");
    if (f.mcafee) o.push(`McAfee ${f.montantMcafee >= 2 ? "6,99" : "4,99"}`);
    CANAUX.forEach((c) => { if (f[c.cle]) o.push(c.label); });
    return o;
}

type Onglet = "attente" | "raccordees" | "perdues";

export default function BoxRaccordementTabV2({ conseillerId, bareme }: { conseillerId: string; bareme: BaremeVariable }) {
    const [fiches, setFiches] = useState<FicheBoxRaccordement[]>([]);
    const [loading, setLoading] = useState(true);
    const [onglet, setOnglet] = useState<Onglet>("attente");
    const [recherche, setRecherche] = useState("");
    const [ouverte, setOuverte] = useState<string | null>(null);
    const [enCoursId, setEnCoursId] = useState<string | null>(null);
    const [ajoutOuvert, setAjoutOuvert] = useState(false);
    const [dateAjout, setDateAjout] = useState(dateDuJour());
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

    function patchLocal(id: string, patch: Partial<FicheBoxRaccordement>) {
        setFiches((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    }
    async function toggleQuatreP(f: FicheBoxRaccordement) {
        patchLocal(f.id, { quatreP: !f.quatreP });
        await mettreAJourFiche(f.id, { quatreP: !f.quatreP });
    }
    // Deux paliers (4,99 € / 6,99 €) : recliquer la variante choisie la retire, l'autre bascule dessus.
    async function toggleMcafee(f: FicheBoxRaccordement, variante: "499" | "699") {
        const montant = variante === "499" ? bareme.mcafee_499 : bareme.mcafee_699;
        const next = !(f.mcafee && f.montantMcafee === montant);
        patchLocal(f.id, { mcafee: next, montantMcafee: montant });
        await mettreAJourFiche(f.id, { mcafee: next, montantMcafee: montant });
    }
    async function toggleCanal(f: FicheBoxRaccordement, cle: CanalOption) {
        patchLocal(f.id, { [cle]: !f[cle] } as Partial<FicheBoxRaccordement>);
        await mettreAJourFiche(f.id, { [cle]: !f[cle] });
    }
    function changerCommentaire(id: string, v: string) {
        setCommentaires((prev) => ({ ...prev, [id]: v }));
        if (timers.current[id]) clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => { mettreAJourFiche(id, { commentaire: v }); }, 700);
    }
    async function toggleRaccordee(f: FicheBoxRaccordement) {
        setEnCoursId(f.id);
        try {
            await basculerRaccordement(f.id, !f.raccordee);
            patchLocal(f.id, { raccordee: !f.raccordee, raccordeeLe: !f.raccordee ? new Date().toISOString() : null, boxKo: !f.raccordee ? false : f.boxKo });
        } finally { setEnCoursId(null); }
    }
    async function toggleBoxKo(f: FicheBoxRaccordement) {
        setEnCoursId(f.id);
        try {
            await basculerBoxKo(f.id, !f.boxKo);
            patchLocal(f.id, { boxKo: !f.boxKo, raccordee: !f.boxKo ? false : f.raccordee, raccordeeLe: !f.boxKo ? null : f.raccordeeLe });
        } finally { setEnCoursId(null); }
    }
    async function ajouter(modele: ModeleBox) {
        setAjoutOuvert(false);
        await creerFicheBoxRaccordement(conseillerId, modele, dateAjout);
        setDateAjout(dateDuJour());
        await charger();
    }
    async function supprimer(id: string) {
        if (!window.confirm("Supprimer cette vente de box ?")) return;
        setFiches((prev) => prev.filter((f) => f.id !== id));
        await supprimerFicheBoxRaccordement(id);
    }

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const visibles = fiches.filter((f) => !estDisparu(f));
    const enAttente = visibles.filter((f) => !f.raccordee && !estPerdue(f));
    const raccordees = visibles.filter((f) => f.raccordee);
    const perdues = visibles.filter((f) => !f.raccordee && estPerdue(f));

    // Prochaine échéance : le groupe en attente dont la date limite est la plus proche.
    const parEcheance = new Map<string, FicheBoxRaccordement[]>();
    enAttente.forEach((f) => parEcheance.set(f.moisPaiement, [...(parEcheance.get(f.moisPaiement) ?? []), f]));
    const prochaine = [...parEcheance.entries()].sort((a, b) => a[0].localeCompare(b[0]))[0];
    const joursProchaine = prochaine ? joursAvant(dateLimite(prochaine[0])) : null;

    const liste = (onglet === "attente" ? enAttente : onglet === "raccordees" ? raccordees : perdues)
        .filter((f) => {
            const q = recherche.trim().toLowerCase();
            if (!q) return true;
            return (commentaires[f.id] ?? "").toLowerCase().includes(q) || MODELE_BOX_LABELS[f.modele].toLowerCase().includes(q);
        })
        // En attente : échéance la plus proche d'abord, puis vente la plus récente.
        .sort((a, b) => (onglet === "attente" ? a.moisPaiement.localeCompare(b.moisPaiement) : 0) || b.dateVente.localeCompare(a.dateVente));

    const ONGLETS: { id: Onglet; label: string; nb: number }[] = [
        { id: "attente", label: "En attente", nb: enAttente.length },
        { id: "raccordees", label: "Raccordées", nb: raccordees.length },
        { id: "perdues", label: "Perdues", nb: perdues.length },
    ];

    return (
        <div className="space-y-5">
            {/* ── Résumé ─────────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)]">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-600">En attente</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{enAttente.length} <span className="text-base font-bold text-slate-400">box</span></p>
                    <p className="text-xs font-semibold text-slate-500">{fmtEuro(enAttente.reduce((t, f) => t + valeur(f), 0))} en jeu</p>
                </div>
                <div className={`rounded-[22px] p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)] ${joursProchaine !== null && joursProchaine <= SEUIL_URGENCE_JOURS ? "bg-rose-50 ring-1 ring-rose-200" : "bg-amber-50 ring-1 ring-amber-200"}`}>
                    <p className={`text-[11px] font-black uppercase tracking-[0.15em] ${joursProchaine !== null && joursProchaine <= SEUIL_URGENCE_JOURS ? "text-rose-600" : "text-amber-700"}`}>⏳ Prochaine échéance</p>
                    {prochaine ? (
                        <>
                            <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{prochaine[1].length} <span className="text-base font-bold text-slate-400">box</span></p>
                            <p className="text-xs font-semibold text-slate-600">
                                de {nomMois(prochaine[1][0].moisVente)} à raccorder avant le {dateLimite(prochaine[0]).toLocaleDateString("fr-FR")} · <span className="font-black">J-{joursProchaine}</span>
                            </p>
                        </>
                    ) : <p className="mt-1 text-sm font-semibold text-slate-500">Rien en attente 👍</p>}
                </div>
                <div className="rounded-[22px] bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.06)]">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-600">✓ Raccordées</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{raccordees.length} <span className="text-base font-bold text-slate-400">box</span></p>
                    <p className="text-xs font-semibold text-slate-500">{fmtEuro(raccordees.reduce((t, f) => t + valeur(f), 0))} acquis</p>
                </div>
            </div>

            {/* ── Liste ──────────────────────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
                        {ONGLETS.map((o) => (
                            <button key={o.id} onClick={() => setOnglet(o.id)} className={`rounded-lg px-3 py-1.5 transition-all ${onglet === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                                {o.label} <span className="tabular-nums text-slate-400">{o.nb}</span>
                            </button>
                        ))}
                    </div>
                    <label className="relative min-w-[180px] flex-1">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={recherche}
                            onChange={(e) => setRecherche(e.target.value)}
                            placeholder="Rechercher un identifiant client, un commentaire…"
                            className="h-9 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-violet-400"
                        />
                    </label>
                    <div className="relative">
                        <button onClick={() => setAjoutOuvert((v) => !v)} className="h-9 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">+ Ajouter</button>
                        {ajoutOuvert && (
                            <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_32px_rgba(15,23,42,.15)]">
                                <div className="border-b border-slate-100 p-3">
                                    <label className="mb-1 block text-[11px] font-bold text-slate-400">Date de la vente</label>
                                    <input type="date" value={dateAjout} max={dateDuJour()} onChange={(e) => setDateAjout(e.target.value)} className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-violet-400" />
                                </div>
                                {MODELES.map((m) => (
                                    <button key={m} onClick={() => ajouter(m)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                                        {MODELE_BOX_LABELS[m]}<span className="text-xs text-slate-400">{fmtEuro(bareme[m])}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {liste.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                        {recherche ? "Aucune box ne correspond à ta recherche." : onglet === "attente" ? "Aucune box en attente 👍" : onglet === "raccordees" ? "Aucune box raccordée pour l'instant." : "Aucune box perdue."}
                    </p>
                ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                        {liste.map((f) => {
                            const jours = joursAvant(dateLimite(f.moisPaiement));
                            const urgente = onglet === "attente" && jours <= SEUIL_URGENCE_JOURS;
                            const options = optionsVendues(f);
                            const estOuverte = ouverte === f.id;
                            return (
                                <li key={f.id} className={`py-3 ${urgente ? "-mx-2 rounded-xl bg-rose-50 px-2" : ""}`}>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <div className="w-28 shrink-0">
                                            <p className="text-sm font-black text-slate-900">{MODELE_BOX_LABELS[f.modele].split(" / ")[0]}</p>
                                            <p className="text-[11px] font-semibold text-slate-400">
                                                vendue le {fmtJour(f.dateVente)}
                                                {urgente && <span className="font-black text-rose-600"> · J-{jours}</span>}
                                            </p>
                                        </div>
                                        <input
                                            value={commentaires[f.id] ?? ""}
                                            onChange={(e) => changerCommentaire(f.id, e.target.value)}
                                            placeholder="Identifiant client…"
                                            className="h-8 min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-violet-400 focus:bg-white"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {options.map((o) => (
                                                <span key={o} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">{o}</span>
                                            ))}
                                        </div>
                                        <span className="w-20 shrink-0 text-right text-sm font-black tabular-nums text-slate-700">{fmtEuro(valeur(f))}</span>
                                        {onglet !== "perdues" ? (
                                            <button
                                                onClick={() => toggleRaccordee(f)}
                                                disabled={enCoursId === f.id}
                                                className={`h-9 shrink-0 rounded-xl px-4 text-xs font-black transition-all disabled:opacity-60 ${f.raccordee ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
                                                title={f.raccordee ? `Payée en ${nomMois(f.moisPaiement)} · recliquer pour repasser en attente` : "Marquer comme raccordée"}
                                            >
                                                {enCoursId === f.id ? "…" : f.raccordee ? "Raccordée ✓" : "Raccordée ?"}
                                            </button>
                                        ) : (
                                            <span className="shrink-0 text-[11px] font-bold text-rose-500">{estPerdueParDelai(f) ? "délai dépassé" : "Box KO"}</span>
                                        )}
                                        <button
                                            onClick={() => setOuverte(estOuverte ? null : f.id)}
                                            aria-expanded={estOuverte}
                                            aria-label="Options et actions"
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${estOuverte ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {estOuverte && (
                                        <div className="mt-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            {onglet !== "perdues" && (
                                                <>
                                                    <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Options vendues</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Toggle actif={f.quatreP} onClick={() => toggleQuatreP(f)}>4P</Toggle>
                                                        <Toggle actif={f.mcafee && f.montantMcafee === bareme.mcafee_499} onClick={() => toggleMcafee(f, "499")}>McAfee 4,99 €</Toggle>
                                                        <Toggle actif={f.mcafee && f.montantMcafee === bareme.mcafee_699} onClick={() => toggleMcafee(f, "699")}>McAfee 6,99 €</Toggle>
                                                        {/* Canal+ : uniquement sur box Ultra (comme la question posée sur l'Accueil). */}
                                                        {(f.modele === "box_ultra" || f.canal1 || f.canal2 || f.canal3) && CANAUX.map((c) => (
                                                            <Toggle key={c.cle} actif={f[c.cle]} onClick={() => toggleCanal(f, c.cle)}>{c.label}</Toggle>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                                                {!f.raccordee && !estPerdueParDelai(f) && (
                                                    <button onClick={() => toggleBoxKo(f)} disabled={enCoursId === f.id} className="rounded-lg bg-white px-3 py-1.5 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                                        {f.boxKo ? "Annuler Box KO" : "Marquer Box KO"}
                                                    </button>
                                                )}
                                                <button onClick={() => supprimer(f.id)} className="rounded-lg bg-white px-3 py-1.5 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100">
                                                    Supprimer la vente
                                                </button>
                                                {onglet === "attente" && (
                                                    <span className="self-center text-[11px] font-semibold text-slate-400">
                                                        à raccorder avant le {dateLimite(f.moisPaiement).toLocaleDateString("fr-FR")} · payée en {nomMois(f.moisPaiement)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

function Toggle({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-pressed={actif}
            className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${actif ? "bg-emerald-500 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"}`}
        >
            {actif ? "✓ " : ""}{children}
        </button>
    );
}
