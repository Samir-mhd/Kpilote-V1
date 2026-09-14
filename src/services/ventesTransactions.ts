/**
 * Nombre d'articles par vente : une "transaction" regroupe tous les articles vendus au même
 * client en une fois — un clic sur une carte + les questions de rebond qui suivent immédiatement
 * (ex: forfait + assurance essentielle acceptée juste après) comptent comme UNE vente à 2
 * articles, tout comme la carte "Vente combo". Un clic sur une carte isolée, sans rebond accepté,
 * reste une vente à 1 article. Ne compte que les articles commerciaux qualifiants (voir
 * ARTICLES_QUALIFIANTS dans dashboard/page.tsx) — jamais le boost constructeur, Canal+, 4P,
 * Avis Google, Spiderhome ou Récap commercial.
 */
import { supabase } from "@/lib/supabase";

export async function enregistrerTransaction(conseillerId: string, nbArticles: number): Promise<void> {
    if (nbArticles <= 0) return;
    await supabase.from("ventes_transactions").insert({ conseiller_id: conseillerId, nb_articles: nbArticles });
}

export type StatsTransactionsMois = {
    totalVentes: number;
    totalCombo: number; // ventes à plus d'1 article
    parNbArticles: Record<number, number>; // clés 1..5 (5 = "5 ou plus")
    moyenneArticles: number;
};

function moisDebutFin(annee: number, mois: number) {
    const debut = new Date(annee, mois - 1, 1).toISOString();
    const fin = new Date(annee, mois, 0, 23, 59, 59, 999).toISOString();
    return { debut, fin };
}

export async function getStatsTransactionsMois(conseillerId: string, annee: number, mois: number): Promise<StatsTransactionsMois> {
    const { debut, fin } = moisDebutFin(annee, mois);
    const { data } = await supabase
        .from("ventes_transactions")
        .select("nb_articles")
        .eq("conseiller_id", conseillerId)
        .gte("created_at", debut)
        .lte("created_at", fin);

    const rows = data ?? [];
    const parNbArticles: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sommeArticles = 0;
    rows.forEach((r: any) => {
        const n = Math.max(1, r.nb_articles ?? 1);
        const bucket = Math.min(n, 5);
        parNbArticles[bucket] = (parNbArticles[bucket] ?? 0) + 1;
        sommeArticles += n;
    });

    return {
        totalVentes: rows.length,
        totalCombo: rows.filter((r: any) => (r.nb_articles ?? 1) > 1).length,
        parNbArticles,
        moyenneArticles: rows.length > 0 ? Math.round((sommeArticles / rows.length) * 100) / 100 : 0,
    };
}

/** Moyenne d'articles par vente pour un ensemble de conseillers depuis une date donnée — classement. */
export async function getMoyenneArticlesParConseiller(
    conseillerIds: string[],
    debutIso: string
): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (conseillerIds.length === 0) return result;

    const { data } = await supabase
        .from("ventes_transactions")
        .select("conseiller_id, nb_articles")
        .in("conseiller_id", conseillerIds)
        .gte("created_at", debutIso);

    const parConseiller: Record<string, { somme: number; nb: number }> = {};
    (data ?? []).forEach((r: any) => {
        if (!parConseiller[r.conseiller_id]) parConseiller[r.conseiller_id] = { somme: 0, nb: 0 };
        parConseiller[r.conseiller_id].somme += r.nb_articles ?? 1;
        parConseiller[r.conseiller_id].nb += 1;
    });

    conseillerIds.forEach((id) => {
        const v = parConseiller[id];
        result[id] = v && v.nb > 0 ? Math.round((v.somme / v.nb) * 100) / 100 : 0;
    });
    return result;
}
