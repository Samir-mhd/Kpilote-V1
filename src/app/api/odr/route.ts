import type { NextRequest } from "next/server";
import { chargerCoupon, secondesAvantExpiration, urlCouponValide } from "@/services/odrCache";

/**
 * Relais des coupons ODR de mobile.free.fr : sert le PDF depuis KPILOTE (même origine),
 * ce qui permet de lancer l'impression directement depuis la page Outils → ODR.
 * `fin` (AAAA-MM-JJ) = dernier jour du coupon : il reste en cache (serveur, CDN, navigateur) jusqu'à minuit ce soir-là.
 */
export async function GET(req: NextRequest) {
    const url = urlCouponValide(req.nextUrl.searchParams.get("u") ?? "");
    if (!url) return new Response("Lien non autorisé", { status: 400 });
    const fin = req.nextUrl.searchParams.get("fin");

    try {
        const pdf = await chargerCoupon(url.toString(), fin);
        const ttl = secondesAvantExpiration(fin);
        return new Response(pdf as BodyInit, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=\"coupon-odr-free.pdf\"",
                "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
            },
        });
    } catch {
        return new Response("Coupon indisponible sur mobile.free.fr", { status: 502 });
    }
}
