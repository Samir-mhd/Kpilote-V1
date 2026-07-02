import { Congratulation } from "./Congratulation";

export class CongratulationEngine {

    static create(

        manager: string,

        conseiller: string,

        message: string

    ): Congratulation {

        return {

            id: crypto.randomUUID(),

            manager,

            conseiller,

            message,

            createdAt: new Date(),

        };

    }

}