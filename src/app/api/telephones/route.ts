import { unstable_cache } from "next/cache";
import { lireCatalogueFree } from "@/services/telephonesFreeService";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Catalogue mis en cache 6 h : mobile.free.fr n'est relu que 4 fois par jour au maximum. */
const catalogue = unstable_cache(lireCatalogueFree, ["catalogue-telephones-free-v2"], { revalidate: 21600 });

export async function GET() {
    try {
        return Response.json(await catalogue());
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}
