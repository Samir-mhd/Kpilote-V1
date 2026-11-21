import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Relais des coupons ODR de mobile.free.fr : sert le PDF depuis KPILOTE (même origine),
 * ce qui permet de lancer l'impression directement depuis la page Outils → ODR.
 * N'accepte que des PDF hébergés sur mobile.free.fr.
 */
export async function GET(req: NextRequest) {
    const u = req.nextUrl.searchParams.get("u") ?? "";
    let url: URL;
    try { url = new URL(u); } catch { return new Response("Lien invalide", { status: 400 }); }
    if (url.protocol !== "https:" || url.hostname !== "mobile.free.fr") return new Response("Lien non autorisé", { status: 400 });

    try {
        const r = await fetch(url, {
            cache: "no-store",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" },
            signal: AbortSignal.timeout(20000),
        });
        const type = r.headers.get("content-type") ?? "";
        if (!r.ok || !type.includes("pdf")) return new Response("Coupon indisponible sur mobile.free.fr", { status: 502 });
        return new Response(r.body, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=\"coupon-odr-free.pdf\"",
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch {
        return new Response("Coupon indisponible sur mobile.free.fr", { status: 502 });
    }
}
