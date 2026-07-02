export interface ChallengeResult {

    resultat: "victory" | "defeat" | "draw";

    emoji: string;

    titre: string;

    message: string;

}

export class ChallengeResultEngine {

    static analyze(

        joueur: string,

        adversaire: string,

        score1: number,

        score2: number

    ): ChallengeResult {

        if (score1 > score2) {

            return {

                resultat: "victory",

                emoji: "🏆",

                titre: "Victoire !",

                message:
                    `${joueur} remporte son défi contre ${adversaire} (${score1} à ${score2}).`

            };

        }

        if (score2 > score1) {

            return {

                resultat: "defeat",

                emoji: "💪",

                titre: "Défi terminé",

                message:
                    `${adversaire} remporte ce défi (${score2} à ${score1}). KPILOTE te proposera rapidement une revanche.`

            };

        }

        return {

            resultat: "draw",

            emoji: "🤝",

            titre: "Égalité",

            message:
                `Très beau duel. ${joueur} et ${adversaire} terminent à égalité (${score1}-${score2}).`

        };

    }

}