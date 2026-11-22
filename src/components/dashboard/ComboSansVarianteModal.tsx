"use client";

import { useState } from "react";

/** Forfaits, téléphones et assurances : nombre (plusieurs lignes pour un même client) ;
 *  les autres produits : présent ou non. */
export type ComboSansVarianteSelection = {
    box: boolean;
    forfait: number;
    telephone: number;
    mcafee: boolean;
    mcafeeMobile: boolean;
    assurance: number;
    canal: boolean;
};

const SELECTION_VIDE: ComboSansVarianteSelection = {
    box: false, forfait: 0, telephone: 0, mcafee: false, mcafeeMobile: false, assurance: 0, canal: false,
};

type Cle = keyof ComboSansVarianteSelection;
const ITEMS: { cle: Cle; label: string; emoji: string }[] = [
    { cle: "box", label: "Box", emoji: "💻" },
    { cle: "forfait", label: "Forfait", emoji: "📶" },
    { cle: "telephone", label: "Téléphone", emoji: "📲" },
    { cle: "mcafee", label: "McAfee", emoji: "🛡️" },
    { cle: "mcafeeMobile", label: "McAfee Mobile", emoji: "🔐" },
    { cle: "assurance", label: "Assurance", emoji: "🛟" },
    { cle: "canal", label: "Canal+", emoji: "📺" },
];
const COMPTES: Cle[] = ["forfait", "telephone", "assurance"];

type Props = {
    onClose: () => void;
    onValider: (selection: ComboSansVarianteSelection) => Promise<void>;
    /** Items à ne pas proposer (ex. Assurance pour un conseiller qui n'en vend pas). */
    masquer?: Cle[];
    /** Items déjà cochés à l'ouverture (actes choisis depuis « Déclarer une vente »). */
    preselection?: Partial<ComboSansVarianteSelection>;
};

export default function ComboSansVarianteModal({ onClose, onValider, masquer = [], preselection }: Props) {
    const [s, setS] = useState<ComboSansVarianteSelection>({ ...SELECTION_VIDE, ...preselection });
    const [enCours, setEnCours] = useState(false);
    const items = ITEMS.filter((i) => !masquer.includes(i.cle));

    const rienSelectionne = !Object.values(s).some((v) => (typeof v === "number" ? v > 0 : v));

    async function valider() {
        if (rienSelectionne || enCours) return;
        setEnCours(true);
        try {
            await onValider(s);
            onClose();
        } finally {
            setEnCours(false);
        }
    }

    const nb = (cle: Cle) => (typeof s[cle] === "number" ? (s[cle] as number) : s[cle] ? 1 : 0);
    const basculer = (cle: Cle) => setS((p) => ({ ...p, [cle]: COMPTES.includes(cle) ? ((p[cle] as number) > 0 ? 0 : 1) : !p[cle] }));
    const regler = (cle: Cle, n: number) => setS((p) => ({ ...p, [cle]: Math.max(0, Math.min(20, n)) }));

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
            <div
                className="w-full max-w-sm rounded-t-[28px] bg-slate-900 p-6 shadow-[0_-20px_60px_rgba(0,0,0,.5)] sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">🎁 Vente combo</h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">✕</button>
                </div>
                <p className="mb-5 text-xs text-white/40">Coche tout ce qui fait partie de cette même vente — plusieurs lignes possibles pour les forfaits, téléphones et assurances.</p>

                <div className="space-y-2">
                    {items.map((item) => {
                        const n = nb(item.cle);
                        const actif = n > 0;
                        const compte = COMPTES.includes(item.cle);
                        return (
                            <div
                                key={item.cle}
                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 transition-all ${
                                    actif ? "bg-amber-500 text-white" : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                            >
                                <button type="button" onClick={() => basculer(item.cle)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                                    <span className="text-xl">{item.emoji}</span>
                                    <span className="font-bold">{item.label}</span>
                                </button>
                                {compte && actif ? (
                                    <span className="flex shrink-0 items-center gap-2">
                                        <button type="button" aria-label={`Retirer : ${item.label}`} onClick={() => regler(item.cle, n - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 text-base leading-none hover:bg-white/35">−</button>
                                        <span className="w-5 text-center font-black tabular-nums">{n}</span>
                                        <button type="button" aria-label={`Ajouter : ${item.label}`} onClick={() => regler(item.cle, n + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 text-base leading-none hover:bg-white/35">+</button>
                                    </span>
                                ) : actif ? <span className="ml-auto text-lg">✓</span> : null}
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={valider}
                    disabled={rienSelectionne || enCours}
                    className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-black text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                >
                    {enCours ? "Enregistrement..." : "Valider la vente combo"}
                </button>
            </div>
        </div>
    );
}
