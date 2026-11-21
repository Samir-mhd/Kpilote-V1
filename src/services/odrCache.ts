/**
 * Cache des coupons ODR (PDF de mobile.free.fr), côté serveur.
 * Chaque coupon est gardé jusqu'à sa date de fin, puis expire à minuit (heure de Paris) le soir de son dernier jour.
 * Les coupons > ~1,5 Mo ne tiennent pas dans le cache de données de Next.js : ils restent servis
 * directement (et mis en cache par le CDN et le navigateur grâce aux en-têtes HTTP).
 */
import { unstable_cache } from "next/cache";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const TAILLE_MAX_CACHE = 1_500_000;

/** Lien autorisé : PDF https sur mobile.free.fr uniquement. */
export function urlCouponValide(u: string): URL | null {
    try {
        const url = new URL(u);
        return url.protocol === "https:" && url.hostname === "mobile.free.fr" ? url : null;
    } catch { return null; }
}

/** Secondes restantes jusqu'à minuit (Paris) à la fin du jour `fin` (AAAA-MM-JJ). Sans date : 6 h. */
export function secondesAvantExpiration(fin: string | null): number {
    if (!fin || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) return 6 * 3600;
    // Minuit à Paris le lendemain de `fin` : on part de 00:00 UTC et on corrige du décalage de Paris ce jour-là.
    const [a, m, j] = fin.split("-").map(Number);
    const minuitUtc = Date.UTC(a, m - 1, j + 1);
    const heureParis = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(new Date(minuitUtc)));
    const expiration = minuitUtc - heureParis * 3600_000;
    return Math.max(60, Math.floor((expiration - Date.now()) / 1000));
}

async function telecharger(url: string): Promise<Uint8Array> {
    const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.includes("pdf")) throw new Error(`Coupon indisponible (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
}

/** PDF du coupon, depuis le cache si possible (gardé jusqu'à minuit le dernier jour). */
export async function chargerCoupon(url: string, fin: string | null): Promise<Uint8Array> {
    const ttl = secondesAvantExpiration(fin);
    const enCache = unstable_cache(
        async () => {
            const pdf = await telecharger(url);
            // Trop gros pour le cache de données : on le signale (servi en direct, sans mise en cache serveur).
            return pdf.byteLength > TAILLE_MAX_CACHE ? null : Buffer.from(pdf).toString("base64");
        },
        ["coupon-odr-v1", url],
        { revalidate: ttl, tags: ["coupons-odr"] },
    );
    const b64 = await enCache();
    return b64 ? new Uint8Array(Buffer.from(b64, "base64")) : telecharger(url);
}
