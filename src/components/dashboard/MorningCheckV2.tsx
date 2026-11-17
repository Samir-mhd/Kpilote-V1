"use client";

import { useEffect, useState } from "react";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import { getMissionsCompletes, getMissionsReelles, codeDepuisNom, CODES_VENTES_COMBO } from "@/services/missionsReelles";
import { ajusterCheckCerebro, ajusterCheckCerebroCombos, CodeComboCheck } from "@/services/resetService";
import { COMBO_META, ComboCode } from "@/utils/classementGroupes";
import { construireClassementPeriode } from "@/services/classementService";
import { getJoursTravailPlage } from "@/services/planningService";
import { getActesParJour } from "@/services/podiumsService";
import { getCagnotteJour } from "@/services/variableConseiller";
import { getFichesBoxRaccordement, estPerdue, estDisparu, dateLimite } from "@/services/boxRaccordement";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { getOuCreerDefiJour, DefiJour } from "@/services/defisJourService";
import { DefiJourChoix } from "@/components/dashboard/DefiJour";
import { getTableauBordMatin, TableauBordMatin, CODES_ACTES_MATIN } from "@/services/tableauBordMatinService";

/**
 * Cerebro Check repensé (variante &cerebro=v2) : un briefing du matin (dernière journée, position,
 * objectifs du jour, alerte box) puis la vérification des chiffres du mois en liste compacte, et
 * un seul bouton pour démarrer. Même enregistrement que la v1 (ajusterCheckCerebro, par écart).
 */

type Props = {
    nom: string;
    conseillerId: string;
    /** true = check relancé par le manager → message d'avertissement (jamais destructif) */
    isReset?: boolean;
    onValidated: () => void;
    /** Ouvert depuis "Corrections" (Accueil) : seulement la vérification des chiffres, sans briefing. */
    modeCorrection?: boolean;
};

