"use client";

import { useEffect, useId, useRef, useState } from "react";
import ChoixActeModal, { ChoixActe } from "@/components/dashboard/ChoixActeModal";

type BoostInfo = { label: string; montant: number };

/** Question de rebond posée juste après une vente/un choix. Une seule option → "Oui" applique
 *  directement ce montant. Plusieurs options → "Oui" ouvre un petit choix (ex. quelle option
 *  Canal+, quel boost constructeur) avant d'appliquer l'acte choisi. */
export type QuestionCrossSell = {
    id: string;
    emoji: string;
    question: string;
    options: ChoixActe[];
};

type Props = {
    titre: string;
    realise: number;
    objectif: number;
    couleur: string; // ex. "bg-green-500"
    onSale: (produit: string) => void | Promise<void>;
    sousChoix?: ChoixActe[];
    acteDirect?: ChoixActe;
    onChoixVariable?: (option: ChoixActe) => void | Promise<void | BoostInfo | undefined>;
    /** Après le choix du modèle (Box/Forfait), propose "T'as fait une 4P ?" */
    demanderCrossSell4P?: boolean;
    montantCrossSell4P?: number;
    onCrossSell4P?: () => void | Promise<void>;
    /** Questions de rebond supplémentaires selon l'acte réalisé (ex. assurance essentielle après
     *  un forfait, Canal+ après une box Ultra, boost constructeur après un téléphone). Recalculées
     *  à chaque vente à partir du choix réellement fait. */
    questionsCrossSellPour?: (choix?: ChoixActe) => QuestionCrossSell[];
    /** Affiche le bandeau boost — appelé après toutes les questions de rebond, sinon immédiatement. */
    onBoostReady?: (info?: BoostInfo) => void;
    /** true si c'est le dernier jour travaillé de la semaine figée — le reste de la semaine
     *  se concentre alors entièrement sur aujourd'hui (pas de lissage avec le jour suivant,
     *  qui appartient à une semaine figée différente). */
    dernierJourSemaine?: boolean;
    /** Carte réduite (variante Accueil "layout=v2") : même parcours de vente, affichage dense. */
    compact?: boolean;
    /** Affichage en anneau (Accueil) : pas de bouton, la vente est lancée depuis la carte
     *  « Déclarer une vente » via le déclencheur enregistré ci-dessous. Même parcours de vente. */
    anneau?: boolean;
    emoji?: string;
    /** Reçoit la fonction qui lance la vente de cette carte (comme un clic sur « +1 »). */
    onDeclencheur?: (lancer: (() => void) | null) => void;
    /** Anneau dans une tuile sombre (Accueil) avec un bouton « +1 » coloré qui ajoute / retire
     *  le produit de la vente en cours (validée par la barre du bas). Sans onBasculer : pas de bouton
     *  (produit déclaré seulement via une vente combo). */
    tuile?: { choisi: boolean; onBasculer?: () => void; libelle: string };
};

