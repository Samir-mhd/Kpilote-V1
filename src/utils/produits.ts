/** Ordre canonique des produits KPILOTE — à importer partout pour cohérence. */
export const PRODUITS_ORDRE = [
    { code: "box",         label: "Box",         emoji: "📦", key: "box"         as const },
    { code: "forfaits",    label: "Forfaits",    emoji: "📱", key: "forfaits"    as const },
    { code: "telephones",  label: "Téléphones",  emoji: "📲", key: "telephones"  as const },
    { code: "mcafee",      label: "McAfee",      emoji: "🛡️", key: "mcafee"      as const },
    { code: "assurance",   label: "Assurance",   emoji: "✅", key: "assurance"   as const },
    { code: "avis_google", label: "Avis Google", emoji: "⭐", key: "avis_google" as const },
    { code: "spiderhome",  label: "Spiderhome",  emoji: "🏠", key: "spiderhome"  as const },
] as const;

export type ProduitCode = typeof PRODUITS_ORDRE[number]["code"];

/** Spiderhome = historisation, pas un acte commercial → absent de tous les classements/rankings. */
export const PRODUITS_CLASSEMENT = PRODUITS_ORDRE.filter((p) => p.code !== "spiderhome");
