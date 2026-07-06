import { supabase } from "@/lib/supabase";

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";

export type HistoriqueItem = {
    id: string;
    nomMoi: string;
    nomAdversaire: string;
    produit: string;
    scoreMoi: number;
    scoreAdversaire: number;
    duree: string;
    date: string;
    resultat: "victory" | "defeat" | "draw" | "en_cours";
    status: string;
};

export async function chargerHistoriqueChallenges(
    conseillerId: string,
    nomMoi = ""
): Promise<HistoriqueItem[]> {
    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .or(`createur.eq.${conseillerId},adversaire.eq.${conseillerId}`)
        .eq("status", "finished")          // historique = uniquement les terminés
        .order("created_at", { ascending: false })
        .limit(15);

    if (error) throw new Error(error?.message ?? "Erreur chargement historique");
    if (!data?.length) return [];

    // Charge les noms depuis la table conseillers
    const ids = [...new Set(data.flatMap((c: any) => [c.createur, c.adversaire]).filter(Boolean))];
    const { data: conseillers } = await supabase
        .from("conseillers")
        .select("id, nom")
        .in("id", ids);

    const nomMap: Record<string, string> = {};
    (conseillers ?? []).forEach((c: any) => { nomMap[c.id] = c.nom; });

    return data.map((c: any) => {
        const isCréateur = c.createur === conseillerId;

        const autreId = isCréateur ? c.adversaire : c.createur;
        const nomAdversaire =
            autreId === MANAGER_UUID
                ? "Votre manager"
                : nomMap[autreId] ??
                  (isCréateur ? c.adversaire_nom : c.createur_nom) ??
                  "Inconnu";

        const scoreMoi        = isCréateur ? (c.score_createur ?? 0) : (c.score_adversaire ?? 0);
        const scoreAdversaire = isCréateur ? (c.score_adversaire ?? 0) : (c.score_createur ?? 0);

        let resultat: HistoriqueItem["resultat"];
        if (c.vainqueur === conseillerId) {
            resultat = "victory";
        } else if (c.vainqueur != null) {
            resultat = "defeat";
        } else {
            // Fallback sur les scores si la colonne vainqueur est absente
            if (scoreMoi > scoreAdversaire)        resultat = "victory";
            else if (scoreAdversaire > scoreMoi)   resultat = "defeat";
            else                                    resultat = "draw";
        }

        return {
            id: c.id,
            nomMoi: nomMoi || nomMap[conseillerId] || "Moi",
            nomAdversaire,
            produit: c.produit ?? "—",
            scoreMoi,
            scoreAdversaire,
            duree: `${c.duree ?? 30} min`,
            date: new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
            resultat,
            status: c.status ?? "",
        };
    });
}

