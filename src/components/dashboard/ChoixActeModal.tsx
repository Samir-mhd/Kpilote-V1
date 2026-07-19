"use client";

import { VenteConseiller } from "@/services/variableConseiller";

export type ChoixActe = {
    label: string;
    montant?: number; // absent = entrée de navigation (sous-menu), pas un acte à déclarer
    champ?: keyof VenteConseiller;
    bonusManuelId?: string;
    /** Code de la carte accueil concernée (box/forfaits/telephones/mcafee/assurance) — permet la correction du jour. */
    produitCode?: string;
};

type Props = {
    titre: string;
    options: ChoixActe[];
    onChoisir: (option: ChoixActe) => void;
    onClose: () => void;
    onRetour?: () => void;
    layout?: "liste" | "tableau";
};

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function ChoixActeModal({ titre, options, onChoisir, onClose, onRetour, layout = "liste" }: Props) {
    const tableau = layout === "tableau";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={onClose}
        >
            <div
                className={`w-full rounded-t-[28px] bg-slate-900 p-6 shadow-[0_-20px_60px_rgba(0,0,0,.5)] sm:rounded-[28px] ${tableau ? "max-w-lg" : "max-w-sm"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {onRetour && (
                            <button onClick={onRetour} className="text-white/40 transition-colors hover:text-white">
                                ←
                            </button>
                        )}
                        <h3 className="text-lg font-black text-white">{titre}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20"
                    >
                        ✕
                    </button>
                </div>

                {tableau ? (
                    <div className="grid grid-cols-2 gap-2.5">
                        {options.map((o, i) => (
                            <button
                                key={i}
                                onClick={() => onChoisir(o)}
                                className="flex flex-col items-start gap-1.5 rounded-2xl bg-white/5 px-4 py-3.5 text-left transition-all hover:bg-white/10"
                            >
                                <span className="text-sm font-semibold leading-snug text-white">{o.label}</span>
                                <span className="font-black text-emerald-300">
                                    {o.montant !== undefined ? fmtEuro(o.montant) : "Voir →"}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {options.map((o, i) => (
                            <button
                                key={i}
                                onClick={() => onChoisir(o)}
                                className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-5 py-4 text-left transition-all hover:bg-white/10"
                            >
                                <span className="font-semibold text-white">{o.label}</span>
                                <span className="font-black text-emerald-300">
                                    {o.montant !== undefined ? fmtEuro(o.montant) : "→"}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {options.length === 0 && (
                    <p className="py-4 text-center text-sm text-white/30">Aucune option disponible.</p>
                )}
            </div>
        </div>
    );
}
