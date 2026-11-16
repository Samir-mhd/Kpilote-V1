"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMissionsReelles, codeDepuisNom } from "@/services/missionsReelles";
import { CODES_ACTES_BILAN, CODES_SUIVI_BILAN } from "@/services/bilanSoirService";

const EMOJI: Record<string, string> = { box: "📦", forfaits: "📱", telephones: "📲", mcafee: "🛡️", assurance: "✅", avis_google: "⭐", recap_commercial: "📋", mcafee_mobile: "📶", assurance_essentielle: "🧩" };
const CODES = [...CODES_ACTES_BILAN, ...CODES_SUIVI_BILAN] as string[];

/** Fin de journée : le conseiller confirme ses ventes du jour puis est déconnecté (retour à l'accueil).
 *  Sans validation, ses ventes comptent quand même dans le bilan du soir. */
export default function ValiderJourneeModal({ conseillerId, nom, qs, onClose }: { conseillerId: string; nom: string; qs: string; onClose: () => void }) {
    const router = useRouter();
    const [lignes, setLignes] = useState<{ code: string; label: string; n: number }[] | null>(null);

    useEffect(() => {
        getMissionsReelles(conseillerId, true)
            .then((m) => setLignes((m as { produit: string; realise: number }[])
                .map((x) => ({ code: codeDepuisNom(x.produit), label: x.produit, n: x.realise ?? 0 }))
                .filter((l) => CODES.includes(l.code))
                .sort((a, b) => CODES.indexOf(a.code) - CODES.indexOf(b.code))))
            .catch(() => setLignes([]));
    }, [conseillerId]);

    const actes = (lignes ?? []).filter((l) => (CODES_ACTES_BILAN as readonly string[]).includes(l.code)).reduce((t, l) => t + l.n, 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
            <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-slate-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300">🌙 Fin de journée</p>
                <h2 className="mt-1 text-2xl font-black">Tes ventes du jour sont justes, {nom.split(" ")[0]} ?</h2>
                {!lignes ? (
                    <div className="mt-4 h-40 animate-pulse rounded-2xl bg-white/[0.06]" />
                ) : (
                    <ul className="mt-4 space-y-1.5">
                        {lignes.map((l) => (
                            <li key={l.code} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2">
                                <span aria-hidden="true">{EMOJI[l.code]}</span>
                                <span className="flex-1 text-sm font-bold text-white/80">{l.label}</span>
                                <span className="text-lg font-black tabular-nums">{l.n}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-3 text-center text-sm text-white/60"><b className="text-white">{actes} actes</b> aujourd&apos;hui</p>
                <button onClick={() => router.push("/")} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 font-black transition-all active:scale-[0.98]">
                    ✓ C&apos;est bon, je valide et me déconnecte
                </button>
                <button onClick={() => { onClose(); router.push(`/dashboard${qs}`); }} className="mt-2 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white/70 hover:bg-white/15">
                    Non, je corrige d&apos;abord
                </button>
            </div>
        </div>
    );
}