// Mapping couleur Tailwind → hex (pour le SVG arc) + gradient (pour la barre/bouton)
const PALETTE: Record<string, { hex: string; arcStroke: string; gradient: string; glow: string }> = {
    "bg-green-500":  { hex: "#10b981", arcStroke: "#34d399", gradient: "from-green-500 to-emerald-400",  glow: "rgba(16,185,129,.35)" },
    "bg-blue-500":   { hex: "#3b82f6", arcStroke: "#60a5fa", gradient: "from-blue-500 to-cyan-400",      glow: "rgba(59,130,246,.35)" },
    "bg-purple-500": { hex: "#8b5cf6", arcStroke: "#a78bfa", gradient: "from-purple-500 to-violet-400",  glow: "rgba(139,92,246,.35)" },
    "bg-orange-500": { hex: "#f97316", arcStroke: "#fb923c", gradient: "from-orange-500 to-amber-400",   glow: "rgba(249,115,22,.35)" },
    "bg-sky-500":    { hex: "#0ea5e9", arcStroke: "#38bdf8", gradient: "from-sky-500 to-cyan-400",       glow: "rgba(14,165,233,.35)" },
    "bg-yellow-500": { hex: "#eab308", arcStroke: "#facc15", gradient: "from-yellow-500 to-amber-400",   glow: "rgba(234,179,8,.35)"  },
    "bg-red-500":    { hex: "#ef4444", arcStroke: "#f87171", gradient: "from-red-500 to-rose-400",       glow: "rgba(239,68,68,.35)"  },
    "bg-teal-500":   { hex: "#14b8a6", arcStroke: "#2dd4bf", gradient: "from-teal-500 to-emerald-400",   glow: "rgba(20,184,166,.35)" },
    "bg-amber-500":  { hex: "#f59e0b", arcStroke: "#fbbf24", gradient: "from-amber-500 to-orange-400",   glow: "rgba(245,158,11,.35)" },
    "bg-rose-500":   { hex: "#f43f5e", arcStroke: "#fb7185", gradient: "from-rose-500 to-pink-400",      glow: "rgba(244,63,94,.35)"  },
    "bg-indigo-500": { hex: "#6366f1", arcStroke: "#818cf8", gradient: "from-indigo-500 to-violet-400",  glow: "rgba(99,102,241,.35)" },
};
const DEFAULT_PAL = { hex: "#8b5cf6", arcStroke: "#a78bfa", gradient: "from-violet-500 to-purple-400", glow: "rgba(139,92,246,.35)" };

const articlesMap: Record<string, string> = {
    box: "une", forfait: "un", forfaits: "un",
    "téléphone": "un", "téléphones": "un", telephone: "un", telephones: "un",
    mcafee: "un", assurance: "une",
};
function getArticle(t: string) { return articlesMap[t.toLowerCase()] ?? "un(e)"; }

// Affichage au singulier — la logique interne continue d'utiliser le titre d'origine.
const SINGULIER: Record<string, string> = { "Téléphones": "Téléphone", "Forfaits": "Forfait" };
function getDisplayTitre(t: string) { return SINGULIER[t] ?? t; }

const CELEBRATIONS = ["🎉", "🔥", "⚡", "🚀", "💪", "🏆"];

// Uniquement des messages neutres/encourageants — le retard est déjà géré par le hero/coach au-dessus.
type StatusCfg = { icon: string; label: string; color: string };
function getStatus(pct: number, realise: number, objectif: number, isHistorisation: boolean, isAvisGoogle: boolean, isRecapCo: boolean): StatusCfg {
    if (realise === 0 && isHistorisation) return { icon: "🌱", label: "N'oublie pas d'historiser !", color: "#94a3b8" };
    if (realise === 0 && isAvisGoogle) return { icon: "🌱", label: "Pas encore d'avis Google aujourd'hui", color: "#94a3b8" };
    if (realise === 0 && isRecapCo) return { icon: "🌱", label: "Pas encore de Récap Co aujourd'hui", color: "#94a3b8" };
    if (realise === 0) return { icon: "🌱", label: "En attente de ta première vente", color: "#94a3b8" };
    // Pas d'objectif fixé : chaque vente est une avance pure, pas un "démarrage"
    if (objectif === 0) return { icon: "🚀", label: `+${realise} d'avance sur l'objectif`, color: "#34d399" };
    if (pct >= 100)     return { icon: "🏆", label: "Objectif atteint !",  color: "#34d399" };
    if (pct >= 80)      return { icon: "🔥", label: "Excellent rythme",   color: "#fb923c" };
    if (pct >= 60)      return { icon: "⚡", label: "Très bon rythme",    color: "#fbbf24" };
    if (pct >= 40)      return { icon: "💪", label: "Continue comme ça",  color: "#60a5fa" };
    return                 { icon: "🌟", label: "Bon démarrage, continue !", color: "#60a5fa" };
}

// Cercle arc SVG
function ArcProgress({ pct, stroke }: { pct: number; stroke: string }) {
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(pct, 100) / 100);
    return (
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5.5" />
            <circle
                cx="36" cy="36" r={r}
                fill="none"
                stroke={stroke}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
            />
        </svg>
    );
}

