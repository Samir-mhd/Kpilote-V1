/**
 * Coefficient journalier du "Récap commercial" — objectif auto = coeff × jours planifiés du
 * mois, exactement comme Spiderhome, mais réglable par le manager et réellement synchronisé
 * (contrairement au coefficient Spiderhome, purement local à l'aperçu manager).
 */
import { supabase } from "@/lib/supabase";

export async function getCoeffRecapCommercial(): Promise<number> {
    const { data } = await supabase
        .from("recap_commercial_config")
        .select("coeff")
        .eq("id", "default")
        .maybeSingle();
    return data?.coeff ?? 1;
}

export async function sauvegarderCoeffRecapCommercial(coeff: number): Promise<void> {
    await supabase
        .from("recap_commercial_config")
        .upsert({ id: "default", coeff, updated_at: new Date().toISOString() });
}
