"use client";

import { useEffect, useState } from "react";
import {
    BaremeVariable,
    BAREME_DEFAUT,
    VenteConseiller,
    CorrectionChamp,
    ActeJour,
    getBareme,
    compterActesJourParChamp,
    corrigerProduitJour,
    annulerDernierActeLie,
    trouverActeEtBoostLies,
    getCagnotteJour,
    annulerActeJour,
    jourCourant,
} from "@/services/variableConseiller";
import { annulerVente, corrigerVentesJour } from "@/services/ventes";

type VenteJour = { id: string; produits: any; created_at: string };

type Props = {
    conseillerId: string;
    ventesAujourdhui: VenteJour[];
    onCorrige: () => void;
};

type ChampDef = { champ: keyof VenteConseiller; label: string; montant: (b: BaremeVariable) => number };
type ProduitDef = { code: string; label: string; champs: ChampDef[] };

const PRODUITS_CORRECTION: ProduitDef[] = [
    {
        code: "box", label: "Box", champs: [
            { champ: "box_ultra", label: "Ultra / Ultra Essentiel", montant: (b) => b.box_ultra },
            { champ: "box_pop", label: "POP", montant: (b) => b.box_pop },
            { champ: "box_pop_s_revolution_5g", label: "POP S / Révolution / Box 5G", montant: (b) => b.box_pop_s_revolution_5g },
        ],
    },
    {
        code: "forfaits", label: "Forfaits", champs: [
            { champ: "forfait_free_serie", label: "Forfait Free / Série Free", montant: (b) => b.forfait_free_serie },
            { champ: "forfait_free_max", label: "Forfait Free Max", montant: (b) => b.forfait_free_max },
        ],
    },
    {
        code: "telephones", label: "Téléphones", champs: [
            { champ: "smartphones", label: "Smartphones", montant: (b) => b.smartphone },
        ],
    },
    {
        code: "mcafee", label: "McAfee", champs: [
            { champ: "mcafee_499", label: "McAfee 4,99€", montant: (b) => b.mcafee_499 },
            { champ: "mcafee_699", label: "McAfee 6,99€", montant: (b) => b.mcafee_699 },
        ],
    },
    {
        code: "assurance", label: "Assurance", champs: [
            { champ: "assurance_nouveau_mobile", label: "Assurance Nouveau Mobile", montant: (b) => b.assurance_nouveau_mobile },
        ],
    },
];

