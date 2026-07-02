import { supabase } from "@/lib/supabase";

function dateLocale(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Supprime les ventes du jour pour un conseiller.
 * @param produitCodes  null = tous les produits, sinon liste de codes ("box", "forfaits"…)
 */
export async function resetVentesDuJour(
    conseillerId: string,
    produitCodes: string[] | null
): Promise<void> {
    const today = dateLocale();
    const debut = `${today}T00:00:00.000Z`;
    const fin   = `${today}T23:59:59.999Z`;

    if (produitCodes === null) {
        // Supprime toutes les ventes du jour
        const { error } = await supabase
            .from("ventes")
            .delete()
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debut)
            .lte("created_at", fin);
        if (error) throw new Error(error.message ?? "Erreur reset ventes");
    } else {
        // Récupère les IDs Supabase des produits sélectionnés
        const { data: produits, error: errP } = await supabase
            .from("produits")
            .select("id, code")
            .in("code", produitCodes);
        if (errP) throw new Error(errP.message ?? "Erreur récupération produits");

        const ids = (produits ?? []).map((p: any) => p.id);
        if (ids.length === 0) return;

        const { error } = await supabase
            .from("ventes")
            .delete()
            .eq("conseiller_id", conseillerId)
            .in("produit_id", ids)
            .gte("created_at", debut)
            .lte("created_at", fin);
        if (error) throw new Error(error.message ?? "Erreur reset ventes produits");
    }
}

/**
 * Force le check Cerebro pour ce conseiller au prochain chargement de son dashboard.
 * Nécessite la colonne force_check_date dans la table conseillers.
 */
export async function forcerCerebroCheck(conseillerId: string): Promise<void> {
    const { error } = await supabase
        .from("conseillers")
        .update({ force_check_date: dateLocale() })
        .eq("id", conseillerId);
    if (error) throw new Error(error.message ?? "Erreur force check Cerebro");
}

/**
 * Vérifie si le check Cerebro est forcé pour ce conseiller aujourd'hui.
 */
export async function checkForceActive(conseillerId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("conseillers")
        .select("force_check_date")
        .eq("id", conseillerId)
        .maybeSingle();
    if (error || !data) return false;
    return data.force_check_date === dateLocale();
}

/**
 * Efface le flag après que le conseiller a complété le check.
 */
export async function clearForceCheck(conseillerId: string): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ force_check_date: null })
        .eq("id", conseillerId);
}
