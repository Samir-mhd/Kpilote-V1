import { Metric } from "../../intelligence/metrics";
import { ManagerBrainService } from "../manager";

export interface DashboardIntelligence{

    alertes:number;

    felicitations:number;

    observations:any[];

    deductions:any[];

    recommandations:any[];

}

export class DashboardIntelligenceService{

    static build(metrics:Metric[]):DashboardIntelligence{

        const result=ManagerBrainService.buildDashboard(metrics);

        return{

            alertes:result.alertCount,

            felicitations:result.successCount,

            observations:result.observations,

            deductions:result.deductions,

            recommandations:result.recommendations

        };

    }

}
