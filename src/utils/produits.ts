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

/** Spiderhome = historisation ; Récap commercial = suivi sans prime ni classement → absents de
 *  tous les classements/rankings, mais suivent les mêmes règles d'objectif que les autres. */
export const PRODUITS_CLASSEMENT = PRODUITS_ORDRE.filter(
    (p) => p.code !== "spiderhome" && p.code !== "recap_commercial"
);
