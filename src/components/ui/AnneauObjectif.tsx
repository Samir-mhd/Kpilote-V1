"use client";

import { useId } from "react";

/**
 * Anneau d'objectif — même code couleur que l'Accueil conseiller :
 * bleu en cours, vert atteint, or scintillant dépassé.
 * Purement visuel (aucune vente déclenchée), réutilisé côté manager et dans Mes objectifs.
 */
export type EtatAnneau = "en_cours" | "atteint" | "depasse" | "vide";

export function etatAnneau(realise: number, objectif: number): EtatAnneau {
    if (objectif <= 0) return realise > 0 ? "depasse" : "vide";
    if (realise > objectif) return "depasse";
    if (realise >= objectif) return "atteint";
    return "en_cours";
}

export default function AnneauObjectif({ realise, objectif, emoji, label, taille = 84, sousTexte = true, sombre = false }: {
    realise: number;
    objectif: number;
    emoji?: string;
    label?: string;
    taille?: number;
    /** Affiche « Encore N » / « ✓ Atteint » / « +N au-dessus » sous l'anneau. */
    sousTexte?: boolean;
    /** Fond sombre (bandeau) : piste et textes clairs. */
    sombre?: boolean;
}) {
    const idOr = `anneau-or-${useId().replace(/:/g, "")}`;
    const epais = Math.max(6, Math.round(taille / 10.5));
    const R = (taille - epais) / 2;
    const C = 2 * Math.PI * R;
    const etat = etatAnneau(realise, objectif);
    const part = objectif > 0 ? Math.min(1, realise / objectif) : realise > 0 ? 1 : 0;
    const trait = etat === "depasse" ? `url(#${idOr})` : etat === "atteint" ? "#10b981" : "#3b82f6";
    const grand = taille >= 70;

    return (
        <div className="relative flex flex-col items-center text-center">
            <div className={`relative ${etat === "depasse" ? "anneau-obj-or" : ""}`} style={{ width: taille, height: taille }} data-etat={etat}>
                <svg viewBox={`0 0 ${taille} ${taille}`} className="-rotate-90" style={{ width: taille, height: taille }}>
                    {etat === "depasse" && (
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
                    )}
                    <circle cx={taille / 2} cy={taille / 2} r={R} fill="none" strokeWidth={epais}
                        className={sombre ? "" : "anneau-piste stroke-slate-100"} stroke={sombre ? "rgba(255,255,255,.12)" : undefined} />
                    <circle
                        cx={taille / 2} cy={taille / 2} r={R} fill="none" stroke={trait} strokeWidth={epais}
                        strokeLinecap={part > 0 ? "round" : "butt"}
                        strokeDasharray={C}
                        strokeDashoffset={C * (1 - part)}
                        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1), stroke .4s" }}
                    />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                    {emoji && grand && <span className="leading-none" style={{ fontSize: Math.round(taille / 4.2) }}>{emoji}</span>}
                    <span className={`mt-0.5 font-black tabular-nums ${sombre ? "text-white" : "text-slate-900"} ${grand ? "text-sm" : "text-xs"}`}>
                        {realise}<span className={`${grand ? "text-[11px]" : "text-[10px]"} ${sombre ? "text-white/50" : "text-slate-400"}`}>/{objectif}</span>
                    </span>
                </span>
                {etat === "depasse" ? (
                    <span className={`absolute -right-0.5 top-0 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white ring-2 ${sombre ? "ring-slate-900" : "ring-white"} ${grand ? "h-6 w-6 text-xs" : "h-4 w-4 text-[9px]"}`}>★</span>
                ) : etat === "atteint" && (
                    <span className={`absolute -right-0.5 top-0 flex items-center justify-center rounded-full bg-emerald-500 font-black text-white ring-2 ${sombre ? "ring-slate-900" : "ring-white"} ${grand ? "h-6 w-6 text-xs" : "h-4 w-4 text-[9px]"}`}>✓</span>
                )}
                {etat === "depasse" && grand && (
                    <>
                        <span className="anneau-obj-etincelle pointer-events-none absolute -left-1 top-3 text-[10px] text-amber-400">✦</span>
                        <span className="anneau-obj-etincelle pointer-events-none absolute -bottom-0.5 right-2 text-xs text-amber-400" style={{ animationDelay: ".8s" }}>✦</span>
                        <span className="anneau-obj-etincelle pointer-events-none absolute right-0 top-9 text-[8px] text-amber-300" style={{ animationDelay: "1.5s" }}>✦</span>
                    </>
                )}
            </div>
            {label && <p className={`mt-1.5 text-xs font-black ${sombre ? "text-white" : "text-slate-800"}`}>{label}</p>}
            {sousTexte && (
                <p className={`text-[11px] font-bold ${etat === "depasse" ? "text-amber-600" : etat === "atteint" ? "text-emerald-600" : sombre ? "text-white/50" : "text-slate-400"}`}>
                    {etat === "vide" ? "Pas d’objectif"
                        : etat === "depasse" ? (objectif > 0 ? `+${realise - objectif} au-dessus` : "Bonus")
                        : etat === "atteint" ? "✓ Atteint"
                        : `Encore ${objectif - realise}`}
                </p>
            )}
            <style>{`
                .anneau-obj-or { animation: anneauObjOr 2.4s ease-in-out infinite; border-radius: 9999px; }
                @keyframes anneauObjOr { 0%,100% { filter: drop-shadow(0 0 2px rgba(245,158,11,.35)); } 50% { filter: drop-shadow(0 0 9px rgba(251,191,36,.75)); } }
                .anneau-obj-etincelle { animation: anneauObjEtincelle 2.2s ease-in-out infinite; opacity: 0; }
                @keyframes anneauObjEtincelle { 0%,100% { opacity: 0; transform: scale(.4) rotate(0deg); } 40% { opacity: 1; transform: scale(1.15) rotate(45deg); } 70% { opacity: 0; transform: scale(.6) rotate(90deg); } }
                @media (prefers-reduced-motion: reduce) { .anneau-obj-or, .anneau-obj-etincelle { animation: none; opacity: 1; } }
            `}</style>
        </div>
    );
}
