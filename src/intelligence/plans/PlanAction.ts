import { Action } from "@/intelligence/actions";

export interface PlanAction {

    titre: string;

    resume: string;

    actions: Action[];

}