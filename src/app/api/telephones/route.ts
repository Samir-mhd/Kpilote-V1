import { unstable_cache } from "next/cache";
import { lireCatalogueFree } from "@/services/telephonesFreeService";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Catalogue mis en cache 1 h : mobile.free.fr est relu au plus une fois par heure. */
const catalogue = unstable_cache(lireCatalogueFree, ["catalogue-telephones-free-v3"], { revalidate: 3600 });

export async function GET() {
    try {
        return Response.json(await catalogue());
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}
