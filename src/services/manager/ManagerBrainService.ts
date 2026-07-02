import { Metric } from "../../intelligence/metrics";
import { BrainService } from "../brain";

export class ManagerBrainService{

    static buildDashboard(metrics:Metric[]){

        const brain=BrainService.analyze(metrics);

        return{

            observations:brain.observations,

            deductions:brain.deductions,

            recommendations:brain.recommendations,

            alertCount:brain.observations.filter(o=>o.severity==="warning").length,

            successCount:brain.observations.filter(o=>o.severity==="success").length

        };

    }

}