type Particle = { id: number; angle: number; dist: number; color: string; size: number; delay: number; };
const P_COLORS = ["#fbbf24","#34d399","#60a5fa","#a78bfa","#f87171","#fb923c","#f472b6","#4ade80"];
function genParticles(): Particle[] {
    return Array.from({ length: 16 }, (_, i) => ({
        id: i,
        angle: (i / 16) * 360 + (Math.random() - .5) * 18,
        dist: 55 + Math.random() * 75,
        color: P_COLORS[i % P_COLORS.length],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.08,
    }));
}

export default function MissionCard({
    titre, realise, objectif, couleur, onSale, sousChoix, acteDirect, onChoixVariable,
    demanderCrossSell4P, montantCrossSell4P, onCrossSell4P, questionsCrossSellPour, onBoostReady, dernierJourSemaine,
    compact = false, anneau = false, emoji, onDeclencheur, tuile,
}: Props) {
    const [celebrating, setCelebrating] = useState(false);
    const [celebEmoji, setCelebEmoji] = useState("🎉");
    const [particles,  setParticles]  = useState<Particle[]>([]);
    const [modalOuverte, setModalOuverte] = useState(false);
    const [question4POuverte, setQuestion4POuverte] = useState(false);
    const [envoi4PEnCours, setEnvoi4PEnCours] = useState(false);
    const [queueQuestions, setQueueQuestions] = useState<QuestionCrossSell[]>([]);
    const [questionActive, setQuestionActive] = useState<QuestionCrossSell | null>(null);
    const [pickerOuvert, setPickerOuvert] = useState(false);
    const [envoiCrossSellEnCours, setEnvoiCrossSellEnCours] = useState(false);
    const [commentaireBoxChoix, setCommentaireBoxChoix] = useState<ChoixActe | null>(null);
    const [commentaireBoxTexte, setCommentaireBoxTexte] = useState("");
    const boostEnAttenteRef = useRef<BoostInfo | undefined>(undefined);
    const idOr = `anneau-or-${useId().replace(/:/g, "")}`;

    const pal   = PALETTE[couleur] ?? DEFAULT_PAL;
    const pct   = objectif > 0 ? Math.min(Math.round((realise / objectif) * 100), 100) : 0;
    const article = getArticle(titre);
    const displayTitre = getDisplayTitre(titre);
    const isHistorisation = titre.toLowerCase() === "spiderhome";
    const isAvisGoogle = titre.toLowerCase() === "avis google";
    const isRecapCo = titre.toLowerCase() === "récap co";
    const isBox = titre.toLowerCase() === "box";
    // Simples clics d'enregistrement (pas une vente) : pas de célébration, juste le compteur qui bouge.
    const sansAnimation = isHistorisation || isAvisGoogle || isRecapCo;
    const status = getStatus(pct, realise, objectif, isHistorisation, isAvisGoogle, isRecapCo);

    // Mode compact : info actionnable plutôt qu'encouragement générique. Sans objectif du jour
    // (objectif 0), chaque vente est de l'avance : la jauge est pleine, pas à 0 %.
    const atteint = objectif > 0 ? realise >= objectif : realise > 0;
    // Barre plafonnée à 100 %, mais le badge affiche le vrai taux d'atteinte (5/4 → 125 %).
    const pctCompact = objectif > 0 ? pct : realise > 0 ? 100 : 0;
    const tauxAtteinte = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
    const statutCompact =
        objectif === 0 && realise === 0 ? "Pas d'objectif aujourd'hui"
        : objectif === 0 ? `+${realise} d'avance`
        : realise >= objectif ? (realise > objectif ? `✓ Objectif atteint · +${realise - objectif}` : "✓ Objectif atteint")
        : `Encore ${objectif - realise}`;
    const libelleCompact = isHistorisation ? "historisation" : isAvisGoogle ? "avis" : isRecapCo ? "Récap Co" : "vente";

    // La vente doit être committée avant le choix variable : le boost auto compte le volume
    // réel du mois, il a donc besoin que CETTE vente soit déjà en base au moment du comptage.
    async function declencherVente(choix?: ChoixActe) {
        setCelebrating(true);
        if (!sansAnimation) {
            setCelebEmoji(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]);
            setParticles(genParticles());
        }
        let boostInfo: BoostInfo | undefined;
        await onSale(titre);
        if (choix) boostInfo = (await onChoixVariable?.(choix)) || undefined;
        if (sansAnimation) {
            setCelebrating(false);
        } else {
            setTimeout(() => setParticles([]), 750);
            setTimeout(() => setCelebrating(false), 1600);
        }
        boostEnAttenteRef.current = boostInfo;

        // Questions de rebond (assurance essentielle, Canal+, boost constructeur...) calculées
        // à partir du choix réellement fait — uniquement après un choix de modèle/acte, pas sur
        // les cartes sans choix (ex. historisation Spiderhome).
        const questions = choix ? (questionsCrossSellPour?.(choix) ?? []) : [];

        // Le bandeau boost est différé après toutes les questions pour ne pas se superposer.
        if (choix && demanderCrossSell4P) {
            setQueueQuestions(questions);
            setQuestion4POuverte(true);
        } else {
            avancerQuestions(questions);
        }
    }

    function avancerQuestions(queue: QuestionCrossSell[]) {
        if (queue.length === 0) {
            onBoostReady?.(boostEnAttenteRef.current);
            boostEnAttenteRef.current = undefined;
            return;
        }
        const [prochaine, ...reste] = queue;
        setQueueQuestions(reste);
        setQuestionActive(prochaine);
    }

    function handleSale() {
        if (celebrating) return;
        if (sousChoix && sousChoix.length > 0) {
            setModalOuverte(true);
            return;
        }
        declencherVente(acteDirect);
    }

    // Toujours la dernière version de handleSale (elle lit l'état courant de la carte).
    const handleSaleRef = useRef(handleSale);
    useEffect(() => { handleSaleRef.current = handleSale; });
    useEffect(() => {
        onDeclencheur?.(() => handleSaleRef.current());
        return () => onDeclencheur?.(null);
    }, [onDeclencheur]);

    function handleChoix(choix: ChoixActe) {
        setModalOuverte(false);
        // Box : une étape de commentaire s'intercale avant de déclencher la vente, pour que le
        // conseiller n'ait pas besoin de revenir sur "Mes box" ensuite pour le renseigner.
        if (isBox) {
            setCommentaireBoxChoix(choix);
        } else {
            declencherVente(choix);
        }
    }

    function validerCommentaireBox() {
        const choix = commentaireBoxChoix;
        if (!choix) return;
        const commentaire = commentaireBoxTexte.trim();
        setCommentaireBoxChoix(null);
        setCommentaireBoxTexte("");
        declencherVente(commentaire ? { ...choix, commentaire } : choix);
    }

    async function handleReponse4P(oui: boolean) {
        if (oui) {
            setEnvoi4PEnCours(true);
            try {
                await onCrossSell4P?.();
            } finally {
                setEnvoi4PEnCours(false);
            }
        }
        setQuestion4POuverte(false);
        avancerQuestions(queueQuestions);
    }

    async function handleReponseCrossSell(oui: boolean) {
        if (!questionActive) return;
        if (!oui) {
            setQuestionActive(null);
            avancerQuestions(queueQuestions);
            return;
        }
        if (questionActive.options.length === 1) {
            setEnvoiCrossSellEnCours(true);
            try {
                await onChoixVariable?.(questionActive.options[0]);
            } finally {
                setEnvoiCrossSellEnCours(false);
            }
            setQuestionActive(null);
            avancerQuestions(queueQuestions);
        } else {
            setPickerOuvert(true);
        }
    }

    async function handlePickerCrossSell(choix: ChoixActe) {
        setPickerOuvert(false);
        setEnvoiCrossSellEnCours(true);
        try {
            await onChoixVariable?.(choix);
        } finally {
            setEnvoiCrossSellEnCours(false);
        }
        setQuestionActive(null);
        avancerQuestions(queueQuestions);
    }

    function fermerPickerSansChoix() {
        setPickerOuvert(false);
        setQuestionActive(null);
        avancerQuestions(queueQuestions);
    }

    const modales = (
        <>
            {modalOuverte && sousChoix && (
                <ChoixActeModal
                    titre={`J'ai vendu ${article} ${displayTitre}`}
                    options={sousChoix}
                    onChoisir={handleChoix}
                    onClose={() => setModalOuverte(false)}
                />
            )}

            {commentaireBoxChoix && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={validerCommentaireBox}
                >
                    <div
                        className="mx-4 w-full max-w-xs rounded-[28px] bg-slate-900 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-4xl">📝</p>
                        <p className="mt-3 text-lg font-black text-white">Un commentaire pour cette box ?</p>
                        <p className="mt-1 text-xs text-white/40">Identifiant client, RDV technicien... (optionnel)</p>
                        <input
                            autoFocus
                            value={commentaireBoxTexte}
                            onChange={(e) => setCommentaireBoxTexte(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && validerCommentaireBox()}
                            placeholder="Commentaire"
                            className="mt-4 h-11 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none focus:border-violet-400"
                        />
                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={validerCommentaireBox}
                                className="flex-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 py-3 text-sm font-black text-white transition-all hover:opacity-90"
                            >
                                {commentaireBoxTexte.trim() ? "Valider" : "Passer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {question4POuverte && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => !envoi4PEnCours && handleReponse4P(false)}
                >
                    <div
                        className="mx-4 w-full max-w-xs rounded-[28px] bg-slate-900 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-4xl">🔀</p>
                        <p className="mt-3 text-lg font-black text-white">T'as fait une 4P ?</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => handleReponse4P(false)}
                                disabled={envoi4PEnCours}
                                className="flex-1 rounded-2xl border-2 border-white/15 py-3 text-sm font-bold text-white/60 transition-all hover:bg-white/5 disabled:opacity-50"
                            >
                                Non
                            </button>
                            <button
                                onClick={() => handleReponse4P(true)}
                                disabled={envoi4PEnCours}
                                className="flex-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 py-3 text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
                            >
                                {envoi4PEnCours ? "…" : `Oui +${(montantCrossSell4P ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {questionActive && !pickerOuvert && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => !envoiCrossSellEnCours && handleReponseCrossSell(false)}
                >
                    <div
                        className="mx-4 w-full max-w-xs rounded-[28px] bg-slate-900 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-4xl">{questionActive.emoji}</p>
                        <p className="mt-3 text-lg font-black text-white">{questionActive.question}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => handleReponseCrossSell(false)}
                                disabled={envoiCrossSellEnCours}
                                className="flex-1 rounded-2xl border-2 border-white/15 py-3 text-sm font-bold text-white/60 transition-all hover:bg-white/5 disabled:opacity-50"
                            >
                                Non
                            </button>
                            <button
                                onClick={() => handleReponseCrossSell(true)}
                                disabled={envoiCrossSellEnCours}
                                className="flex-1 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 py-3 text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
                            >
                                {envoiCrossSellEnCours
                                    ? "…"
                                    : questionActive.options.length === 1
                                    ? `Oui +${(questionActive.options[0].montant ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`
                                    : "Oui →"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {questionActive && pickerOuvert && (
                <ChoixActeModal
                    titre={questionActive.question}
                    options={questionActive.options}
                    onChoisir={handlePickerCrossSell}
                    onClose={fermerPickerSansChoix}
                    layout="tableau"
                />
            )}
        </>
    );
    const styleAnim = (
            <style>{`
                @keyframes bounceUp {
                    0%   { transform: scale(.4) translateY(20px); opacity: 0; }
                    60%  { transform: scale(1.2) translateY(-4px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes particleBurst {
                    0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2); opacity: 0; }
                }
            `}</style>
    );

    if (anneau) {
        const R = 34;
        const C = 2 * Math.PI * R;
        const pctAnneau = objectif > 0 ? pct : realise > 0 ? 100 : 0;
        // Couleurs unifiées : bleu en cours, vert atteint, or scintillant dépassé.
        const depasse = realise > objectif;
        const etatAnneau = depasse ? "depasse" : atteint ? "atteint" : "en_cours";
        const traitAnneau = depasse ? `url(#${idOr})` : atteint ? "#10b981" : "#3b82f6";
        const sousTexte = objectif === 0 && realise === 0
            ? "Pas d’objectif"
            : depasse ? `+${realise - objectif} au-dessus` : atteint ? "✓ Atteint" : `Encore ${objectif - realise}`;
        return (
            <div
                className={tuile
                    ? `tuile-objectif relative flex flex-col overflow-hidden rounded-[22px] bg-slate-900 p-3.5 text-left transition-shadow`
                    : "relative flex flex-col items-center text-center"}
                style={tuile ? { boxShadow: `${tuile.choisi ? `0 0 0 3px ${pal.hex}, 0 0 24px ${pal.glow}, ` : ""}0 12px 28px rgba(15,23,42,.18)` } : undefined}
            >
                {tuile && <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ background: `${pal.hex}55` }} />}
                <div className={tuile ? "relative flex items-center gap-3" : "contents"}>
                <div className={`relative ${tuile ? "h-[72px] w-[72px] shrink-0" : "h-[84px] w-[84px]"} ${depasse ? "anneau-or" : ""}`} data-etat={etatAnneau}>
                    <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
                        <defs>
                            <linearGradient id={idOr} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#b45309" />
                                <stop offset="35%" stopColor="#fbbf24" />
                                <stop offset="50%" stopColor="#fef3c7">
                                    <animate attributeName="offset" values="0.1;0.9;0.1" dur="2.4s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="65%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#b45309" />
                            </linearGradient>
                        </defs>
                        <circle cx="42" cy="42" r={R} fill="none" strokeWidth="8" className={tuile ? "" : "anneau-piste stroke-slate-100"} stroke={tuile ? "rgba(255,255,255,.14)" : undefined} />
                        <circle
                            cx="42" cy="42" r={R} fill="none" stroke={traitAnneau} strokeWidth="8"
                            strokeLinecap={pctAnneau > 0 ? "round" : "butt"}
                            strokeDasharray={C}
                            strokeDashoffset={C * (1 - pctAnneau / 100)}
                            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1), stroke .4s" }}
                        />
                    </svg>
                    <span className="absolute inset-0 flex flex-col items-center justify-center">
                        {emoji && <span className="text-xl leading-none">{emoji}</span>}
                        <span className={`mt-0.5 text-sm font-black tabular-nums ${tuile ? "text-white" : "text-slate-900"}`}>
                            {realise}<span className={`text-[11px] ${tuile ? "text-white/50" : "text-slate-400"}`}>/{objectif}</span>
                        </span>
                    </span>
                    {depasse ? (
                        <span className={`absolute -right-0.5 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs text-white ring-2 ${tuile ? "ring-slate-900" : "ring-white"}`}>★</span>
                    ) : atteint && (
                        <span className={`absolute -right-0.5 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white ring-2 ${tuile ? "ring-slate-900" : "ring-white"}`}>✓</span>
                    )}
                    {depasse && (
                        <>
                            <span className="anneau-etincelle pointer-events-none absolute -left-1 top-3 text-[10px] text-amber-400">✦</span>
                            <span className="anneau-etincelle pointer-events-none absolute -bottom-0.5 right-2 text-xs text-amber-400" style={{ animationDelay: ".8s" }}>✦</span>
                            <span className="anneau-etincelle pointer-events-none absolute right-0 top-9 text-[8px] text-amber-300" style={{ animationDelay: "1.5s" }}>✦</span>
                        </>
                    )}
                    {celebrating && !sansAnimation && (
                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                            <span className="absolute h-24 w-24 animate-ping rounded-full" style={{ background: `${traitAnneau.startsWith("#") ? traitAnneau : "#f59e0b"}30` }} />
                            <span className="relative text-4xl" style={{ animation: "bounceUp .35s ease" }}>{celebEmoji}</span>
                        </span>
                    )}
                    {particles.map((p) => (
                        <span
                            key={p.id}
                            className="pointer-events-none absolute z-20 rounded-full"
                            style={{
                                width: p.size, height: p.size, background: p.color, top: "50%", left: "50%",
                                ["--tx" as string]: `${Math.cos(p.angle * Math.PI / 180) * p.dist * 0.6}px`,
                                ["--ty" as string]: `${Math.sin(p.angle * Math.PI / 180) * p.dist * 0.6}px`,
                                animation: `particleBurst 0.65s ease-out ${p.delay}s forwards`,
                            }}
                        />
                    ))}
                </div>
                {tuile ? (
                    <div className="min-w-0">
                        <p className="text-sm font-black leading-tight text-white">{displayTitre}</p>
                        <p className={`mt-0.5 text-[11px] font-bold ${depasse ? "text-amber-300" : atteint ? "text-emerald-300" : "text-white/50"}`}>{sousTexte}</p>
                    </div>
                ) : (<>
                    <p className="mt-1.5 text-xs font-black text-slate-800">{displayTitre}</p>
                    <p className={`text-[11px] font-bold ${depasse ? "text-amber-600" : atteint ? "text-emerald-600" : "text-slate-400"}`}>{sousTexte}</p>
                </>)}
                </div>
                {tuile && (tuile.onBasculer ? (
                    <button
                        type="button"
                        aria-pressed={tuile.choisi}
                        onClick={tuile.onBasculer}
                        className={`relative mt-3 w-full rounded-xl bg-gradient-to-r ${pal.gradient} py-3 text-sm font-black text-white transition-all active:scale-[0.96]`}
                        style={{ boxShadow: `0 4px 16px ${pal.glow}` }}
                    >
                        {tuile.choisi ? "✓ Ajouté" : tuile.libelle}
                    </button>
                ) : (
                    <p className="relative mt-3 rounded-xl bg-white/5 py-3 text-center text-[11px] font-bold text-white/40">{tuile.libelle}</p>
                ))}
                {modales}
                {styleAnim}
                <style>{`
                    .anneau-or { animation: anneauOr 2.4s ease-in-out infinite; border-radius: 9999px; }
                    @keyframes anneauOr {
                        0%,100% { filter: drop-shadow(0 0 2px rgba(245,158,11,.35)); }
                        50%     { filter: drop-shadow(0 0 9px rgba(251,191,36,.75)); }
                    }
                    .anneau-etincelle { animation: anneauEtincelle 2.2s ease-in-out infinite; opacity: 0; }
                    @keyframes anneauEtincelle {
                        0%,100% { opacity: 0; transform: scale(.4) rotate(0deg); }
                        40%     { opacity: 1; transform: scale(1.15) rotate(45deg); }
                        70%     { opacity: 0; transform: scale(.6) rotate(90deg); }
                    }
                    @media (prefers-reduced-motion: reduce) { .anneau-or, .anneau-etincelle { animation: none; opacity: 1; } }
                `}</style>
            </div>
        );
    }

    return (
        <section
            className={`relative overflow-hidden border border-white/6 bg-slate-900 transition-all duration-300 ${compact ? "rounded-[20px]" : "rounded-[28px] hover:-translate-y-1"}`}
            style={{
                boxShadow: celebrating && !sansAnimation
                    ? `0 20px 60px ${pal.glow}, 0 0 0 1px ${pal.hex}40`
                    : "0 16px 48px rgba(0,0,0,.40)",
            }}
        >
            {/* Tinte couleur produit en fond */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse at 110% -10%, ${pal.hex}28 0%, transparent 60%)`,
                }}
            />

            {/* Burst célébration */}
            {celebrating && !sansAnimation && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div
                        className="absolute h-32 w-32 rounded-full animate-ping"
                        style={{ background: `${pal.hex}20` }}
                    />
                    <span className="relative text-6xl" style={{ animation: "bounceUp .35s ease" }}>
                        {celebEmoji}
                    </span>
                </div>
            )}

            {/* Confetti particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="pointer-events-none absolute z-20 rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        top: "50%",
                        left: "50%",
                        ["--tx" as any]: `${Math.cos(p.angle * Math.PI / 180) * p.dist}px`,
                        ["--ty" as any]: `${Math.sin(p.angle * Math.PI / 180) * p.dist}px`,
                        animation: `particleBurst 0.65s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}

            {compact ? (
            <div className={`relative p-4 transition-opacity ${atteint ? "opacity-80" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-base font-black text-white">{displayTitre}</h2>
                    {/* Taux d'atteinte réel (5/4 = 125 %) ; sans objectif du jour, pas de % (voir statut). */}
                    {objectif > 0 && (
                        <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums"
                            style={{ background: `${pal.hex}26`, color: pal.arcStroke }}
                        >
                            {tauxAtteinte}%
                        </span>
                    )}
                </div>

                <div className="mt-3 flex items-end gap-1.5">
                    <span className="text-4xl font-black leading-none text-white tabular-nums">{realise}</span>
                    <span className="mb-0.5 text-sm font-semibold text-white/35">/ {objectif}</span>
                </div>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${pal.gradient} transition-all duration-700`}
                        style={{ width: `${pctCompact}%` }}
                    />
                </div>

                <p className={`mt-2 text-xs font-bold ${atteint ? "text-emerald-300" : "text-white/55"}`}>
                    {statutCompact}
                </p>

                <button
                    onClick={handleSale}
                    disabled={celebrating}
                    className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${pal.gradient} px-3 py-3 text-sm font-black text-white transition-all duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50`}
                    style={{ boxShadow: `0 4px 16px ${pal.glow}` }}
                >
                    <span className="text-base leading-none">+1</span>
                    <span className="truncate">{libelleCompact}</span>
                </button>
            </div>
            ) : (
            <div className="relative p-7">

                {/* ── Ligne haute : nom + arc ─── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                            Objectif du jour
                        </p>
                        <h2 className="mt-2 truncate text-2xl font-black text-white">
                            {displayTitre}
                        </h2>
                        {dernierJourSemaine && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black text-amber-300">
                                📅 Dernier jour de la semaine
                            </span>
                        )}
                    </div>

                    <div className="relative flex-shrink-0">
                        <ArcProgress pct={pct} stroke={pal.arcStroke} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-black text-white">{pct}%</span>
                        </div>
                    </div>
                </div>

                {/* ── Chiffre dominant ─── */}
                <div className="mt-7 flex items-end gap-2.5">
                    <span
                        className="text-[72px] font-black leading-none text-white tabular-nums"
                        style={{ lineHeight: 1 }}
                    >
                        {realise}
                    </span>
                    <span className="mb-2 text-lg font-semibold text-white/30">
                        / {objectif}
                    </span>
                </div>

                {/* ── Barre slim ─── */}
                <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-white/8">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${pal.gradient} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* ── Statut ─── */}
                <p
                    className="mt-3.5 text-sm font-semibold"
                    style={{ color: status.color }}
                >
                    {status.icon} {status.label}
                </p>

                {/* ── Message célébration ─── */}
                <div
                    className="overflow-hidden transition-all duration-400"
                    style={{
                        maxHeight: celebrating && !sansAnimation ? "56px" : "0px",
                        opacity: celebrating && !sansAnimation ? 1 : 0,
                        marginTop: celebrating && !sansAnimation ? "12px" : "0",
                    }}
                >
                    <div
                        className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
                        style={{ background: `${pal.hex}22`, border: `1px solid ${pal.hex}40` }}
                    >
                        ✅ {isHistorisation ? "Une historisation" : isAvisGoogle ? "Un avis Google" : isRecapCo ? "Un Récap Co" : `${article.charAt(0).toUpperCase() + article.slice(1)} ${displayTitre}`} de plus — excellent !
                    </div>
                </div>

                {/* ── Bouton ─── */}
                <button
                    onClick={handleSale}
                    disabled={celebrating}
                    className={`group mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${pal.gradient} px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50`}
                    style={{ boxShadow: `0 4px 20px ${pal.glow}` }}
                >
                    <span>{isHistorisation ? "J'ai fait une historisation" : isAvisGoogle ? "J'ai eu un avis Google" : isRecapCo ? "J'ai fait un Récap Co" : `J'ai vendu ${article} ${displayTitre}`}</span>
                    <svg
                        width="16" height="16"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="opacity-70 transition-transform duration-300 group-hover:translate-x-1"
                    >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>

            </div>
            )}

            {modales}

            {styleAnim}
        </section>
    );
}
