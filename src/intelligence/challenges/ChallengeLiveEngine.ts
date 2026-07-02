export interface ChallengeState {

    joueur1: string;

    joueur2: string;

    score1: number;

    score2: number;

    produit: string;

    tempsRestant: number;

    termine: boolean;

}

export class ChallengeLiveEngine {

    static tick(
        state: ChallengeState
    ): ChallengeState {

        if (state.termine)
            return state;

        let score1 = state.score1;
        let score2 = state.score2;

        const hasard = Math.random();

        if (hasard < 0.35) {

            score1++;

        } else if (hasard < 0.70) {

            score2++;

        }

        const temps =
            Math.max(
                state.tempsRestant - 1,
                0
            );

        return {

            ...state,

            score1,

            score2,

            tempsRestant: temps,

            termine:
                temps === 0,

        };

    }

}