type Item = { produit: string; code: string; valeur: number };

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function emojiDe(code: string) {
    return PRODUITS_ORDRE.find((p) => p.code === code)?.emoji ?? COMBO_META[code as ComboCode]?.emoji ?? "•";
}
function jourLocal(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

type Briefing = {
    travaille: boolean;
    derniere: { jour: string; actes: number; cagnotte: number } | null;
    rang: number;
    effectif: number;
    objectifsJour: { produit: string; code: string; objectif: number }[];
    boxUrgentes: { nb: number; limite: Date; jours: number } | null;
};

export default function MorningCheckV2({ nom, conseillerId, isReset = false, onValidated, modeCorrection = false }: Props) {
    const prenom = nom.split(" ")[0];
    const [visible, setVisible] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [originaux, setOriginaux] = useState<Item[]>([]);
    const [briefing, setBriefing] = useState<Briefing | null>(null);
    const [loading, setLoading] = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);
    const [defi, setDefi] = useState<DefiJour | null>(null);
    const [tableau, setTableau] = useState<TableauBordMatin | null>(null);

    const now = new Date();
    const jourNom = JOURS[now.getDay()];
    const dateLabel = `${jourNom.charAt(0).toUpperCase()}${jourNom.slice(1)} ${now.getDate()} ${MOIS[now.getMonth()]}`;

    useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

    useEffect(() => {
        if (!conseillerId) { setLoading(false); return; }
        const aujourdhui = new Date();
        const ilYa7 = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - 7);
        const hier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - 1);

        Promise.all([
            getMissionsCompletes(conseillerId),
            getMissionsReelles(conseillerId).catch(() => []),
            getJoursTravailPlage(conseillerId, aujourdhui, aujourdhui).catch(() => 1),
            construireClassementPeriode("mois").catch(() => []),
            getActesParJour(jourLocal(ilYa7), jourLocal(hier)).catch(() => ({} as Record<string, Record<string, number>>)),
            getFichesBoxRaccordement(conseillerId).catch(() => []),
            modeCorrection ? Promise.resolve(null) : getOuCreerDefiJour(conseillerId).catch(() => null),
            modeCorrection ? Promise.resolve(null) : getTableauBordMatin(conseillerId).catch(() => null),
        ]).then(async ([missions, missionsJour, planifie, classement, actesParJour, fiches, defiJour, tableauMatin]) => {
            setDefi(defiJour);
            setTableau(tableauMatin);
            const ordre = [...PRODUITS_ORDRE.map((p) => p.code as string), ...Object.keys(COMBO_META)];
            const rangCode = (c: string) => { const i = ordre.indexOf(c); return i === -1 ? 99 : i; };
            const charges = missions.map((m) => ({ produit: m.produit, code: codeDepuisNom(m.produit), valeur: m.realise }))
                .sort((a, b) => rangCode(a.code) - rangCode(b.code));
            setItems(charges);
            setOriginaux(charges);

            // Dernière journée avec des actes (pas forcément hier : jour off, week-end…).
            const mesJours = Object.entries(actesParJour[conseillerId] ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[0].localeCompare(a[0]));
            let derniere: Briefing["derniere"] = null;
            if (mesJours[0]) {
                const actes = await getCagnotteJour(conseillerId, mesJours[0][0]).catch(() => []);
                derniere = { jour: mesJours[0][0], actes: mesJours[0][1], cagnotte: actes.reduce((t, a) => t + a.montant, 0) };
            }

            // Box en attente dont la date limite de raccordement est la plus proche.
            const enAttente = fiches.filter((f) => !f.raccordee && !estPerdue(f) && !estDisparu(f));
            const prochaine = [...enAttente].sort((a, b) => a.moisPaiement.localeCompare(b.moisPaiement))[0];
            let boxUrgentes: Briefing["boxUrgentes"] = null;
            if (prochaine) {
                const limite = dateLimite(prochaine.moisPaiement);
                const jours = Math.ceil((limite.getTime() - Date.now()) / 86_400_000);
                if (jours <= 21) boxUrgentes = { nb: enAttente.filter((f) => f.moisPaiement === prochaine.moisPaiement).length, limite, jours };
            }

            setBriefing({
                travaille: planifie > 0,
                derniere,
                rang: classement.findIndex((c) => c.id === conseillerId) + 1,
                effectif: classement.length,
                objectifsJour: (missionsJour as { produit: string; objectif: number }[])
                    .map((m) => ({ produit: m.produit, code: codeDepuisNom(m.produit), objectif: m.objectif }))
                    .filter((m) => m.objectif > 0 && m.code !== "spiderhome"),
                boxUrgentes,
            });
        }).finally(() => setLoading(false));
    }, [conseillerId]);

    function ajuster(code: string, delta: number) {
        setItems((prev) => prev.map((it) => (it.code === code ? { ...it, valeur: Math.max(0, it.valeur + delta) } : it)));
    }

    const modifies = items.filter((it, i) => it.valeur !== (originaux[i]?.valeur ?? 0)).length;

    async function demarrer() {
        if (conseillerId && modifies > 0) {
            setEnregistrement(true);
            try {
                // Ajustement par écart uniquement (jamais de suppression) — même règle que la v1.
                const valeurs: Record<string, number> = {};
                const valeursCombos: Partial<Record<CodeComboCheck, number>> = {};
                const estCombo = (code: string) => (CODES_VENTES_COMBO as readonly string[]).includes(code);
                // Combos (stockés ailleurs, voir ajusterCheckCerebroCombos) : si l'un change, on renvoie
                // les trois — l'ajustement remplace tous les anciens ajustements combo du mois.
                const comboModifie = items.some((it, i) => estCombo(it.code) && it.valeur !== (originaux[i]?.valeur ?? 0));
                items.forEach((it) => {
                    if (estCombo(it.code)) { if (comboModifie) valeursCombos[it.code as CodeComboCheck] = it.valeur; }
                    else valeurs[it.code] = it.valeur;
                });
                await ajusterCheckCerebro(conseillerId, valeurs);
                await ajusterCheckCerebroCombos(conseillerId, valeursCombos);
            } catch { /* silencieux */ }
            setEnregistrement(false);
        }
        setTimeout(onValidated, 80);
    }

    // ── Mini tableau de bord : hier, 10 derniers jours, à relancer ──
    const veille = tableau?.veille ?? null;
    const libJour = (k: string) => {
        const [y, m, d] = k.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const hier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return jourLocal(date) === jourLocal(hier) ? "d'hier" : `de ${JOURS[date.getDay()]} ${d}`;
    };
    const messageVeille = () => {
        if (!tableau || !veille) return "";
        if (tableau.meilleureDuMois) return "Ta meilleure journée du mois ! 🔥";
        const ecart = Math.round(veille.actes - tableau.moyenne);
        if (ecart >= 1) return `${ecart} acte${ecart > 1 ? "s" : ""} de plus que ta moyenne 💪`;
        if (ecart > -1) return "Pile dans ta moyenne, régulier 👌";
        return "En dessous de ta moyenne : aujourd'hui on rattrape 🚀";
    };
    // « À relancer » : seulement les produits qui concernent le conseiller (présents dans ses chiffres du mois).
    const codesConcernes = new Set(items.map((it) => it.code));
    const aRelancer = (tableau?.aRelancer ?? []).filter((r) => codesConcernes.has(r.code));
    const nomProduit = (code: string) => items.find((it) => it.code === code)?.produit ?? code;
    const maxBarre = Math.max(1, ...(tableau?.jours ?? []).map((j) => j.actes), Math.ceil(tableau?.moyenne ?? 0));
    const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

    const carte = "rounded-3xl bg-white/[0.05] p-4 ring-1 ring-white/10";
    const titreCarte = "mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/40";

    const verification = (
        <ul className="grid gap-1.5 sm:grid-cols-2">
            {items.map((it, i) => {
                const ecart = it.valeur - (originaux[i]?.valeur ?? 0);
                return (
                    <li key={it.code} className={`flex items-center gap-2.5 rounded-xl px-3 py-1.5 ${ecart !== 0 ? "bg-amber-400/10 ring-1 ring-amber-300/30" : "bg-white/[0.04]"}`}>
                        <span className="w-5 text-center" aria-hidden="true">{emojiDe(it.code)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/80">{it.produit}</span>
                        {ecart !== 0 && <span className="text-[11px] font-black text-amber-300">{ecart > 0 ? `+${ecart}` : ecart}</span>}
                        <button onClick={() => ajuster(it.code, -1)} aria-label={`Retirer 1 ${it.produit}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">−</button>
                        <span className="w-8 text-center text-lg font-black tabular-nums text-white">{it.valeur}</span>
                        <button onClick={() => ajuster(it.code, +1)} aria-label={`Ajouter 1 ${it.produit}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">+</button>
                    </li>
                );
            })}
        </ul>
    );

    const boutonDemarrer = (
        <button
            onClick={demarrer}
            disabled={enregistrement}
            className="group flex w-full items-center justify-between rounded-[20px] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-left shadow-[0_12px_40px_rgba(124,58,237,.45)] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
            <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.25em] text-white/70">
                    {modifies > 0 ? `${modifies} correction${modifies > 1 ? "s" : ""} à enregistrer` : "Tout est bon"}
                </span>
                <span className="block text-xl font-black text-white">
                    {enregistrement ? "Enregistrement…" : modifies > 0 ? "Enregistrer et démarrer" : "Je démarre ma journée"}
                </span>
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover:translate-x-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#060612" }}>
            <div className="pointer-events-none fixed -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div
                className={`relative mx-auto flex w-full flex-col px-4 py-4 transition-all duration-700 sm:px-5 ${modeCorrection ? "max-w-3xl" : "max-w-[1500px] lg:h-screen"}`}
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)" }}
            >
                {/* ── En-tête ── */}
                <div className="flex items-center gap-4">
                    <CartoonAvatar prenom={nom} etat="souriant_main" className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_10px_30px_rgba(139,92,246,.45)]" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-400">{modeCorrection ? "Corriger mes chiffres" : "Cerebro Check"}</p>
                        <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                            Bonjour <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{prenom}</span> 👋
                        </h1>
                        <p className="text-sm font-semibold text-white/45">
                            {dateLabel}
                            {briefing && <span> · {briefing.travaille ? "tu travailles aujourd'hui" : "jour de repos"}</span>}
                        </p>
                    </div>
                    {briefing && !modeCorrection && briefing.rang > 0 && (
                        <div className="rounded-2xl bg-white/[0.06] px-4 py-2 text-right ring-1 ring-white/10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Classement du mois</p>
                            <p className="text-2xl font-black text-white">#{briefing.rang} <span className="text-sm text-white/40">sur {briefing.effectif}</span>{briefing.rang === 1 && " 👑"}</p>
                        </div>
                    )}
                </div>

                {isReset && (
                    <p className="mt-3 rounded-2xl bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/20">
                        ⚠️ Ton manager t&apos;a demandé de revérifier tes chiffres. Ajuste-les si besoin — rien n&apos;est supprimé.
                    </p>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    </div>
                ) : modeCorrection ? (
                    <>
                        <div className={`mt-5 ${carte}`}>
                            <p className={titreCarte}>Tes chiffres du mois sont-ils justes ?</p>
                            {verification}
                        </div>
                        <div className="mt-4">{boutonDemarrer}</div>
                    </>
                ) : (
                    <>
                        <div className="mt-4 grid min-h-0 flex-1 gap-3 lg:grid-cols-12 lg:grid-rows-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                            {/* Hier */}
                            <div className={`${carte} lg:col-span-4`}>
                                <p className={titreCarte}>{veille ? `Ta journée ${libJour(veille.jour)}` : "Ta dernière journée"}</p>
                                {veille ? (
                                    <>
                                        <p className="text-5xl font-black tabular-nums text-white">
                                            {veille.actes}<span className="ml-2 text-base font-bold text-white/50">acte{veille.actes > 1 ? "s" : ""}</span>
                                            {briefing?.derniere && briefing.derniere.jour === veille.jour && briefing.derniere.cagnotte > 0 && (
                                                <span className="ml-3 text-base font-black text-emerald-300">+{fmtEuro(briefing.derniere.cagnotte)}</span>
                                            )}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-emerald-300">{messageVeille()}</p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {CODES_ACTES_MATIN.filter((c) => (veille.parCode[c] ?? 0) > 0).map((c) => (
                                                <span key={c} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black text-white">{emojiDe(c)} {veille.parCode[c]}</span>
                                            ))}
                                        </div>
                                    </>
                                ) : <p className="text-sm text-white/50">Pas de journée travaillée récente.</p>}
                            </div>

                            {/* 10 derniers jours */}
                            <div className={`${carte} flex min-h-[180px] flex-col lg:col-span-5`}>
                                <p className={titreCarte}>Tes 10 derniers jours</p>
                                <div className="relative flex min-h-0 flex-1 items-end gap-1.5 pt-5">
                                    {tableau && tableau.moyenne > 0 && (
                                        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-violet-300/50" style={{ bottom: `calc(${(tableau.moyenne / maxBarre) * 100}% * 0.82 + 16px)` }}>
                                            <span className="absolute -top-4 right-0 text-[10px] font-bold text-violet-300">moy. {tableau.moyenne.toFixed(1).replace(".", ",")}</span>
                                        </div>
                                    )}
                                    {(tableau?.jours ?? []).map((j, i, arr) => {
                                        const dernier = i === arr.length - 1;
                                        const [y, m, d] = j.jour.split("-").map(Number);
                                        return (
                                            <div key={j.jour} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                                <span className={`text-[11px] font-black tabular-nums ${dernier ? "text-white" : "text-white/50"}`}>{j.actes}</span>
                                                <div className={`w-full rounded-t-md ${dernier ? "bg-gradient-to-t from-violet-600 to-fuchsia-400" : "bg-white/15"}`} style={{ height: `${Math.max(3, (j.actes / maxBarre) * 82)}%` }} />
                                                <span className="text-[10px] font-bold text-white/40">{JOURS_COURTS[new Date(y, m - 1, d).getDay()]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* À relancer */}
                            <div className={`${carte} overflow-y-auto lg:col-span-3`}>
                                <p className={titreCarte}>⏰ À relancer</p>
                                <div className="space-y-1.5">
                                    {aRelancer.slice(0, 4).map((r) => (
                                        <div key={r.code} className="rounded-xl bg-amber-400/10 px-3 py-2 ring-1 ring-amber-300/25">
                                            <p className="text-sm font-black text-amber-100">{emojiDe(r.code)} {nomProduit(r.code)}</p>
                                            <p className="text-[11px] text-amber-200/70">
                                                {r.derniere ? `Dernier le ${libJour(r.derniere).replace(/^de |^d'/, "")} · ${r.joursSans} jours sans` : `Pas depuis plus de ${r.joursSans} jours`}
                                            </p>
                                        </div>
                                    ))}
                                    {aRelancer.length === 0 && <p className="text-sm text-white/50">Tout a été vendu ces derniers jours 👏</p>}
                                    {briefing?.boxUrgentes && (
                                        <div className="rounded-xl bg-rose-500/10 px-3 py-2 ring-1 ring-rose-400/25">
                                            <p className="text-sm font-black text-rose-100">📦 {briefing.boxUrgentes.nb} box à raccorder <span className="ml-1 rounded bg-rose-500/25 px-1.5 text-[11px]">J-{briefing.boxUrgentes.jours}</span></p>
                                            <p className="text-[11px] text-rose-200/70">Avant le {briefing.boxUrgentes.limite.toLocaleDateString("fr-FR")}, sinon non payées.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vérification des chiffres (gauche) */}
                            <div className={`${carte} overflow-y-auto lg:col-span-8`}>
                                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Tes chiffres du mois sont-ils justes ?</p>
                                    <p className="text-[11px] text-white/35">Corrige seulement si besoin — rien n&apos;est supprimé.</p>
                                </div>
                                {verification}
                            </div>

                            {/* Aujourd'hui : objectifs + défi (droite) */}
                            <div className={`${carte} overflow-y-auto lg:col-span-4`}>
                                <p className={titreCarte}>🎯 Aujourd&apos;hui</p>
                                {briefing && briefing.objectifsJour.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {briefing.objectifsJour.map((o) => (
                                            <span key={o.code} title={o.produit} className="rounded-xl bg-violet-500/15 px-2.5 py-1.5 text-sm font-black text-violet-100 ring-1 ring-violet-400/25">
                                                <span aria-hidden="true">{emojiDe(o.code)}</span> {o.objectif}
                                            </span>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-white/50">{briefing?.travaille ? "Pas d'objectif fixé aujourd'hui." : "Profite de ta journée 🌴"}</p>}
                                {defi && <div className="mt-3"><DefiJourChoix defi={defi} onChange={setDefi} /></div>}
                            </div>
                        </div>

                        <div className="mt-3">{boutonDemarrer}</div>
                    </>
                )}
            </div>
        </div>
    );
}
