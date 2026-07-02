import { TimelineEvent } from "./TimelineEvent";

export class TimelineEngine {

    static create(

        type: TimelineEvent["type"],

        titre: string,

        description: string,

        emoji: string,

        priorite: TimelineEvent["priorite"]="normale"

    ):TimelineEvent{

        return{

            id:

                crypto.randomUUID(),

            heure:

                new Date(),

            type,

            titre,

            description,

            emoji,

            priorite,

        };

    }

}