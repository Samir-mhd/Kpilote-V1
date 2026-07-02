import { envoyerFelicitation } from "./congratulationSupabase";

export async function feliciterConseiller(

    manager: string,

    conseiller: string,

    message: string

) {

    await envoyerFelicitation({

        manager,

        conseiller,

        message,

    });

}