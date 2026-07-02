import { KPI } from "@/types/dashboard";
import { ConseillerClassement } from "@/services/classementManager";

export type Conseiller = {

    nom: string;

    ventes: number;

    objectif: number;

    fibre: number;

    box: number;

};

export type CoachDecision = {

    priorite: string;

    feliciter: string;

    accompagner: string;

    action: string;

};

export function analyserEquipe(

    equipe: Conseiller[]

): CoachDecision {

    const meilleur =

        [...equipe]

            .sort(

                (a, b) =>

                    b.ventes - a.ventes

            )[0];

    const plusFaible =

        [...equipe]

            .sort(

                (a, b) =>

                    a.ventes - b.ventes

            )[0];

    const fibre =

        equipe.reduce(

            (t, c) =>

                t + c.fibre,

            0

        );

    const box =

        equipe.reduce(

            (t, c) =>

                t + c.box,

            0

        );

    const priorite =

        fibre < box

            ? "Accélérer les ventes Fibre."

            : "Accélérer les ventes Box.";

    return {

        priorite,

        feliciter:

            `${meilleur.nom} est en tête avec ${meilleur.ventes} ventes.`,

        accompagner:

            `${plusFaible.nom} est en difficulté aujourd'hui.`,

        action:

            `Lancer un défi entre ${meilleur.nom} et ${plusFaible.nom}.`,

    };

}

export function construireDecision({
    kpis,
    classement,
}: {
    kpis: KPI[];
    classement: ConseillerClassement[];
}): CoachDecision {

    const meilleur = classement[0];
    const plusFaible = classement[classement.length - 1];

    const kpiFaible = [...kpis].sort((a, b) => {
        const tauxA = a.objectif > 0 ? a.realise / a.objectif : 1;
        const tauxB = b.objectif > 0 ? b.realise / b.objectif : 1;
        return tauxA - tauxB;
    })[0];

    return {
        priorite: kpiFaible
            ? `Accélérer les ventes ${kpiFaible.nom}.`
            : "Maintenir le rythme actuel.",
        feliciter: `${meilleur.prenom} est en tête avec ${meilleur.ventes} ventes.`,
        accompagner: `${plusFaible.prenom} est en difficulté aujourd'hui.`,
        action: `Lancer un défi entre ${meilleur.prenom} et ${plusFaible.prenom}.`,
    };

}