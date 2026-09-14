"use client";

import { useState } from "react";

export type ComboSansVarianteSelection = {
    box: boolean;
    forfait: boolean;
    telephone: boolean;
    mcafee: boolean;
    assurance: boolean;
};

const SELECTION_VIDE: ComboSansVarianteSelection = {
    box: false, forfait: false, telephone: false, mcafee: false, assurance: false,
};

const ITEMS: { cle: keyof ComboSansVarianteSelection; label: string; emoji: string }[] = [
    { cle: "box", label: "Box", emoji: "📦" },
    { cle: "forfait", label: "Forfait", emoji: "📱" },
    { cle: "telephone", label: "Téléphone", emoji: "📲" },
    { cle: "mcafee", label: "McAfee", emoji: "🛡️" },
    { cle: "assurance", label: "Assurance", emoji: "✅" },
];

type Props = {
    onClose: () => void;
    onValider: (selection: ComboSansVarianteSelection) => Promise<void>;
};

export default function ComboSansVarianteModal({ onClose, onValider }: Props) {
    const [s, setS] = useState<ComboSansVarianteSelection>(SELECTION_VIDE);
    const [enCours, setEnCours] = useState(false);

    const rienSelectionne = !s.box && !s.forfait && !s.telephone && !s.mcafee && !s.assurance;

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

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
            <div
                className="w-full max-w-sm rounded-t-[28px] bg-slate-900 p-6 shadow-[0_-20px_60px_rgba(0,0,0,.5)] sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">📱💻🛡️✅ Vente combo</h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">✕</button>
                </div>
                <p className="mb-5 text-xs text-white/40">Coche tout ce qui fait partie de cette même vente.</p>

                <div className="space-y-2">
                    {ITEMS.map((item) => (
                        <button
                            key={item.cle}
                            onClick={() => setS((p) => ({ ...p, [item.cle]: !p[item.cle] }))}
                            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all ${
                                s[item.cle] ? "bg-amber-500 text-white" : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                        >
                            <span className="text-xl">{item.emoji}</span>
                            <span className="font-bold">{item.label}</span>
                            {s[item.cle] && <span className="ml-auto text-lg">✓</span>}
                        </button>
                    ))}
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
