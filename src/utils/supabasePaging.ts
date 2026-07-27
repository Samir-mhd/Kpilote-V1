/**
 * Supabase/PostgREST plafonne les résultats à 1000 lignes par requête par défaut.
 * Au-delà (ex : ventes de toute l'équipe sur un mois), les lignes en trop sont
 * silencieusement coupées, sans tri garanti → des totaux qui varient d'un appel
 * à l'autre. Cette fonction pagine automatiquement pour tout récupérer.
 */
export async function fetchToutesLesLignes<T>(
    requete: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
    tailleLot = 1000
): Promise<T[]> {
    const toutes: T[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await requete(from, from + tailleLot - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        toutes.push(...data);
        if (data.length < tailleLot) break;
        from += tailleLot;
    }
    return toutes;
}
