export type ChallengeState = {

    scoreMoi: number;

    scoreAdversaire: number;

    leader: "moi" | "adversaire" | "egalite";

    message: string;

};

export function updateChallenge(

    state: ChallengeState,

    vendeur: "moi" | "adversaire"

): ChallengeState {

    let scoreMoi = state.scoreMoi;

    let scoreAdversaire = state.scoreAdversaire;

    if (vendeur === "moi") {

        scoreMoi++;

    } else {

        scoreAdversaire++;

    }

    let leader: ChallengeState["leader"] = "egalite";

    if (scoreMoi > scoreAdversaire) {

        leader = "moi";

    }

    if (scoreAdversaire > scoreMoi) {

        leader = "adversaire";

    }

    let message = "";

    if (leader === "moi") {

        message =
            "Excellent ! Tu prends l'avantage.";

    }

    if (leader === "adversaire") {

        message =
            "Ton adversaire passe devant. Réagis !";

    }

    if (leader === "egalite") {

        message =
            "Égalité parfaite. Tout reste à jouer.";

    }

    return {

        scoreMoi,

        scoreAdversaire,

        leader,

        message,

    };

}