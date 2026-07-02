import { Action } from "@/intelligence/actions";
import { PlanAction } from "./PlanAction";

export class PlanActionEngine {

    static build(
        actions: Action[]
    ): PlanAction {

        const tries =
            [...actions];

        tries.sort((a, b) => {

            const poids = {

                haute: 3,

                normale: 2,

                faible: 1,

            };

            return (
                poids[b.priorite] -
                poids[a.priorite]
            );

        });

        return {

            titre:

                "Plan d'action KPILOTE",

            resume:

                `${tries.length} action(s) recommandée(s).`,

            actions: tries,

        };

    }

}