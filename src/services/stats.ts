import { supabase } from "@/lib/supabase";

/**
 * Ventes saisies AUJOURD'HUI uniquement → dashboard conseiller (objectif journalier).
 * Repart de 0 chaque matin.
 * Fallback sans filtre de date si la colonne created_at est absente.
 */
export async function getVentesDuJour(conseillerId: string) {
    const now = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const finJour   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const { data, error } = await supabase
        .from("ventes")
        .select(`*, produits(nom, code)`)
        .eq("conseiller_id", conseillerId)
        .gte("created_at", debutJour)
        .lte("created_at", finJour);

    if (error && error.message?.includes("created_at")) {
        const { data: fallback, error: fallbackError } = await supabase
            .from("ventes")
            .select(`*, produits(nom, code)`)
            .eq("conseiller_id", conseillerId);
        if (fallbackError) throw new Error(fallbackError.message ?? "Erreur chargement ventes");
        return fallback ?? [];
    }

    if (error) throw new Error(error.message ?? "Erreur chargement ventes");
    return data ?? [];
}

/**
 * Ventes du mois en cours → page Résultats (progression mensuelle, projections).
 * Fallback sans filtre de date si la colonne created_at est absente.
 */
export async function getVentesDuMois(conseillerId: string) {
    const now = new Date();
    const annee = now.getFullYear();
    const mois  = now.getMonth() + 1;
    const dernierJour = new Date(annee, mois, 0).getDate();
    const debut = `${annee}-${String(mois).padStart(2, "0")}-01T00:00:00.000Z`;
    const fin   = `${annee}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}T23:59:59.999Z`;

    const { data, error } = await supabase
        .from("ventes")
        .select(`*, produits(nom, code)`)
        .eq("conseiller_id", conseillerId)
        .gte("created_at", debut)
        .lte("created_at", fin);

    if (error && error.message?.includes("created_at")) {
        const { data: fallback, error: fallbackError } = await supabase
            .from("ventes")
            .select(`*, produits(nom, code)`)
            .eq("conseiller_id", conseillerId);
        if (fallbackError) throw new Error(fallbackError.message ?? "Erreur chargement ventes");
        return fallback ?? [];
    }

    if (error) throw new Error(error.message ?? "Erreur chargement ventes");
    return data ?? [];
}

/**
 * Ventes depuis lundi (inclus) jusqu'à maintenant → objectif jour dynamique, recalé sur
 * l'objectif semaine figé. Exclut le Cerebro Check (backdaté au 1er du mois, pas un acte de
 * la semaine) ; inclut les corrections "reset_jour" qui doivent compter dans le réalisé réel.
 */
export async function getVentesDepuisLundi(conseillerId: string, lundi: Date) {
    const { data, error } = await supabase
        .from("ventes")
        .select(`*, produits(nom, code)`)
        .eq("conseiller_id", conseillerId)
        .or("source.is.null,source.neq.cerebro_check")
        .gte("created_at", lundi.toISOString());

    if (error) throw new Error(error.message ?? "Erreur chargement ventes semaine");
    return data ?? [];
}
