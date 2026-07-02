export type AnalyseManager = {
  titre: string;
  message: string;
  niveau: "success" | "warning" | "danger";
};

export type ActionManager = {
  titre: string;
  description: string;
  priorite: "haute" | "moyenne" | "faible";
};

export type FelicitationManager = {
  conseiller: string;
  raison: string;
};

export type AlerteManager = {
  titre: string;
  message: string;
};