export interface ChallengeAnimation {

    joueur1: boolean;

    joueur2: boolean;

    effet: "score" | "victory" | "draw";

}

export class ChallengeAnimationEngine {

    static onScore(
        ancienScore1: number,
        ancienScore2: number,
        nouveauScore1: number,
        nouveauScore2: number
    ): ChallengeAnimation {

        if (nouveauScore1 > ancienScore1) {

            return {

                joueur1: true,

                joueur2: false,

                effet: "score",

            };

        }

        if (nouveauScore2 > ancienScore2) {

            return {

                joueur1: false,

                joueur2: true,

                effet: "score",

            };

        }

        return {

            joueur1: false,

            joueur2: false,

            effet: "draw",

        };

    }

    static onFinish(
        score1: number,
        score2: number
    ): ChallengeAnimation {

        if (score1 > score2) {

            return {

                joueur1: true,

                joueur2: false,

                effet: "victory",

            };

        }

        if (score2 > score1) {

            return {

                joueur1: false,

                joueur2: true,

                effet: "victory",

            };

        }

        return {

            joueur1: true,

            joueur2: true,

            effet: "draw",

        };

    }

}