/**
 * Tarifs de la calculatrice box (Outils), relevés sur free.fr / mobile.free.fr le 23/11/2026.
 * Prix 1re année et à partir de la 2e année distingués (les promos Free durent 1 an).
 * Centralisés ici pour être corrigés facilement quand Free change ses offres.
 */

export type CodeService = "netflix" | "prime" | "disney" | "canal" | "bein";

/** Offres publiques des plateformes (ce que le client paie aujourd'hui, prix 2026). */
export type OffreService = { id: string; label: string; prix: number; rang: number };
export const SERVICES: { code: CodeService; label: string; emoji: string; offres: OffreService[] }[] = [
    { code: "netflix", label: "Netflix", emoji: "🎬", offres: [
        { id: "netflix_pub", label: "Standard avec pub", prix: 7.99, rang: 1 },
        { id: "netflix_standard", label: "Standard", prix: 14.99, rang: 2 },
        { id: "netflix_premium", label: "Premium", prix: 21.99, rang: 3 },
    ] },
    { code: "prime", label: "Amazon Prime", emoji: "📦", offres: [
        { id: "prime", label: "Prime", prix: 6.99, rang: 1 },
    ] },
    { code: "disney", label: "Disney+", emoji: "🏰", offres: [
        { id: "disney_pub", label: "Standard avec pub", prix: 6.99, rang: 1 },
        { id: "disney_standard", label: "Standard", prix: 10.99, rang: 2 },
        { id: "disney_premium", label: "Premium", prix: 15.99, rang: 3 },
    ] },
    { code: "canal", label: "Canal+", emoji: "📺", offres: [
        { id: "canal_chaine", label: "CANAL+ La Chaîne", prix: 15.99, rang: 1 },
        { id: "canal_cine", label: "Ciné Séries", prix: 29.99, rang: 2 },
        { id: "canal_sport", label: "Sport", prix: 34.99, rang: 2 },
        { id: "canal_100", label: "100 % CANAL+", prix: 44.99, rang: 3 },
    ] },
    { code: "bein", label: "beIN Sports", emoji: "⚽", offres: [
        { id: "bein", label: "beIN Sports", prix: 15, rang: 1 },
    ] },
];

/** Prix d'une ligne chez Free : 1re année, à partir de la 2e année, mois offerts la 1re année. */
export type PrixFree = { an1: number; an2: number; moisOfferts?: number; note?: string };

/** Freebox (sans engagement). */
export type Freebox = { id: string; nom: string; prix: PrixFree; inclusLabels: string[] };
export const FREEBOX: Freebox[] = [
    { id: "pop_s", nom: "Freebox Pop S", prix: { an1: 24.99, an2: 29.99 }, inclusLabels: [] },
    { id: "pop", nom: "Freebox Pop", prix: { an1: 29.99, an2: 39.99 }, inclusLabels: [] },
    { id: "ultra_essentiel", nom: "Freebox Ultra Essentiel", prix: { an1: 39.99, an2: 49.99 }, inclusLabels: ["TV by CANAL", "Eurosport 1"] },
    { id: "ultra", nom: "Freebox Ultra", prix: { an1: 49.99, an2: 59.99 },
        inclusLabels: ["Netflix Standard avec pub", "Disney+ Standard avec pub", "Amazon Prime", "CANAL+ La Chaîne", "Universal+"] },
];

/** Frais de mise en service d'une Freebox. */
export const MISE_EN_SERVICE = 49;

/**
 * Offres de streaming proposées chez Free pour une box donnée (prix par mois).
 * Ultra : Netflix / Disney+ avec pub, Prime et CANAL+ La Chaîne inclus ; montées en gamme payantes.
 * Autres box : prix via Free, avec mois offerts la 1re année quand Free les propose.
 */
