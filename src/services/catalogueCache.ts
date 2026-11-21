/** Cache serveur du catalogue Free (téléphones + coupons ODR), partagé par les routes API. */
import { unstable_cache, revalidateTag } from "next/cache";
import { lireCatalogueFree, type CatalogueTelephones } from "@/services/telephonesFreeService";

const TAG = "catalogue-telephones-free";

/** Durée de vie du catalogue : passé ce délai, la version en cache reste servie
 *  instantanément pendant que mobile.free.fr est relu en arrière-plan. */
export const DUREE_CATALOGUE_S = 50 * 60;

/** Catalogue en cache (relu en arrière-plan ; /api/outils/rafraichir le déclenche toutes les heures). */
export const catalogueEnCache = unstable_cache(lireCatalogueFree, ["catalogue-telephones-free-v5"], { revalidate: DUREE_CATALOGUE_S, tags: [TAG] });

/** Bouton « Actualiser » : relit mobile.free.fr tout de suite et invalide le cache pour tout le monde. */
export async function rafraichirCatalogue(): Promise<CatalogueTelephones> {
    const frais = await lireCatalogueFree();
    revalidateTag(TAG, "max");
    return frais;
}
