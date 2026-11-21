import { catalogueEnCache, rafraichirCatalogue } from "@/services/catalogueCache";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
    try {
        return Response.json(await catalogueEnCache());
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}

/** Bouton « Actualiser » : relit mobile.free.fr tout de suite et remplace le cache pour tout le monde. */
export async function POST() {
    try {
        return Response.json(await rafraichirCatalogue());
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}
