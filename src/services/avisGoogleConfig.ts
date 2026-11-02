/**
 * Avis Google : objectif mensuel auto = coeff × jours planifiés du mois du conseiller (comme le
 * Récap commercial), réglable par le manager. Contrairement au Récap, il reste dans la cascade
 * semaine figée / jour dynamique (objectifsSemaineFiges) : seul l'objectif MENSUEL est auto.
 *
 * Le coefficient est stocké dans `recap_commercial_config`, ligne id "avis_google".
 */
import { supabase } from "@/lib/supabase";
import { getJoursTravailTous } from "@/services/planningService";

const CONFIG_ID = "avis_google";
const COEFF_DEFAUT = 1;

export async function getCoeffAvisGoogle(): Promise<number> {
    const { data } = await supabase
        .from("recap_commercial_config")
        .select("coeff")
        .eq("id", CONFIG_ID)
        .maybeSingle();
    return data?.coeff ?? COEFF_DEFAUT;
}

export async function sauvegarderCoeffAvisGoogle(coeff: number): Promise<void> {
    const { error } = await supabase
        .from("recap_commercial_config")
        .upsert({ id: CONFIG_ID, coeff, updated_at: new Date().toISOString() });
    if (error) throw error;
}

/** Objectif mensuel Avis Google par conseiller (mois de `reference`). */
export async function getObjectifsAvisGoogleMois(
    conseillerIds: string[],
    reference: Date = new Date()
): Promise<Record<string, number>> {
    if (conseillerIds.length === 0) return {};
    const [coeff, jours] = await Promise.all([
        getCoeffAvisGoogle(),
        getJoursTravailTous(conseillerIds, reference.getFullYear(), reference.getMonth() + 1),
    ]);
    const result: Record<string, number> = {};
    conseillerIds.forEach((id) => { result[id] = Math.round(coeff * (jours[id] ?? 0)); });
    return result;
}
