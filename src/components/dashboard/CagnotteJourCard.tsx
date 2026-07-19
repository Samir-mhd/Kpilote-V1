"use client";

import { useEffect, useState } from "react";

type Props = {
    total: number;
    flash: { key: number; montant: number } | null;
};

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function CagnotteJourCard({ total, flash }: Props) {
    const [visible, setVisible] = useState<{ key: number; montant: number } | null>(null);

    useEffect(() => {
        if (!flash) return;
        setVisible(flash);
        const t = setTimeout(() => setVisible(null), 1400);
        return () => clearTimeout(t);
    }, [flash]);

    return (
        <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 py-5 shadow-[0_12px_40px_rgba(139,92,246,.35)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Ma cagnotte du jour</p>
                    <p className="mt-2 text-4xl font-black text-white tabular-nums">{fmtEuro(total)}</p>
                </div>
                <span className="text-4xl">💰</span>
            </div>

            {visible && (
                <span
                    key={visible.key}
                    className="pointer-events-none absolute right-7 top-4 text-lg font-black text-emerald-200"
                    style={{ animation: "cagnotteFloat 1.4s ease-out forwards" }}
                >
                    +{fmtEuro(visible.montant)}
                </span>
            )}

            <style>{`
                @keyframes cagnotteFloat {
                    0%   { opacity: 0; transform: translateY(10px) scale(.8); }
                    20%  { opacity: 1; transform: translateY(0) scale(1.1); }
                    80%  { opacity: 1; transform: translateY(-18px) scale(1); }
                    100% { opacity: 0; transform: translateY(-30px) scale(.9); }
                }
            `}</style>
        </div>
    );
}
