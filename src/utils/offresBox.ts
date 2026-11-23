/**
 * Tarifs utilisés par la calculatrice box (Outils). PRIX INDICATIFS à valider en boutique :
 * tout est centralisé ici pour pouvoir les corriger sans toucher à l'écran.
 */

/** Plateformes de streaming et leurs offres (prix mensuels publics). */
export type CodeService = "netflix" | "prime" | "disney" | "canal" | "bein";
export type OffreService = { id: string; label: string; prix: number; rang: number };

export const SERVICES: { code: CodeService; label: string; emoji: string; offres: OffreService[] }[] = [
    { code: "netflix", label: "Netflix", emoji: "🎬", offres: [
        { id: "netflix_pub", label: "Essentiel avec pub", prix: 7.99, rang: 1 },
        { id: "netflix_standard", label: "Standard", prix: 14.99, rang: 2 },
        { id: "netflix_premium", label: "Premium", prix: 21.99, rang: 3 },
    ] },
    { code: "prime", label: "Amazon Prime", emoji: "📦", offres: [
        { id: "prime", label: "Prime", prix: 6.99, rang: 1 },
    ] },
    { code: "disney", label: "Disney+", emoji: "🏰", offres: [
        { id: "disney_pub", label: "Standard avec pub", prix: 5.99, rang: 1 },
        { id: "disney_standard", label: "Standard", prix: 9.99, rang: 2 },
        { id: "disney_premium", label: "Premium", prix: 13.99, rang: 3 },
    ] },
    { code: "canal", label: "Canal+", emoji: "📺", offres: [
        { id: "canal_essentiel", label: "Canal+", prix: 24.99, rang: 1 },
        { id: "canal_cine", label: "Ciné Séries", prix: 29.99, rang: 2 },
        { id: "canal_sport", label: "Sport", prix: 34.99, rang: 2 },
        { id: "canal_integral", label: "Intégrale", prix: 49.99, rang: 3 },
    ] },
    { code: "bein", label: "beIN Sports", emoji: "⚽", offres: [
        { id: "bein", label: "beIN Sports", prix: 15, rang: 1 },
    ] },
];

/** Freebox proposées, avec les services inclus (code → rang de l'offre incluse). */
export type Freebox = { id: string; nom: string; prix: number; inclus: Partial<Record<CodeService, number>>; inclusLabels: string[] };
export const FREEBOX: Freebox[] = [
    { id: "pop_s", nom: "Freebox Pop S", prix: 24.99, inclus: {}, inclusLabels: [] },
    { id: "pop", nom: "Freebox Pop", prix: 34.99, inclus: {}, inclusLabels: [] },
    { id: "ultra_essentiel", nom: "Freebox Ultra Essentiel", prix: 39.99, inclus: {}, inclusLabels: [] },
    { id: "ultra", nom: "Freebox Ultra", prix: 49.99,
        inclus: { netflix: 1, disney: 1, prime: 1 },
        inclusLabels: ["Netflix Essentiel avec pub", "Disney+ avec pub", "Amazon Prime"] },
];

/** Forfaits mobiles Free (prix avec la remise abonné Freebox quand elle existe). */
export const FORFAITS_FREE: { id: string; nom: string; prix: number; note?: string }[] = [
    { id: "free_5g", nom: "Forfait Free 5G", prix: 15.99, note: "avec remise abonné Freebox" },
    { id: "serie_free", nom: "Série Free", prix: 9.99 },
    { id: "forfait_2", nom: "Forfait 2 €", prix: 0, note: "offert aux abonnés Freebox" },
];

/** Offres Canal+ en promotion pour les abonnés Freebox. */
export const CANAL_PROMOS_FREE: { id: string; label: string; prix: number }[] = [
    { id: "canal_free", label: "Canal+ (offre abonné Freebox)", prix: 19.99 },
    { id: "canal_cine_free", label: "Canal+ Ciné Séries (offre abonné)", prix: 24.99 },
    { id: "canal_sport_free", label: "Canal+ Sport (offre abonné)", prix: 24.99 },
];

/** Protection mobile Free (par mois). */
export const PROTECTION_FREE = 8.99;
