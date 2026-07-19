"use client";

import { useState } from "react";
import ChoixActeModal, { ChoixActe } from "./ChoixActeModal";
import { BaremeVariable, BonusManuel, ActeJour } from "@/services/variableConseiller";

type Props = {
    bareme: BaremeVariable;
    bonusManuels: BonusManuel[];
    onChoisir: (option: ChoixActe) => void;
    /** Dernier acte de la journée (toutes cartes confondues) — l'annulation n'est proposée
     * que si celui-ci vient bien d'"Autres actes" (pas rattaché à une carte produit). */
    dernierActe?: ActeJour;
    onAnnulerDernier: () => Promise<void>;
};

const DESTOCKAGE_SENTINEL = "__destockage__";

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function AutresActesCard({ bareme, bonusManuels, onChoisir, dernierActe, onAnnulerDernier }: Props) {
    const [open, setOpen] = useState(false);
    const [sousMenu, setSousMenu] = useState(false);
    const [annulationEnCours, setAnnulationEnCours] = useState(false);

    const peutAnnuler = !!dernierActe && !dernierActe.produitCode;

    async function handleAnnuler() {
        setAnnulationEnCours(true);
        try {
            await onAnnulerDernier();
        } finally {
            setAnnulationEnCours(false);
        }
    }

    // Box, Canal+, migration fibre et 4P sont payés à M+2 : pas de sync avec le simulateur mensuel,
    // le conseiller les déclare lui-même sur /dashboard/variable — seule la cagnotte du jour est alimentée ici.
    const optionsPrincipales: ChoixActe[] = [
        { label: "Boost indiv. smartphone", montant: bareme.boost_individuel_smartphone },
        { label: "Boost indiv. forfait", montant: bareme.boost_individuel_forfait },
        { label: "Boost indiv. box", montant: bareme.boost_individuel_box },
        { label: "Canal+ Option 1", montant: bareme.canal_option1 },
        { label: "Canal+ Option 2", montant: bareme.canal_option2 },
        { label: "Canal+ Option 3", montant: bareme.canal_option3 },
        { label: "Boost déstockage / constructeur", bonusManuelId: DESTOCKAGE_SENTINEL },
        { label: "Vente 4P", montant: bareme.cross_sell_4p },
        { label: "Assurance essentielle", montant: bareme.assurance_essentielle, champ: "assurance_essentielle" },
    ];

    const optionsDestockage: ChoixActe[] = bonusManuels.map((b) => ({
        label: b.label,
        montant: b.montant,
        bonusManuelId: b.id,
    }));

    function fermer() {
        setOpen(false);
        setSousMenu(false);
    }

    function handleChoisir(o: ChoixActe) {
        if (o.bonusManuelId === DESTOCKAGE_SENTINEL) {
            setSousMenu(true);
            return;
        }
        fermer();
        onChoisir(o);
    }

    return (
        <>
            <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                            Complète ta cagnotte
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-900">Autres actes</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Boosts, Canal+, vente 4P, assurance essentielle, déstockage…
                        </p>
                    </div>
                    <button
                        onClick={() => setOpen(true)}
                        className="shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all hover:scale-[1.02]"
                    >
                        + Déclarer
                    </button>
                </div>

                {peutAnnuler && dernierActe && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-xs font-semibold text-slate-500">
                            Dernier ajout : {dernierActe.label} (+{fmtEuro(dernierActe.montant)})
                        </span>
                        <button
                            onClick={handleAnnuler}
                            disabled={annulationEnCours}
                            className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-500 transition-all hover:bg-red-50 disabled:opacity-60"
                        >
                            {annulationEnCours ? "…" : "Annuler"}
                        </button>
                    </div>
                )}
            </section>

            {open && (
                <ChoixActeModal
                    titre={sousMenu ? "Déstockage / constructeur" : "Autres actes"}
                    options={sousMenu ? optionsDestockage : optionsPrincipales}
                    onChoisir={handleChoisir}
                    onClose={fermer}
                    onRetour={sousMenu ? () => setSousMenu(false) : undefined}
                    layout="tableau"
                />
            )}
        </>
    );
}
