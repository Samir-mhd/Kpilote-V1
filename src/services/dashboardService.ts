import { getMissionsReelles } from "@/services/missionsReelles";
import { analyserDashboard } from "@/engine/contextEngine";
import { chargerChallenge } from "@/services/challengeService";

export async function construireDashboard(
    conseillerId: string
) {

    const missions =
        await getMissionsReelles(
            conseillerId
        );

    const contexte =
        analyserDashboard(

            missions.map((mission) => ({

                produit: mission.produit,

                objectif: mission.objectif,

                realise: mission.realise,

            }))

        );

    const challenge =
        await chargerChallenge(
            conseillerId
        );

    return {

        heroMessage:
            contexte.messageHero,

        coachMessage:
            contexte.messageCoach,

        missions,

        challenge,

    };

}