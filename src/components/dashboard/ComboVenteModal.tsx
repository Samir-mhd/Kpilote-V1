"use client";

import { useState, ReactNode } from "react";
import { BaremeVariable, BonusManuel } from "@/services/variableConseiller";

export type ComboSelection = {
    box: "box_ultra" | "box_pop" | "box_pop_s_revolution_5g" | null;
    canal: "canal_option1" | "canal_option2" | "canal_option3" | null;
    forfait: "forfait_free_serie" | "forfait_free_max" | null;
    quatreP: boolean;
    telephone: boolean;
    boostConstructeurId: string | null;
    mcafee: "mcafee_499" | "mcafee_699" | null;
    assurance: "nouveau_mobile" | "essentielle" | null;
};

const SELECTION_VIDE: ComboSelection = {
    box: null, canal: null, forfait: null, quatreP: false,
    telephone: false, boostConstructeurId: null, mcafee: null, assurance: null,
};

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/40">{titre}</p>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                actif ? "bg-amber-500 text-white" : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
        >
            {children}
        </button>
    );
}

type Props = {
    bareme: BaremeVariable;
    bonusManuels: BonusManuel[];
    onClose: () => void;
    onValider: (selection: ComboSelection) => Promise<void>;
};

export default function ComboVenteModal({ bareme, bonusManuels, onClose, onValider }: Props) {
    const [s, setS] = useState<ComboSelection>(SELECTION_VIDE);
    const [enCours, setEnCours] = useState(false);

    const bonusConstructeur = bonusManuels.filter((b) => !b.categorie || b.categorie === "destockage");

    const boxOptions: { cle: ComboSelection["box"]; label: string; montant: number }[] = [
        { cle: "box_ultra", label: "Ultra / Ultra Essentiel", montant: bareme.box_ultra },
        { cle: "box_pop", label: "POP", montant: bareme.box_pop },
        { cle: "box_pop_s_revolution_5g", label: "POP S / Révolution / 5G", montant: bareme.box_pop_s_revolution_5g },
    ];
    const forfaitOptions: { cle: ComboSelection["forfait"]; label: string; montant: number }[] = [
        { cle: "forfait_free_serie", label: "Free / Série Free", montant: bareme.forfait_free_serie },
        { cle: "forfait_free_max", label: "Free Max", montant: bareme.forfait_free_max },
    ];
    const canalOptions: { cle: ComboSelection["canal"]; label: string; montant: number }[] = [
        { cle: "canal_option1", label: "Option 1", montant: bareme.canal_option1 },
        { cle: "canal_option2", label: "Option 2", montant: bareme.canal_option2 },
        { cle: "canal_option3", label: "Option 3", montant: bareme.canal_option3 },
    ];
    const mcafeeOptions: { cle: ComboSelection["mcafee"]; label: string; montant: number }[] = [
        { cle: "mcafee_499", label: "4,99€", montant: bareme.mcafee_499 },
        { cle: "mcafee_699", label: "6,99€", montant: bareme.mcafee_699 },
    ];

    const total =
        (boxOptions.find((o) => o.cle === s.box)?.montant ?? 0) +
        (s.box === "box_ultra" ? (canalOptions.find((o) => o.cle === s.canal)?.montant ?? 0) : 0) +
        (forfaitOptions.find((o) => o.cle === s.forfait)?.montant ?? 0) +
        (s.quatreP ? bareme.cross_sell_4p : 0) +
        (s.telephone ? bareme.smartphone : 0) +
        (s.telephone ? (bonusConstructeur.find((b) => b.id === s.boostConstructeurId)?.montant ?? 0) : 0) +
        (mcafeeOptions.find((o) => o.cle === s.mcafee)?.montant ?? 0) +
        (s.assurance === "nouveau_mobile" ? bareme.assurance_nouveau_mobile : s.assurance === "essentielle" ? bareme.assurance_essentielle : 0);

    const rienSelectionne = !s.box && !s.forfait && !s.quatreP && !s.telephone && !s.mcafee && !s.assurance;

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
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-slate-900 p-6 shadow-[0_-20px_60px_rgba(0,0,0,.5)] sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">📱💻🛡️✅ Vente combo</h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">✕</button>
                </div>
                <p className="mb-5 text-xs text-white/40">Coche tout ce qui fait partie de cette même vente — chaque item crédite sa carte et ta cagnotte.</p>

                <div className="space-y-5">
                    <Groupe titre="📦 Box">
                        {boxOptions.map((o) => (
                            <Puce key={o.cle} actif={s.box === o.cle} onClick={() => setS((p) => ({ ...p, box: p.box === o.cle ? null : o.cle, canal: p.box === o.cle ? p.canal : (o.cle === "box_ultra" ? p.canal : null) }))}>
                                {o.label} · {fmtEuro(o.montant)}
                            </Puce>
                        ))}
                    </Groupe>

                    {s.box === "box_ultra" && (
                        <Groupe titre="📺 Canal+">
                            {canalOptions.map((o) => (
                                <Puce key={o.cle} actif={s.canal === o.cle} onClick={() => setS((p) => ({ ...p, canal: p.canal === o.cle ? null : o.cle }))}>
                                    {o.label} · {fmtEuro(o.montant)}
                                </Puce>
                            ))}
                        </Groupe>
                    )}

                    <Groupe titre="📱 Forfait">
                        {forfaitOptions.map((o) => (
                            <Puce key={o.cle} actif={s.forfait === o.cle} onClick={() => setS((p) => ({ ...p, forfait: p.forfait === o.cle ? null : o.cle }))}>
                                {o.label} · {fmtEuro(o.montant)}
                            </Puce>
                        ))}
                    </Groupe>

                    {(s.box || s.forfait) && (
                        <Groupe titre="🔁 Cross-sell 4P">
                            <Puce actif={s.quatreP} onClick={() => setS((p) => ({ ...p, quatreP: !p.quatreP }))}>
                                Vente 4P · {fmtEuro(bareme.cross_sell_4p)}
                            </Puce>
                        </Groupe>
                    )}

                    <Groupe titre="📲 Téléphone">
                        <Puce actif={s.telephone} onClick={() => setS((p) => ({ ...p, telephone: !p.telephone, boostConstructeurId: p.telephone ? null : p.boostConstructeurId }))}>
                            Smartphone · {fmtEuro(bareme.smartphone)}
                        </Puce>
                    </Groupe>

                    {s.telephone && bonusConstructeur.length > 0 && (
                        <Groupe titre="🏭 Boost constructeur / déstockage">
                            {bonusConstructeur.map((b) => (
                                <Puce key={b.id} actif={s.boostConstructeurId === b.id} onClick={() => setS((p) => ({ ...p, boostConstructeurId: p.boostConstructeurId === b.id ? null : b.id }))}>
                                    {b.label} · {fmtEuro(b.montant)}
                                </Puce>
                            ))}
                        </Groupe>
                    )}

                    <Groupe titre="🛡️ McAfee">
                        {mcafeeOptions.map((o) => (
                            <Puce key={o.cle} actif={s.mcafee === o.cle} onClick={() => setS((p) => ({ ...p, mcafee: p.mcafee === o.cle ? null : o.cle }))}>
                                {o.label}
                            </Puce>
                        ))}
                    </Groupe>

                    <Groupe titre="✅ Assurance">
                        <Puce actif={s.assurance === "nouveau_mobile"} onClick={() => setS((p) => ({ ...p, assurance: p.assurance === "nouveau_mobile" ? null : "nouveau_mobile" }))}>
                            Nouveau Mobile · {fmtEuro(bareme.assurance_nouveau_mobile)}
                        </Puce>
                        <Puce actif={s.assurance === "essentielle"} onClick={() => setS((p) => ({ ...p, assurance: p.assurance === "essentielle" ? null : "essentielle" }))}>
                            Essentielle · {fmtEuro(bareme.assurance_essentielle)}
                        </Puce>
                    </Groupe>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Total combo</span>
                    <span className="text-xl font-black text-amber-300">{fmtEuro(total)}</span>
                </div>

                <button
                    onClick={valider}
                    disabled={rienSelectionne || enCours}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-black text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                >
                    {enCours ? "Enregistrement..." : "Valider la vente combo"}
                </button>
            </div>
        </div>
    );
}
