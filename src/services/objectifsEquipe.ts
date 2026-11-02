/**
 * Objectif mensuel équipe/boutique par produit, calculé automatiquement (remplace la saisie
 * manuelle "objectifs boutique") :
 * - Box/Forfaits/Téléphones + items liés (McAfee, Assurance, McAfee mobile, Assurance
 *   essentielle, Canal+) : matrice objectifs (paramètres du mois + taux boutique des items
 *   liés), indépendant du planning individuel des conseillers.
 * - Avis Google : somme des objectifs mensuels individuels des conseillers.
 * - Récap commercial : coeff × jours planifiés cumulés de tous les conseillers du mois.
 */
import { calculerMatrice } from "./matriceObjectifs";
import { getOuCreerMatriceConfig, versConfigCalcul, moisCourantISO, ITEM_VERS_CODE_PRODUIT } from "./matriceObjectifsData";
import { getObjectifsManager } from "./objectifs";
import { getCoeffRecapCommercial } from "./recapCommercialConfig";
import { getJoursTravailTous } from "./planningService";

export async function getObjectifsEquipeMois(mois: string = moisCourantISO()): Promise<Record<string, number>> {
    const [configRow, objManager, coeffRecap] = await Promise.all([
        getOuCreerMatriceConfig(mois),
        getObjectifsManager(),
        getCoeffRecapCommercial(),
    ]);

    const resultat = calculerMatrice(versConfigCalcul(configRow), []);
    const map: Record<string, number> = {};
    Object.entries(ITEM_VERS_CODE_PRODUIT).forEach(([item, code]) => {
        map[code] = resultat.objectifBoutique[item] ?? 0;
    });

    map["avis_google"] = objManager
        .filter((r) => r.produits?.code === "avis_google")
        .reduce((t, r) => t + (r.objectif ?? 0), 0);

    const conseillerIds = [...new Set(objManager.map((r) => r.conseiller_id))];
    const [annee, moisNum] = mois.split("-").map(Number);
    const jours = await getJoursTravailTous(conseillerIds, annee, moisNum).catch(() => ({} as Record<string, number>));
    const totalJours = Object.values(jours).reduce((t, j) => t + j, 0);
    map["recap_commercial"] = Math.round(coeffRecap * totalJours);

    return map;
}