export type OffreFree = { id: string; label: string; prix: PrixFree; rang: number };
export function offresFree(code: CodeService, boxId: string): OffreFree[] {
    const ultra = boxId === "ultra";
    const essentielOuPop = boxId === "ultra_essentiel" || boxId === "pop";
    const p = (an1: number, an2 = an1, moisOfferts?: number, note?: string): PrixFree => ({ an1, an2, moisOfferts, note });
    switch (code) {
        case "netflix":
            return ultra
                ? [
                    { id: "netflix_pub", label: "Standard avec pub", prix: p(0, 0, 0, "inclus dans l'Ultra"), rang: 1 },
                    { id: "netflix_standard", label: "Standard", prix: p(9, 9, 0, "supplément Ultra"), rang: 2 },
                    { id: "netflix_premium", label: "Premium", prix: p(16, 16, 0, "supplément Ultra"), rang: 3 },
                ]
                : [
                    { id: "netflix_pub", label: "Standard avec pub", prix: p(7.99), rang: 1 },
                    { id: "netflix_standard", label: "Standard", prix: p(14.99), rang: 2 },
                    { id: "netflix_premium", label: "Premium", prix: p(21.99), rang: 3 },
                ];
        case "disney":
            return ultra
                ? [
                    { id: "disney_pub", label: "Standard avec pub", prix: p(0, 0, 0, "inclus dans l'Ultra"), rang: 1 },
                    { id: "disney_standard", label: "Standard", prix: p(5, 5, 0, "supplément Ultra"), rang: 2 },
                    { id: "disney_premium", label: "Premium", prix: p(10, 10, 0, "supplément Ultra"), rang: 3 },
                ]
                : [
                    { id: "disney_pub", label: "Standard avec pub", prix: p(6.99, 6.99, essentielOuPop ? 3 : 0, essentielOuPop ? "3 mois inclus" : undefined), rang: 1 },
                    { id: "disney_standard", label: "Standard", prix: p(10.99), rang: 2 },
                    { id: "disney_premium", label: "Premium", prix: p(15.99), rang: 3 },
                ];
        case "prime":
            return [{ id: "prime", label: "Prime", prix: ultra ? p(0, 0, 0, "inclus dans l'Ultra") : p(6.99, 6.99, essentielOuPop ? 3 : 0, essentielOuPop ? "3 mois inclus" : undefined), rang: 1 }];
        case "canal":
            return [
                { id: "canal_chaine", label: "CANAL+ La Chaîne", prix: ultra ? p(0, 0, 0, "inclus dans l'Ultra") : p(15.99, 15.99, essentielOuPop ? 3 : 0, essentielOuPop ? "3 mois inclus" : undefined), rang: 1 },
                { id: "canal_100", label: "100 % CANAL+ (promo abonnés Freebox)", prix: p(19.99, 19.99, 0, "promo 24 mois, engagement 24 mois"), rang: 3 },
            ];
        case "bein":
            return [{ id: "bein", label: "beIN Sports", prix: p(15), rang: 1 }];
    }
}

/**
 * Forfaits mobiles Free pour un abonné Freebox (Free Family, jusqu'à 4 lignes).
 * `rangLigne` = position du forfait (0 = 1re ligne) : avec la Pop, la 1re ligne Free 5G+ reste à 9,99 €.
 */
export type ForfaitFree = { id: string; nom: string };
export const FORFAITS_FREE: ForfaitFree[] = [
    { id: "free_5g", nom: "Forfait Free 5G+" },
    { id: "free_max", nom: "Forfait Free Max" },
    { id: "serie_free", nom: "Série Free" },
    { id: "forfait_2", nom: "Forfait 2 €" },
];
export function prixForfaitFree(id: string, boxId: string, rangLigne: number): PrixFree {
    switch (id) {
        case "free_5g":
            return boxId === "pop" && rangLigne === 0
                ? { an1: 9.99, an2: 9.99, note: "−10 € avec la Pop sur 1 forfait" }
                : { an1: 9.99, an2: 15.99, note: "−10 € la 1re année, puis −4 € (prix public 19,99 €)" };
        case "free_max":
            return { an1: 19.99, an2: 19.99, note: "−10 € avec la Freebox (prix public 29,99 €)" };
        case "serie_free":
            return { an1: 12.99, an2: 19.99, note: "12,99 € 1 an, puis devient Free 5G+ ; remises Freebox non cumulables" };
        case "forfait_2":
            return { an1: 0, an2: 0, note: "offert avec la Freebox (1 seul forfait, non cumulable)" };
        default:
            return { an1: 0, an2: 0 };
    }
}

/** Protection mobile Free (par mois). */
export const PROTECTION_FREE = 8.99;
