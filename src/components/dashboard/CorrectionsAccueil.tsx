"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CorrigerVentesJourCard from "@/components/dashboard/CorrigerVentesJourCard";
import MorningCheckV2 from "@/components/dashboard/MorningCheckV2";
import { PRODUITS_HORS_ACTES, ProduitCode } from "@/utils/produits";

/**
 * Section "Corrections" en bas de l'Accueil (repliée) : corriger ses ventes du jour et revoir son
 * Cerebro Check. Mêmes outils qu'avant sur "Mes stats", déplacés ici : c'est là qu'on déclare.
 */

// Ajustements techniques (cerebro check, correction du jour) exclus de la liste des ventes du jour.
const EXCLURE_AJUSTEMENTS = "source.is.null,and(source.neq.cerebro_check,source.neq.reset_jour)";

type VenteJour = { id: string; produits: any; created_at: string };

export default function CorrectionsAccueil({ conseillerId, nom, onCorrige }: { conseillerId: string; nom: string; onCorrige: () => void }) {
    const [ventesAujourdhui, setVentesAujourdhui] = useState<VenteJour[]>([]);
    const [confirmation, setConfirmation] = useState(false);
    const [check, setCheck] = useState(false);

    async function charger() {
        const debut = new Date();
        debut.setHours(0, 0, 0, 0);
        const { data } = await supabase
            .from("ventes")
            .select("id,created_at,produits(nom,code)")
            .eq("conseiller_id", conseillerId)
            .or(EXCLURE_AJUSTEMENTS)
            .gte("created_at", debut.toISOString())
            .order("created_at", { ascending: true });
        setVentesAujourdhui(((data ?? []) as VenteJour[]).filter((v) => {
            const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code as ProduitCode | undefined;
            return !code || !PRODUITS_HORS_ACTES.includes(code);
        }));
    }

    useEffect(() => {
        if (conseillerId) charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conseillerId]);

    return (
        <>
            <details className="group rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) charger(); }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                        <span className="block text-base font-black text-slate-900">🛠️ Corrections</span>
                        <span className="block text-xs font-semibold text-slate-400">Corriger mes ventes du jour · revoir mon Cerebro Check</span>
                    </span>
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 group-open:hidden">Ouvrir</span>
                    <span className="hidden rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 group-open:inline">Fermer</span>
                </summary>

                <div className="mt-5 space-y-5">
                    <CorrigerVentesJourCard
                        conseillerId={conseillerId}
                        ventesAujourdhui={ventesAujourdhui}
                        onCorrige={() => { charger(); onCorrige(); }}
                    />

                    <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">🧠 Revoir mon Cerebro Check</p>
                                <p className="mt-1 font-black text-slate-900">Validé trop vite ce matin ?</p>
                                <p className="mt-1 text-sm text-slate-400">Ajuste ton cumul du mois (avant aujourd&apos;hui) sans toucher à tes ventes saisies.</p>
                            </div>
                            {!confirmation && (
                                <button
                                    onClick={() => setConfirmation(true)}
                                    className="flex-shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100 active:scale-[0.97]"
                                >
                                    Corriger
                                </button>
                            )}
                        </div>
                        {confirmation && (
                            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                                <p className="text-sm font-semibold text-violet-800">
                                    Tes ventes saisies restent intactes. Tu pourras ajuster les totaux par produit dans l&apos;écran suivant.
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <button onClick={() => setConfirmation(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300">
                                        Annuler
                                    </button>
                                    <button onClick={() => { setConfirmation(false); setCheck(true); }} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700">
                                        Corriger mes chiffres
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </details>

            {check && (
                <MorningCheckV2
                    nom={nom}
                    conseillerId={conseillerId}
                    isReset={false}
                    modeCorrection
                    onValidated={() => { setCheck(false); onCorrige(); }}
                />
            )}
        </>
    );
}
