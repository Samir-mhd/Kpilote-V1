"use client";

import { useEffect, useState } from "react";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import { getMissionsCompletes, getMissionsReelles, codeDepuisNom, CODES_VENTES_COMBO } from "@/services/missionsReelles";
import { ajusterCheckCerebro } from "@/services/resetService";
import { construireClassementPeriode } from "@/services/classementService";
import { getJoursTravailPlage } from "@/services/planningService";
import { getActesParJour } from "@/services/podiumsService";
import { getCagnotteJour } from "@/services/variableConseiller";
import { getFichesBoxRaccordement, estPerdue, estDisparu, dateLimite } from "@/services/boxRaccordement";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { getOuCreerDefiJour, DefiJour } from "@/services/defisJourService";
import { DefiJourChoix } from "@/components/dashboard/DefiJour";

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
};

type Item = { produit: string; code: string; valeur: number };

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function emojiDe(code: string) {
    return PRODUITS_ORDRE.find((p) => p.code === code)?.emoji ?? "•";
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

export default function MorningCheckV2({ nom, conseillerId, isReset = false, onValidated }: Props) {
    const prenom = nom.split(" ")[0];
    const [visible, setVisible] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [originaux, setOriginaux] = useState<Item[]>([]);
    const [briefing, setBriefing] = useState<Briefing | null>(null);
    const [loading, setLoading] = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);
    const [defi, setDefi] = useState<DefiJour | null>(null);

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
            getMissionsCompletes(conseillerId, CODES_VENTES_COMBO),
            getMissionsReelles(conseillerId).catch(() => []),
            getJoursTravailPlage(conseillerId, aujourdhui, aujourdhui).catch(() => 1),
            construireClassementPeriode("mois").catch(() => []),
            getActesParJour(jourLocal(ilYa7), jourLocal(hier)).catch(() => ({} as Record<string, Record<string, number>>)),
            getFichesBoxRaccordement(conseillerId).catch(() => []),
            getOuCreerDefiJour(conseillerId).catch(() => null),
        ]).then(async ([missions, missionsJour, planifie, classement, actesParJour, fiches, defiJour]) => {
            setDefi(defiJour);
            const charges = missions.map((m) => ({ produit: m.produit, code: codeDepuisNom(m.produit), valeur: m.realise }));
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
                    .filter((m) => m.objectif > 0),
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
                items.forEach((it) => { valeurs[it.code] = it.valeur; });
                await ajusterCheckCerebro(conseillerId, valeurs);
            } catch { /* silencieux */ }
            setEnregistrement(false);
        }
        setTimeout(onValidated, 80);
    }

    const derniereLabel = briefing?.derniere
        ? (() => {
            const [y, m, d] = briefing.derniere.jour.split("-").map(Number);
            const date = new Date(y, m - 1, d);
            const hier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            return jourLocal(date) === jourLocal(hier) ? "Hier" : `${JOURS[date.getDay()].charAt(0).toUpperCase()}${JOURS[date.getDay()].slice(1)} ${d}`;
        })()
        : "";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#060612" }}>
            <div className="pointer-events-none fixed -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div
                className="relative mx-auto w-full max-w-3xl px-5 py-8 transition-all duration-700 sm:py-10"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)" }}
            >
                {/* ── En-tête ────────────────────────────────────────── */}
                <div className="flex items-center gap-4">
                    <CartoonAvatar prenom={nom} etat="souriant_main" className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_10px_30px_rgba(139,92,246,.45)] sm:h-28 sm:w-28" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Cerebro Check</p>
                        <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                            Bonjour <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{prenom}</span> 👋
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-white/45">
                            {dateLabel}
                            {briefing && <span> · {briefing.travaille ? "tu travailles aujourd'hui" : "jour de repos"}</span>}
                        </p>
                    </div>
                </div>

                {isReset && (
                    <p className="mt-5 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/20">
                        ⚠️ Ton manager t&apos;a demandé de revérifier tes chiffres. Ajuste-les si besoin — rien n&apos;est supprimé.
                    </p>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    </div>
                ) : (
                    <>
                        {/* ── Briefing ───────────────────────────────────── */}
                        {briefing && (
                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">{derniereLabel ? `${derniereLabel}, tu as fait` : "Ta dernière journée"}</p>
                                    {briefing.derniere ? (
                                        <p className="mt-1 text-white">
                                            <span className="text-3xl font-black tabular-nums">{briefing.derniere.actes}</span>
                                            <span className="ml-1 text-sm font-bold text-white/50">actes</span>
                                            {briefing.derniere.cagnotte > 0 && <span className="ml-3 text-sm font-black text-emerald-300">+{fmtEuro(briefing.derniere.cagnotte)}</span>}
                                        </p>
                                    ) : <p className="mt-1 text-sm text-white/50">Pas de vente sur les 7 derniers jours.</p>}
                                </div>

                                <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Classement du mois</p>
                                    <p className="mt-1 text-white">
                                        <span className="text-3xl font-black tabular-nums">{briefing.rang > 0 ? `#${briefing.rang}` : "–"}</span>
                                        {briefing.effectif > 0 && <span className="ml-1 text-sm font-bold text-white/50">sur {briefing.effectif}</span>}
                                        {briefing.rang === 1 && <span className="ml-2 text-sm">👑</span>}
                                    </p>
                                </div>

                                {defi ? (
                                    <div className="sm:col-span-2">
                                        <DefiJourChoix defi={defi} onChange={setDefi} />
                                    </div>
                                ) : (
                                <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10 sm:col-span-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">🎯 Tes objectifs du jour</p>
                                    {briefing.objectifsJour.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {briefing.objectifsJour.map((o) => (
                                                <span key={o.code} className="rounded-xl bg-violet-500/15 px-3 py-1.5 text-sm font-black text-violet-100 ring-1 ring-violet-400/25">
                                                    <span aria-hidden="true">{emojiDe(o.code)}</span> {o.objectif} {o.produit}
                                                </span>
                                            ))}
                                        </div>
                                    ) : <p className="mt-1 text-sm text-white/50">{briefing.travaille ? "Pas d'objectif fixé aujourd'hui." : "Profite de ta journée 🌴"}</p>}
                                </div>
                                )}

                                {briefing.boxUrgentes && (
                                    <div className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-400/25 sm:col-span-2">
                                        <p className="text-sm font-black text-rose-100">
                                            📦 {briefing.boxUrgentes.nb} box à raccorder avant le {briefing.boxUrgentes.limite.toLocaleDateString("fr-FR")}
                                            <span className="ml-2 rounded-lg bg-rose-500/25 px-2 py-0.5 text-xs">J-{briefing.boxUrgentes.jours}</span>
                                        </p>
                                        <p className="text-xs text-rose-200/70">Sinon elles ne seront pas payées. À vérifier dans Ma variable → Mes box.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Vérification des chiffres du mois ──────────── */}
                        <div className="mt-7 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-black text-white">Tes chiffres du mois sont-ils justes ?</p>
                                <p className="text-xs text-white/40">Corrige seulement si besoin — rien n&apos;est supprimé.</p>
                            </div>
                            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                {items.map((it, i) => {
                                    const ecart = it.valeur - (originaux[i]?.valeur ?? 0);
                                    return (
                                        <li key={it.code} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${ecart !== 0 ? "bg-amber-400/10 ring-1 ring-amber-300/30" : "bg-white/[0.03]"}`}>
                                            <span className="w-5 text-center" aria-hidden="true">{emojiDe(it.code)}</span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/80">{it.produit}</span>
                                            {ecart !== 0 && <span className="text-[11px] font-black text-amber-300">{ecart > 0 ? `+${ecart}` : ecart}</span>}
                                            <button onClick={() => ajuster(it.code, -1)} aria-label={`Retirer 1 ${it.produit}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">−</button>
                                            <span className="w-8 text-center text-lg font-black tabular-nums text-white">{it.valeur}</span>
                                            <button onClick={() => ajuster(it.code, +1)} aria-label={`Ajouter 1 ${it.produit}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">+</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* ── Démarrer ───────────────────────────────────── */}
                        <button
                            onClick={demarrer}
                            disabled={enregistrement}
                            className="group mt-6 flex w-full items-center justify-between rounded-[20px] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-left shadow-[0_12px_40px_rgba(124,58,237,.45)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                        >
                            <span>
                                <span className="block text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                                    {modifies > 0 ? `${modifies} correction${modifies > 1 ? "s" : ""} à enregistrer` : "Tout est bon"}
                                </span>
                                <span className="mt-0.5 block text-xl font-black text-white">
                                    {enregistrement ? "Enregistrement…" : modifies > 0 ? "Enregistrer et démarrer" : "Je démarre ma journée"}
                                </span>
                            </span>
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover:translate-x-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
