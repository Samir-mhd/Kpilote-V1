/** Ordre canonique des produits KPILOTE — à importer partout pour cohérence. */
export const PRODUITS_ORDRE = [
    { code: "box",         label: "Box",         emoji: "📦", key: "box"         as const },
    { code: "forfaits",    label: "Forfaits",    emoji: "📱", key: "forfaits"    as const },
    { code: "telephones",  label: "Téléphones",  emoji: "📲", key: "telephones"  as const },
    { code: "mcafee",      label: "McAfee",      emoji: "🛡️", key: "mcafee"      as const },
    { code: "assurance",   label: "Assurance",   emoji: "✅", key: "assurance"   as const },
    { code: "avis_google", label: "Avis Google", emoji: "⭐", key: "avis_google" as const },
    { code: "recap_commercial", label: "Récap commercial", emoji: "📋", key: "recap_commercial" as const },
    { code: "spiderhome",  label: "Spiderhome",  emoji: "🏠", key: "spiderhome"  as const },
] as const;

export type ProduitCode = typeof PRODUITS_ORDRE[number]["code"];

/** Spiderhome = historisation, pas un acte commercial → absent de tous les classements/rankings.
 *  Avis Google et Récap commercial restent visibles ici (colonne + résultats par conseiller),
 *  mais sont exclus du total qui sert à classer (voir PRODUITS_HORS_TOTAL_CLASSEMENT). */
export const PRODUITS_CLASSEMENT = PRODUITS_ORDRE.filter((p) => p.code !== "spiderhome");

/** Produits comptés/affichés dans le classement mais exclus du total utilisé pour classer/trier
 *  (pas des actes commerciaux au même titre que Box/Forfaits/etc.). */
export const PRODUITS_HORS_TOTAL_CLASSEMENT: ProduitCode[] = ["avis_google", "recap_commercial"];

/** Pas des actes commerciaux : à exclure de tout comptage "ventes/actes du jour" (Accueil, Mes
 *  stats...). Spiderhome (historisation), Avis Google et Récap commercial (suivis sans prime). */
export const PRODUITS_HORS_ACTES: ProduitCode[] = ["spiderhome", "avis_google", "recap_commercial"];
