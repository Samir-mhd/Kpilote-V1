// TEMPORAIRE : vérifie que les sites des opérateurs répondent depuis les serveurs Vercel. À supprimer.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const CIBLES: [string, string][] = [
    ["orange_box", "https://boutique.orange.fr/api/showcase/internet/offers"],
    ["orange_mob", "https://boutique.orange.fr/api/showcase/mobile/offers"],
    ["sosh_box", "https://shop.sosh.fr/api/showcase/internet/offers"],
    ["sosh_mob", "https://shop.sosh.fr/api/showcase/mobile/offers"],
    ["sfr_box", "https://www.sfr.fr/offre-internet"],
    ["sfr_mob", "https://www.sfr.fr/offre-mobile"],
    ["red_box", "https://www.red-by-sfr.fr/offre-internet/"],
    ["red_mob", "https://www.red-by-sfr.fr/forfaits-mobiles/"],
    ["bt_box", "https://www.bouyguestelecom.fr/offres-internet"],
    ["bt_mob", "https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement"],
];

export async function GET() {
    const res = await Promise.all(CIBLES.map(async ([nom, url]) => {
        const t = Date.now();
        try {
            const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr", Accept: "text/html,application/json" }, cache: "no-store", signal: AbortSignal.timeout(25000) });
            const txt = await r.text();
            return { nom, statut: r.status, octets: txt.length, euros: (txt.match(/€/g) ?? []).length, offresJson: (txt.match(/"seoId"/g) ?? []).length, ms: Date.now() - t };
        } catch (e) {
            return { nom, erreur: String(e), ms: Date.now() - t };
        }
    }));
    return Response.json({ region: process.env.VERCEL_REGION ?? "local", res });
}
