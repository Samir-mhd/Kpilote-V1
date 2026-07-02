/**
 * ============================================================
 * KPILOTE V2
 * Observation Catalog
 * ------------------------------------------------------------
 * Toutes les observations que KPILOTE est capable de produire.
 * Aucune logique métier ici.
 * Ce fichier est uniquement un catalogue.
 * ============================================================
 */

export type ObservationSeverity =
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface ObservationDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
  severity: ObservationSeverity;
}

export const ObservationCatalog: Record<string, ObservationDefinition> = {

  // ==========================
  // ASSURANCE
  // ==========================

  OBS_ASSURANCE_CRITICAL: {
    id: "OBS_ASSURANCE_CRITICAL",
    label: "Assurances critiques",
    description: "Le taux d'assurance est très en dessous de l'objectif.",
    category: "assurance",
    severity: "danger",
  },

  OBS_ASSURANCE_FAIBLE: {
    id: "OBS_ASSURANCE_FAIBLE",
    label: "Assurances faibles",
    description: "Le taux d'assurance est inférieur à l'objectif.",
    category: "assurance",
    severity: "warning",
  },

  OBS_ASSURANCE_GOOD: {
    id: "OBS_ASSURANCE_GOOD",
    label: "Assurances proches de l'objectif",
    description: "Le taux d'assurance approche de l'objectif.",
    category: "assurance",
    severity: "success",
  },

  OBS_ASSURANCE_FORTE: {
    id: "OBS_ASSURANCE_FORTE",
    label: "Assurances fortes",
    description: "Le taux d'assurance dépasse l'objectif.",
    category: "assurance",
    severity: "success",
  },

  // ==========================
  // BOX
  // ==========================

  OBS_BOX_CRITICAL: {
    id: "OBS_BOX_CRITICAL",
    label: "Box critiques",
    description: "Les ventes Box sont très en dessous de l'objectif.",
    category: "box",
    severity: "danger",
  },

  OBS_BOX_FAIBLE: {
    id: "OBS_BOX_FAIBLE",
    label: "Box faibles",
    description: "Les ventes Box sont sous l'objectif.",
    category: "box",
    severity: "warning",
  },

  OBS_BOX_GOOD: {
    id: "OBS_BOX_GOOD",
    label: "Box proches de l'objectif",
    description: "Les ventes Box approchent de l'objectif.",
    category: "box",
    severity: "success",
  },

  OBS_BOX_FORTE: {
    id: "OBS_BOX_FORTE",
    label: "Box fortes",
    description: "Les ventes Box dépassent l'objectif.",
    category: "box",
    severity: "success",
  },

  // ==========================
  // FORFAIT
  // ==========================

  OBS_FORFAIT_CRITICAL: {
    id: "OBS_FORFAIT_CRITICAL",
    label: "Forfaits critiques",
    description: "Les forfaits sont très en dessous de l'objectif.",
    category: "forfait",
    severity: "danger",
  },

  OBS_FORFAIT_FAIBLE: {
    id: "OBS_FORFAIT_FAIBLE",
    label: "Forfaits faibles",
    description: "Les forfaits sont sous l'objectif.",
    category: "forfait",
    severity: "warning",
  },

  OBS_FORFAIT_GOOD: {
    id: "OBS_FORFAIT_GOOD",
    label: "Forfaits proches de l'objectif",
    description: "Les forfaits approchent de l'objectif.",
    category: "forfait",
    severity: "success",
  },

  OBS_FORFAIT_FORT: {
    id: "OBS_FORFAIT_FORT",
    label: "Forfaits performants",
    description: "Les forfaits dépassent l'objectif.",
    category: "forfait",
    severity: "success",
  },

  // ==========================
  // TÉLÉPHONE
  // ==========================

  OBS_TELEPHONE_CRITICAL: {
    id: "OBS_TELEPHONE_CRITICAL",
    label: "Téléphones critiques",
    description: "Les ventes de téléphones sont très en dessous de l'objectif.",
    category: "telephone",
    severity: "danger",
  },

  OBS_TELEPHONE_FAIBLE: {
    id: "OBS_TELEPHONE_FAIBLE",
    label: "Téléphones faibles",
    description: "Les ventes de téléphones sont sous l'objectif.",
    category: "telephone",
    severity: "warning",
  },

  OBS_TELEPHONE_GOOD: {
    id: "OBS_TELEPHONE_GOOD",
    label: "Téléphones proches de l'objectif",
    description: "Les ventes de téléphones approchent de l'objectif.",
    category: "telephone",
    severity: "success",
  },

  OBS_TELEPHONE_FORT: {
    id: "OBS_TELEPHONE_FORT",
    label: "Téléphones performants",
    description: "Les ventes de téléphones dépassent l'objectif.",
    category: "telephone",
    severity: "success",
  },

  // ==========================
  // MCAFEE
  // ==========================

  OBS_MCAFEE_CRITICAL: {
    id: "OBS_MCAFEE_CRITICAL",
    label: "McAfee critique",
    description: "Les ventes McAfee sont très en dessous de l'objectif.",
    category: "mcafee",
    severity: "danger",
  },

  OBS_MCAFEE_FAIBLE: {
    id: "OBS_MCAFEE_FAIBLE",
    label: "McAfee faible",
    description: "Les ventes McAfee sont sous l'objectif.",
    category: "mcafee",
    severity: "warning",
  },

  OBS_MCAFEE_GOOD: {
    id: "OBS_MCAFEE_GOOD",
    label: "McAfee proche de l'objectif",
    description: "Les ventes McAfee approchent de l'objectif.",
    category: "mcafee",
    severity: "success",
  },

  OBS_MCAFEE_FORT: {
    id: "OBS_MCAFEE_FORT",
    label: "McAfee performant",
    description: "Les ventes McAfee dépassent l'objectif.",
    category: "mcafee",
    severity: "success",
  },

  // ==========================
  // PERFORMANCE GLOBALE
  // ==========================

  OBS_OBJECTIF_ATTEINT: {
    id: "OBS_OBJECTIF_ATTEINT",
    label: "Objectif atteint",
    description: "Le conseiller atteint son objectif global.",
    category: "performance",
    severity: "success",
  },

  OBS_OBJECTIF_NON_ATTEINT: {
    id: "OBS_OBJECTIF_NON_ATTEINT",
    label: "Objectif non atteint",
    description: "Le conseiller est sous son objectif.",
    category: "performance",
    severity: "warning",
  },

  OBS_PROGRESSION: {
    id: "OBS_PROGRESSION",
    label: "Progression",
    description: "Progression observée par rapport à la période précédente.",
    category: "evolution",
    severity: "success",
  },

  OBS_REGRESSION: {
    id: "OBS_REGRESSION",
    label: "Régression",
    description: "Régression observée par rapport à la période précédente.",
    category: "evolution",
    severity: "danger",
  },

  // ==========================
  // GÉNÉRIQUE (fallback)
  // ==========================

  OBS_GENERIQUE_CRITICAL: {
    id: "OBS_GENERIQUE_CRITICAL",
    label: "Indicateur critique",
    description: "Cet indicateur est très en dessous de l'objectif.",
    category: "generique",
    severity: "danger",
  },

  OBS_GENERIQUE_FAIBLE: {
    id: "OBS_GENERIQUE_FAIBLE",
    label: "Indicateur faible",
    description: "Cet indicateur est sous l'objectif.",
    category: "generique",
    severity: "warning",
  },

  OBS_GENERIQUE_GOOD: {
    id: "OBS_GENERIQUE_GOOD",
    label: "Indicateur proche de l'objectif",
    description: "Cet indicateur approche de l'objectif.",
    category: "generique",
    severity: "success",
  },

  OBS_GENERIQUE_FORT: {
    id: "OBS_GENERIQUE_FORT",
    label: "Indicateur performant",
    description: "Cet indicateur dépasse l'objectif.",
    category: "generique",
    severity: "success",
  },

};