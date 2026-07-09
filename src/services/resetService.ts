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
/**
 * Sauvegarde les valeurs saisies dans le Cerebro Check comme ventes du mois.
 * Les entrées sont BACKDATÉES au 1er du mois à midi (heure locale) :
 *   - getVentesDuJour (dashboard) ne les compte PAS (filtre aujourd'hui)
 *   - getVentesDuMois (résultats + prochain check) les compte ✓
 * Appelé UNIQUEMENT après un reset manager — jamais lors d'un check normal.
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

    // Backdaté au 1er du mois à midi pour ne pas parasiter getVentesDuJour
    const now = new Date();
    const premierMois = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0).toISOString();

    const inserts = (produits ?? [])
        .map((p: any) => ({
            conseiller_id: conseillerId,
            produit_id:    p.id,
            quantite:      values[p.code] ?? 0,
            source:        "cerebro_check",
            created_at:    premierMois,
        }))
        .filter(r => r.quantite > 0);

    if (inserts.length === 0) return;

    const { error } = await supabase.from("ventes").insert(inserts);
    if (error) throw new Error(error.message ?? "Erreur sauvegarde check Cerebro");
}

/**
 * Ajuste les entrées cerebro_check en mode normal (sans reset préalable).
 * Calcule la différence entre le total désiré et les ventes réelles existantes,
 * puis remplace les anciennes entrées cerebro_check par le delta.
 * Si le delta est nul ou négatif (ventes réelles suffisantes), rien n'est inséré.
 */
export async function ajusterCheckCerebro(
    conseillerId: string,
    desiredTotals: Record<string, number> // { produitCode: total_désiré }
): Promise<void> {
    const debut = debutMois();
    const fin   = finMois();

    const codes = Object.keys(desiredTotals);
    if (codes.length === 0) return;

    // 1. Résoudre les codes en IDs produit
    const { data: produits, error: errP } = await supabase
        .from("produits")
        .select("id, code")
        .in("code", codes);
    if (errP) throw new Error(errP.message ?? "Erreur récupération produits");

    const produitsMap: Record<string, string> = {};
    (produits ?? []).forEach((p: any) => { produitsMap[p.code] = p.id; });

    // 2. Récupérer les ventes réelles (hors cerebro_check) du mois par produit
    const { data: actualVentes } = await supabase
        .from("ventes")
        .select("produit_id, quantite")
        .eq("conseiller_id", conseillerId)
        .or("source.neq.cerebro_check,source.is.null")
        .gte("created_at", debut)
        .lte("created_at", fin);

    const actualByProduitId: Record<string, number> = {};
    (actualVentes ?? []).forEach((v: any) => {
        actualByProduitId[v.produit_id] = (actualByProduitId[v.produit_id] ?? 0) + v.quantite;
    });

    // 3. Supprimer les anciennes entrées cerebro_check du mois
    await supabase
        .from("ventes")
        .delete()
        .eq("conseiller_id", conseillerId)
        .eq("source", "cerebro_check")
        .gte("created_at", debut)
        .lte("created_at", fin);

    // 4. Insérer les nouveaux ajustements (delta = désiré - réel, si > 0)
    const now = new Date();
    const premierMois = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0).toISOString();

    const inserts = codes
        .map(code => {
            const produitId = produitsMap[code];
            if (!produitId) return null;
            const actual  = actualByProduitId[produitId] ?? 0;
            const desired = desiredTotals[code] ?? 0;
            const delta   = desired - actual;
            return { conseiller_id: conseillerId, produit_id: produitId, quantite: delta, source: "cerebro_check", created_at: premierMois };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.quantite > 0);

    if (inserts.length === 0) return;
    const { error } = await supabase.from("ventes").insert(inserts);
    if (error) throw new Error(error.message ?? "Erreur ajustement check Cerebro");
}

// ── Garde l'ancien nom pour compatibilité (délègue au nouveau) ─────────────────
export async function resetVentesDuJour(
    conseillerId: string,
    produitCodes: string[] | null
): Promise<void> {
    return resetVentesDuMois(conseillerId, produitCodes);
}

/** Retourne la date du dernier check complété (format YYYY-MM-DD), ou null si jamais fait. */
export async function getLastCheckDate(conseillerId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from("conseillers")
        .select("last_check_date")
        .eq("id", conseillerId)
        .maybeSingle();
    if (error || !data) return null;
    return data.last_check_date ?? null;
}

/** Marque le check du matin comme fait aujourd'hui (persisté en base, multi-appareils). */
export async function marquerCheckFait(conseillerId: string): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ last_check_date: dateLocale() })
        .eq("id", conseillerId);
}

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";

/**
 * Ajuste les totaux boutique à partir du Cerebro Check manager.
 * Insère les deltas comme ventes source="cerebro_check" liées au MANAGER_UUID.
 * Identique à ajusterCheckCerebro mais agrège TOUS les conseillers.
 */
export async function ajusterCheckCerebroManager(
    desiredTotals: Record<string, number> // { produitCode: total_désiré_boutique }
): Promise<void> {
    const debut = debutMois();
    const fin   = finMois();
    const codes = Object.keys(desiredTotals);
    if (codes.length === 0) return;

    const { data: produits, error: errP } = await supabase
        .from("produits")
        .select("id, code")
        .in("code", codes);
    if (errP) throw new Error(errP.message ?? "Erreur récupération produits");

    const produitsMap: Record<string, string> = {};
    (produits ?? []).forEach((p: any) => { produitsMap[p.code] = p.id; });

    // Somme de TOUTES les ventes du mois, sauf les ajustements manager existants
    const { data: allVentes } = await supabase
        .from("ventes")
        .select("produit_id, quantite, source, conseiller_id")
        .gte("created_at", debut)
        .lte("created_at", fin);

    const actualByProduitId: Record<string, number> = {};
    (allVentes ?? []).forEach((v: any) => {
        if (v.conseiller_id === MANAGER_UUID && v.source === "cerebro_check") return;
        actualByProduitId[v.produit_id] = (actualByProduitId[v.produit_id] ?? 0) + (v.quantite ?? 1);
    });

    // Supprimer les anciens ajustements manager du mois
    await supabase
        .from("ventes")
        .delete()
        .eq("conseiller_id", MANAGER_UUID)
        .eq("source", "cerebro_check")
        .gte("created_at", debut)
        .lte("created_at", fin);

    const premierMois = new Date();
    premierMois.setDate(1);
    premierMois.setHours(12, 0, 0, 0);

    const inserts = codes
        .map(code => {
            const produitId = produitsMap[code];
            if (!produitId) return null;
            const actual  = actualByProduitId[produitId] ?? 0;
            const desired = desiredTotals[code] ?? 0;
            const delta   = desired - actual;
            if (delta <= 0) return null;
            return { conseiller_id: MANAGER_UUID, produit_id: produitId, quantite: delta, source: "cerebro_check", created_at: premierMois.toISOString() };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

    if (inserts.length === 0) return;
    const { error } = await supabase.from("ventes").insert(inserts);
    if (error) throw new Error(error.message ?? "Erreur ajustement Cerebro manager");
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

/** Remet last_check_date à null pour permettre au conseiller de refaire son check. */
export async function resetCheckDate(conseillerId: string): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ last_check_date: null })
        .eq("id", conseillerId);
}

/** Remet last_check_date à null pour TOUS les conseillers (action manager). */
export async function resetAllCheckDates(): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ last_check_date: null })
        .neq("id", "00000000-0000-0000-0000-000000000001");
}
