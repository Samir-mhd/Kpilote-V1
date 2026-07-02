import { supabase } from "@/lib/supabase";

export async function envoyerFelicitation(data: {

    manager: string;

    conseiller: string;

    message: string;

}) {

    const { error } = await supabase

        .from("felicitations")

        .insert({

            manager: data.manager,

            conseiller: data.conseiller,

            message: data.message,

        });

    if (error) {

        throw error;

    }

}

export async function chargerFelicitations() {

    const { data, error } = await supabase

        .from("felicitations")

        .select("*")

        .order(
            "created_at",
            {
                ascending: false,
            }
        )

        .limit(15);

    if (error) {

        throw error;

    }

    return data ?? [];

}