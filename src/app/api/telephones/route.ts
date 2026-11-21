import { unstable_cache, revalidateTag } from "next/cache";
import { lireCatalogueFree } from "@/services/telephonesFreeService";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TAG = "catalogue-telephones-free";

/** Catalogue mis en cache 1 h : mobile.free.fr est relu au plus une fois par heure. */
const catalogue = unstable_cache(lireCatalogueFree, ["catalogue-telephones-free-v4"], { revalidate: 3600, tags: [TAG] });

export async function GET() {
    try {
        return Response.json(await catalogue());
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}

/** Bouton « Actualiser les offres » : relit mobile.free.fr tout de suite et expire le cache pour tout le monde. */
export async function POST() {
    try {
        const frais = await lireCatalogueFree();
        revalidateTag(TAG, { expire: 0 });
        return Response.json(frais);
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}
