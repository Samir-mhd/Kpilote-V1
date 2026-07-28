"use client";

import { useState } from "react";
import ChoixActeModal, { ChoixActe } from "./ChoixActeModal";
import { BaremeVariable, BonusManuel } from "@/services/variableConseiller";

type Props = {
    bareme: BaremeVariable;
    bonusManuels: BonusManuel[];
    onChoisir: (option: ChoixActe) => void;
};

const DESTOCKAGE_SENTINEL = "__destockage__";

export default function AutresActesCard({ bareme, bonusManuels, onChoisir }: Props) {
    const [open, setOpen] = useState(false);
    const [sousMenu, setSousMenu] = useState(false);

    // Box, Canal+ et migration fibre sont payés à M+2 : pas de sync avec le simulateur mensuel,
    // le conseiller les déclare lui-même sur /dashboard/variable — seule la cagnotte du jour est alimentée ici.
    // Les boosts individuels (box/forfait/smartphone) ne sont plus déclarés ici : ils s'ajoutent
    // automatiquement à la cagnotte dès que le seuil défini par le manager est dépassé.
    // La vente 4P se déclare désormais juste après une vente box/forfait ("T'as fait une 4P ?").
    // Un produit "retiré de la vente" par le manager (croix sur /manager/variable) disparaît d'ici aussi.
    const masques = bareme.champsMasques ?? [];
    const optionsPrincipales: ChoixActe[] = [
        !masques.includes("canal_option1") && { label: "Canal+ Option 1", montant: bareme.canal_option1 },
        !masques.includes("canal_option2") && { label: "Canal+ Option 2", montant: bareme.canal_option2 },
        !masques.includes("canal_option3") && { label: "Canal+ Option 3", montant: bareme.canal_option3 },
        { label: "Boost déstockage / constructeur", bonusManuelId: DESTOCKAGE_SENTINEL },
        !masques.includes("assurance_essentielle") && { label: "Assurance essentielle", montant: bareme.assurance_essentielle, champ: "assurance_essentielle" },
    ].filter(Boolean) as ChoixActe[];

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
                            Canal+, assurance essentielle, déstockage…
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
