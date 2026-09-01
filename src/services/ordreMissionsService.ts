/**
 * Ordre personnalisé des cartes objectifs sur l'Accueil — chaque conseiller règle le sien
 * (Profil → "Ordre de mes objectifs"), stocké sur conseillers.ordre_missions (jsonb, tableau
 * de codes produit). Absent/vide → ordre par défaut de l'app.
 */
import { supabase } from "@/lib/supabase";

export async function getOrdreMissions(conseillerId: string): Promise<string[] | null> {
    const { data } = await supabase
        .from("conseillers")
        .select("ordre_missions")
        .eq("id", conseillerId)
        .maybeSingle();

    const ordre = data?.ordre_missions;
    return Array.isArray(ordre) && ordre.length > 0 ? ordre : null;
}

export async function saveOrdreMissions(conseillerId: string, ordre: string[]): Promise<void> {
    const { error } = await supabase
        .from("conseillers")
        .update({ ordre_missions: ordre })
        .eq("id", conseillerId);
    if (error) throw new Error(error.message);
}
