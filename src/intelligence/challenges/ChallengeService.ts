import { Challenge } from "./Challenge";

export class ChallengeService {

    static accepter(
        challenge: Challenge
    ): Challenge {

        return {

            ...challenge,

            status: "running",

            debut: new Date(),

        };

    }

    static refuser(
        challenge: Challenge
    ): Challenge {

        return {

            ...challenge,

            status: "refused",

        };

    }

    static terminer(
        challenge: Challenge
    ): Challenge {

        return {

            ...challenge,

            status: "finished",

            fin: new Date(),

        };

    }

}