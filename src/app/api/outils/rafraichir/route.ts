import { catalogueEnCache, DUREE_CATALOGUE_S } from "@/services/catalogueCache";
import { chargerCoupon } from "@/services/odrCache";
import { concurrenceEnCache, DUREE_CONCURRENCE_S } from "@/services/concurrenceCache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function aujourdhuiParis() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

/**
 * Rafraîchissement en arrière-plan (appelé toutes les heures par GitHub Actions) :
 * 1. si le catalogue a plus de 50 min, sa relecture sur mobile.free.fr est lancée en arrière-plan
 *    (nouveaux téléphones, prix, coupons) — les conseillers continuent d'avoir l'ancienne version sans attendre ;
 * 2. chaque coupon ODR en cours est préchargé dans le cache, pour qu'il s'imprime immédiatement.
 */
export async function POST() {
    const debut = Date.now();
    try {
        const cat = await catalogueEnCache();
        const ageMin = Math.round((Date.now() - new Date(cat.majLe).getTime()) / 60000);

        // Concurrence : lire le cache suffit à lancer la relecture en arrière-plan des opérateurs
        // relevés il y a plus de 12 h (2 relectures par jour au plus). Une erreur ici ne bloque rien.
        const concurrence = await concurrenceEnCache().then((l) => l.map((o) => (
            "erreur" in o ? { op: o.op, erreur: o.erreur }
                : { op: o.op, box: o.box.length, mobile: o.mobile.length, ageH: Math.round((Date.now() - new Date(o.releveLe).getTime()) / 36e5), relectureLancee: Date.now() - new Date(o.releveLe).getTime() >= DUREE_CONCURRENCE_S * 1000 }
        ))).catch((e) => ({ erreur: e instanceof Error ? e.message : "Erreur" }));

        const auj = aujourdhuiParis();
        const coupons = new Map<string, string | null>();
        for (const t of cat.telephones) for (const v of t.variantes) for (const c of v.coupons ?? []) {
            if (!c.fin || c.fin >= auj) coupons.set(c.document, c.fin);
        }

        let ok = 0, erreurs = 0;
        const liste = [...coupons.entries()];
        for (let i = 0; i < liste.length; i += 6) {
            const lot = await Promise.allSettled(liste.slice(i, i + 6).map(([u, fin]) => chargerCoupon(u, fin)));
            lot.forEach((r) => (r.status === "fulfilled" ? ok++ : erreurs++));
        }

        return Response.json({
            catalogue: { majLe: cat.majLe, ageMin, relectureLancee: ageMin * 60 >= DUREE_CATALOGUE_S, telephones: cat.telephones.length },
            concurrence,
            coupons: liste.length, prechauffes: ok, erreurs, duree: `${Math.round((Date.now() - debut) / 1000)} s`,
        });
    } catch (e) {
        return Response.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue" }, { status: 502 });
    }
}