export default function CorrigerVentesJourCard({ conseillerId, ventesAujourdhui, onCorrige }: Props) {
    const [bareme, setBareme] = useState<BaremeVariable>(BAREME_DEFAUT);
    const [panelOuvert, setPanelOuvert] = useState<string | null>(null);
    const [valeurs, setValeurs] = useState<Record<string, number>>({});
    const [valeursInitiales, setValeursInitiales] = useState<Record<string, number>>({});
    const [chargementPanel, setChargementPanel] = useState(false);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [confirmAnnulation, setConfirmAnnulation] = useState(false);
    const [annulationEnCours, setAnnulationEnCours] = useState(false);
    const [boostLie, setBoostLie] = useState<ActeJour | null>(null);
    const [dernierActeAutre, setDernierActeAutre] = useState<ActeJour | null>(null);
    const [confirmAnnulationAutre, setConfirmAnnulationAutre] = useState(false);
    const [annulationAutreEnCours, setAnnulationAutreEnCours] = useState(false);

    useEffect(() => { getBareme().then(setBareme); }, []);

    // Dernier acte "annexe" (Canal+, déstockage, assurance essentielle, 4P, boost auto) — tout
    // ce qui n'est pas rattaché à une carte produit (celles-là se corrigent via les cartes ci-dessous).
    async function chargerDernierActeAutre() {
        if (!conseillerId) return;
        const actes = await getCagnotteJour(conseillerId, jourCourant());
        const sansProduit = actes.filter((a) => !a.produitCode);
        setDernierActeAutre(sansProduit[sansProduit.length - 1] ?? null);
    }

    useEffect(() => { chargerDernierActeAutre(); }, [conseillerId]);

    const derniereVente = ventesAujourdhui[ventesAujourdhui.length - 1];

    // Détecte si la dernière vente a déclenché un boost individuel automatique, pour adapter
    // le libellé du bouton et l'annuler avec la vente.
    useEffect(() => {
        if (!derniereVente) { setBoostLie(null); return; }
        const code = derniereVente.produits?.code as string | undefined;
        if (!code) { setBoostLie(null); return; }
        let annule = false;
        trouverActeEtBoostLies(conseillerId, code, derniereVente.created_at).then(({ boost }) => {
            if (!annule) setBoostLie(boost);
        });
        return () => { annule = true; };
    }, [conseillerId, derniereVente?.id]);

    async function ouvrirPanel(def: ProduitDef) {
        setPanelOuvert(def.code);
        setChargementPanel(true);
        try {
            const counts = await compterActesJourParChamp(conseillerId, def.champs.map((c) => c.champ));
            const init: Record<string, number> = {};
            def.champs.forEach((c) => { init[c.champ] = counts[c.champ] ?? 0; });
            setValeurs(init);
            setValeursInitiales(init);
        } finally {
            setChargementPanel(false);
        }
    }

    function fermerPanel() {
        setPanelOuvert(null);
        setValeurs({});
        setValeursInitiales({});
    }

    async function confirmerCorrection(def: ProduitDef) {
        setSauvegarde(true);
        try {
            const corrections: CorrectionChamp[] = def.champs.map((c) => ({
                champ: c.champ,
                label: c.label,
                montantUnitaire: c.montant(bareme),
                ancienneValeur: valeursInitiales[c.champ] ?? 0,
                nouvelleValeur: Math.max(0, valeurs[c.champ] ?? 0),
            }));
            const { deltaTotal } = await corrigerProduitJour(conseillerId, def.code, corrections);
            await corrigerVentesJour(conseillerId, def.code, deltaTotal);
            fermerPanel();
            onCorrige();
            chargerDernierActeAutre();
        } finally {
            setSauvegarde(false);
        }
    }

    async function handleAnnulerDerniere() {
        if (!derniereVente) return;
        setAnnulationEnCours(true);
        try {
            const code = derniereVente.produits?.code as string | undefined;
            await annulerVente(derniereVente.id);
            if (code) await annulerDernierActeLie(conseillerId, code, derniereVente.created_at);
            setConfirmAnnulation(false);
            onCorrige();
            chargerDernierActeAutre();
        } finally {
            setAnnulationEnCours(false);
        }
    }

    async function handleAnnulerDernierActeAutre() {
        if (!dernierActeAutre) return;
        setAnnulationAutreEnCours(true);
        try {
            await annulerActeJour(conseillerId, dernierActeAutre);
            setConfirmAnnulationAutre(false);
            await chargerDernierActeAutre();
        } finally {
            setAnnulationAutreEnCours(false);
        }
    }

    return (
        <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-600">
                🛠️ Corriger mes ventes du jour
            </p>
            <p className="mt-1 font-black text-slate-900">Une erreur de saisie aujourd'hui ?</p>

            {/* Annuler la dernière vente */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {derniereVente ? (
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-black text-slate-800">
                                {boostLie ? "Dernière vente boostée" : "Dernière vente saisie"}
                            </p>
                            <p className="text-xs text-slate-400">
                                {derniereVente.produits?.nom ?? derniereVente.produits?.code ?? "—"} à{" "}
                                {new Date(derniereVente.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                {boostLie && ` · +${boostLie.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € de boost inclus`}
                            </p>
                        </div>
                        {!confirmAnnulation ? (
                            <button
                                onClick={() => setConfirmAnnulation(true)}
                                className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-500 transition-all hover:bg-red-50"
                            >
                                {boostLie ? "Annuler la dernière vente boostée" : "Annuler cette vente"}
                            </button>
                        ) : (
                            <div className="flex shrink-0 gap-2">
                                <button
                                    onClick={() => setConfirmAnnulation(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"
                                >
                                    Non
                                </button>
                                <button
                                    onClick={handleAnnulerDerniere}
                                    disabled={annulationEnCours}
                                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-600 disabled:opacity-60"
                                >
                                    {annulationEnCours ? "…" : "Confirmer"}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">Pas encore de vente aujourd'hui.</p>
                )}
            </div>

            {/* Annuler le dernier acte annexe (Canal+, déstockage, assurance essentielle, 4P, boost) */}
            {dernierActeAutre && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-black text-slate-800">Dernier acte annexe</p>
                            <p className="text-xs text-slate-400">
                                {dernierActeAutre.label} · +{dernierActeAutre.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € à{" "}
                                {new Date(dernierActeAutre.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        {!confirmAnnulationAutre ? (
                            <button
                                onClick={() => setConfirmAnnulationAutre(true)}
                                className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-500 transition-all hover:bg-red-50"
                            >
                                Annuler cet acte
                            </button>
                        ) : (
                            <div className="flex shrink-0 gap-2">
                                <button
                                    onClick={() => setConfirmAnnulationAutre(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"
                                >
                                    Non
                                </button>
                                <button
                                    onClick={handleAnnulerDernierActeAutre}
                                    disabled={annulationAutreEnCours}
                                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-600 disabled:opacity-60"
                                >
                                    {annulationAutreEnCours ? "…" : "Confirmer"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Corriger une carte */}
            <div className="mt-4 flex flex-wrap gap-2">
                {PRODUITS_CORRECTION.map((def) => (
                    <button
                        key={def.code}
                        onClick={() => ouvrirPanel(def)}
                        className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100"
                    >
                        Corriger {def.label}
                    </button>
                ))}
            </div>

            {/* Panel de correction */}
            {panelOuvert && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={fermerPanel}>
                    <div className="w-full max-w-sm rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                            const def = PRODUITS_CORRECTION.find((d) => d.code === panelOuvert)!;
                            return (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-900">Corriger {def.label}</h3>
                                        <button onClick={fermerPanel} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">✕</button>
                                    </div>

                                    {chargementPanel ? (
                                        <div className="flex justify-center py-8">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {def.champs.map((c) => (
                                                <div key={c.champ} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                                    <span className="text-sm font-semibold text-slate-700">{c.label}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={valeurs[c.champ] ?? 0}
                                                        onChange={(e) => setValeurs((prev) => ({ ...prev, [c.champ]: Math.max(0, Number(e.target.value) || 0) }))}
                                                        className="h-10 w-20 rounded-xl border border-slate-200 bg-white text-center text-sm font-black text-slate-900 outline-none focus:border-violet-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => confirmerCorrection(def)}
                                        disabled={sauvegarde || chargementPanel}
                                        className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-black text-white transition-all hover:bg-violet-700 disabled:opacity-60"
                                    >
                                        {sauvegarde ? "Enregistrement…" : "Valider la correction"}
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
