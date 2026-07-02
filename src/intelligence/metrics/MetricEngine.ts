import { Metric } from "./Metric";

export class MetricEngine {

    static create(

        id:string,

        label:string,

        value:number,

        target:number,

        unit:string="%"

    ):Metric{

        return{

            id,

            label,

            value,

            target,

            unit

        };

    }

}
