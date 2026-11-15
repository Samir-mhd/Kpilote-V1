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
            if (delta === 0) return null;
            return { conseiller_id: conseillerId, produit_id: produitId, quantite: delta, source: "cerebro_check", created_at: premierMois };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

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


/** Remet last_check_date à null pour TOUS les conseillers (action manager). */
export async function resetAllCheckDates(): Promise<void> {
    await supabase
        .from("conseillers")
        .update({ last_check_date: null })
        .neq("id", "00000000-0000-0000-0000-000000000001");
}

// ── Cerebro Check : ventes combo (McAfee Mobile, Assurance essentielle, Canal+) ──────────
// Elles vivent dans variable_actes_jour, pas dans ventes : même principe d'ajustement par écart,
// avec des lignes à 0 € (la cagnotte ne bouge pas) datées du 1er du mois et marquées
// produit_code = "cerebro_check" pour être remplacées au check suivant.

export type CodeComboCheck = "mcafee_mobile" | "assurance_essentielle" | "canal_plus";
const LABEL_CANAL_CHECK = "Canal+ Option 2"; // libellé compté comme Canal+ (options 2 et 3)

export async function ajusterCheckCerebroCombos(
    conseillerId: string,
    desiredTotals: Partial<Record<CodeComboCheck, number>>
): Promise<void> {
    const codes = Object.keys(desiredTotals) as CodeComboCheck[];
    if (codes.length === 0) return;

    const now = new Date();
    const premier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const dernier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    const [{ data: bonus }, { data: actes }] = await Promise.all([
        supabase.from("variable_bonus_manuels").select("id, label").eq("categorie", "autres_primes"),
        supabase.from("variable_actes_jour")
            .select("champ, label, bonus_manuel_id, quantite, produit_code")
            .eq("conseiller_id", conseillerId)
            .gte("jour", premier)
            .lte("jour", dernier),
    ]);
    const idsMcafee = (bonus ?? [])
        .filter((b: { label: string }) => b.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("mcafee"))
        .map((b: { id: string }) => b.id);

    // Réalisé réel du mois (hors anciens ajustements du check).
    const reel: Record<CodeComboCheck, number> = { mcafee_mobile: 0, assurance_essentielle: 0, canal_plus: 0 };
    (actes ?? []).forEach((a: { champ: string | null; label: string; bonus_manuel_id: string | null; quantite: number | null; produit_code: string | null }) => {
        if (a.produit_code === "cerebro_check") return;
        const q = a.quantite ?? 1;
        if (a.champ === "assurance_essentielle") reel.assurance_essentielle += q;
        if (a.bonus_manuel_id && idsMcafee.includes(a.bonus_manuel_id)) reel.mcafee_mobile += q;
        if (a.label === "Canal+ Option 2" || a.label === "Canal+ Option 3") reel.canal_plus += q;
    });

    await supabase.from("variable_actes_jour")
        .delete()
        .eq("conseiller_id", conseillerId)
        .eq("produit_code", "cerebro_check")
        .gte("jour", premier)
        .lte("jour", dernier);

    const base = { conseiller_id: conseillerId, jour: premier, montant: 0, produit_code: "cerebro_check" };
    const inserts = codes.flatMap((code) => {
        const delta = (desiredTotals[code] ?? 0) - reel[code];
        if (delta === 0) return [];
        if (code === "assurance_essentielle") return [{ ...base, label: "Assurance essentielle (Cerebro Check)", quantite: delta, champ: "assurance_essentielle" }];
        if (code === "mcafee_mobile") return idsMcafee[0] ? [{ ...base, label: "McAfee Mobile (Cerebro Check)", quantite: delta, bonus_manuel_id: idsMcafee[0] }] : [];
        return [{ ...base, label: LABEL_CANAL_CHECK, quantite: delta }];
    });
    if (inserts.length === 0) return;
    const { error } = await supabase.from("variable_actes_jour").insert(inserts);
    if (error) throw new Error(error.message ?? "Erreur ajustement check Cerebro (combos)");
}
