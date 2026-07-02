export interface ChallengeRule {

    produit: string;

    minimum: number;

    maximum: number;

    dureeMinimum: number;

}

export class ChallengeRulesEngine {

    private static rules: ChallengeRule[] = [

        {

            produit: "BOX",

            minimum: 1,

            maximum: 3,

            dureeMinimum: 45,

        },

        {

            produit: "FIBRE",

            minimum: 1,

            maximum: 3,

            dureeMinimum: 45,

        },

        {

            produit: "ASSURANCE",

            minimum: 1,

            maximum: 6,

            dureeMinimum: 30,

        },

        {

            produit: "ACCESSOIRE",

            minimum: 1,

            maximum: 10,

            dureeMinimum: 20,

        },

    ];

    static getRule(produit: string) {

        return this.rules.find(

            r => r.produit === produit.toUpperCase()

        );

    }

}