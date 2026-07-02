import { BriefManager } from "@/services/briefManager";
import { RecommandationManager } from "@/services/recommandationsManager";
import { ConseillerClassement } from "@/services/classementManager";
import { CoachManagerResult } from "@/services/coachManager";
import { BrainResult } from "@/intelligence/brain";

export type KPI = {
  nom: string;
  realise: number;
  objectif: number;
  couleur: string;
};

export type MissionDashboard = {
  produit: string;
  objectif: number;
  realise: number;
  couleur: string;
  message: string;
};

export type Intelligence = BrainResult & {
  summary: string;
};

export type DashboardManagerData = {
  kpis: KPI[];
  classement: ConseillerClassement[];
  coach: CoachManagerResult;
  briefs: BriefManager[];
  recommandations: RecommandationManager[];
  intelligence: Intelligence;
  realiseGlobal: number;
  objectifGlobal: number;
  tauxGlobal: number;
  ventesRestantes: number;
};