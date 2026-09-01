"use client";

import { useState } from "react";
import ChoixActeModal, { ChoixActe } from "./ChoixActeModal";
import { BonusManuel } from "@/services/variableConseiller";

type Props = {
    bonusManuels: BonusManuel[];
    onChoisir: (option: ChoixActe) => void;
};

// Canal+, assurance essentielle et boost constructeur (téléphone) sont désormais proposés
// juste après la vente concernée ("T'as fait une 4P ?" et questions similaires) — cette carte
// ne couvre plus que les actes ponctuels ajoutés librement par le manager (categorie null/"destockage"),
// mois par mois, depuis /manager/variable > Barème du mois > carte "Autres actes".
export default function AutresActesCard({ bonusManuels, onChoisir }: Props) {
    const [open, setOpen] = useState(false);

    const options: ChoixActe[] = bonusManuels
        .filter((b) => !b.categorie || b.categorie === "destockage")
        .map((b) => ({ label: b.label, montant: b.montant, bonusManuelId: b.id }));

    function handleChoisir(o: ChoixActe) {
        setOpen(false);
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
                            Les actes ajoutés par ton manager ce mois-ci.
                        </p>
                    </div>
                    <button
                        onClick={() => setOpen(true)}
                        className="shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all hover:scale-[1.02]"
                    >
                        + Déclarer
                    </button>
                </div>
            </section>

            {open && (
                <ChoixActeModal
                    titre="Autres actes"
                    options={options}
                    onChoisir={handleChoisir}
                    onClose={() => setOpen(false)}
                    layout="tableau"
                />
            )}
        </>
    );
}
