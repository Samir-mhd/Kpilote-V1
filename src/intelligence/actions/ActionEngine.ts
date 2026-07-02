import { Action } from "./Action";

import { KPILOTEResult } from "@/intelligence/core";

export class ActionEngine {

    static analyze(
        intelligence: KPILOTEResult
    ): Action[] {

        const actions: Action[] = [];

        // Défi

        if (intelligence.challenge) {

            actions.push({

                id: "ACTION_CHALLENGE",

                titre: "Lancer un défi",

                description:
                    intelligence.challenge.raison,

                priorite: "haute",

                type: "challenge",

            });

        }

        // Produit faible

        intelligence.moments.forEach(moment => {

            if (
                moment.id.includes("WARNING")
            ) {

                actions.push({

                    id:
                        "ACTION_" + moment.id,

                    titre:
                        "Relancer le produit",

                    description:
                        moment.description,

                    priorite: "haute",

                    type: "manager",

                });

            }

        });

        // Badge

        if (
            intelligence.badges.length > 0
        ) {

            actions.push({

                id: "ACTION_BADGE",

                titre:
                    "Féliciter le conseiller",

                description:
                    "Un nouveau badge vient d'être obtenu.",

                priorite: "normale",

                type: "notification",

            });

        }

        return actions;

    }

}