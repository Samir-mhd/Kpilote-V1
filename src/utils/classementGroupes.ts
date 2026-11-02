import type { ProduitCode } from "@/utils/produits";

/** Les 3 items "ventes combo" (pas de ligne dans `ventes`, voir services/variableConseiller.ts). */
export type ComboCode = "mcafee_mobile" | "assurance_essentielle" | "canal_plus";

export const COMBO_META: Record<ComboCode, { label: string; emoji: string }> = {
    mcafee_mobile: { label: "McAfee Mobile", emoji: "📶" },
    assurance_essentielle: { label: "Assurance Ess.", emoji: "🧩" },
    canal_plus: { label: "Canal+", emoji: "📺" },
};

export type GroupeId = "core" | "upsell" | "quali";

export const GROUPES: { id: GroupeId; label: string; codesCore: ProduitCode[]; codesCombo: ComboCode[] }[] = [
    { id: "core", label: "Core business", codesCore: ["box", "forfaits", "telephones"], codesCombo: [] },
    { id: "upsell", label: "Upsell", codesCore: ["mcafee", "assurance"], codesCombo: ["mcafee_mobile", "assurance_essentielle", "canal_plus"] },
    { id: "quali", label: "Quali", codesCore: ["avis_google", "recap_commercial"], codesCombo: [] },
];
