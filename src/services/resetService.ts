import { supabase } from "@/lib/supabase";

function dateLocale(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function debutMois(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;
}

function finMois(): string {
    const d = new Date();
    const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dernier.getDate()).padStart(2, "0")}T23:59:59.999Z`;
}

/**
 * Supprime TOUTES les ventes du MOIS EN COURS pour un conseiller.
 * @param produitCodes  null = tous les produits, sinon liste de codes ("box", "forfaits"…)
 */
export async function resetVentesDuMois(
    conseillerId: string,
    produitCodes: string[] | null
): Promise<void> {
    const debut = debutMois();
    const fin   = finMois();

    if (produitCodes === null) {
        const { error } = await supabase
            .from("ventes")
            .delete()
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debut)
            .lte("created_at", fin);
        if (error) throw new Error(error.message ?? "Erreur reset ventes");
    } else {
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
 * Sauvegarde les valeurs saisies dans le Cerebro Check comme ventes du mois.
 * Insère une ligne par produit avec la quantité totale déclarée.
 * Appelé après un reset — remplace les ventes supprimées par les chiffres réels.
 */
export async function sauvegarderCheckCerebro(
    conseillerId: string,
    values: Record<string, number> // { produitCode: quantite }
): Promise<void> {
    const codes = Object.keys(values).filter(k => (values[k] ?? 0) > 0);
    if (codes.length === 0) return;

    const { data: produits, error: errP } = await supabase
        .from("produits")
        .select("id, code")
        .in("code", codes);
    if (errP) throw new Error(errP.message ?? "Erreur récupération produits");

    const inserts = (produits ?? []).map((p: any) => ({
        conseiller_id: conseillerId,
        produit_id:    p.id,
        quantite:      values[p.code] ?? 0,
        source:        "cerebro_check",
    })).filter(r => r.quantite > 0);

    if (inserts.length === 0) return;

    const { error } = await supabase.from("ventes").insert(inserts);
    if (error) throw new Error(error.message ?? "Erreur sauvegarde check Cerebro");
}

// ── Garde l'ancien nom pour compatibilité (délègue au nouveau) ─────────────────
export async function resetVentesDuJour(
    conseillerId: string,
    produitCodes: string[] | null
): Promise<void> {
    return resetVentesDuMois(conseillerId, produitCodes);
}

export async function forcerCerebroCheck(conseillerId: string): Promise<void> {
    const { error } = await supabase
        .from("conseillers")
        .update({ force_check_date: dateLocale() })
        .eq("id", conseillerId);
    if (error) throw new Error(error.message ?? "Erreur force check Cerebro");
}

export async function checkForceActive(conseillerId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("conseillers")
        .select("force_check_date")
        .eq("id", conseillerId)
        .maybeSingle();
    if (error || !data) return false;
    return data.force_check_date === dateLocale();
}

export async function clearForceCheck(conseillerId: string): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ force_check_date: null })
        .eq("id", conseillerId);
}
