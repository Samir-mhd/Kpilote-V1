/**
 * Service de classement avec filtrage par période et objectifs par produit.
 * Utilisé par manager/classement et dashboard/classement.
 */
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE, ProduitCode } from "@/utils/produits";
import { Periode, dateDebutPeriode } from "@/utils/periodes";

export type ConseillerStats = {
    id: string;
    nom: string;
    total: number;
    produits: Record<ProduitCode, number>;
    objectifs: Record<ProduitCode, number>;
};

export async function construireClassementPeriode(
    periode: Periode
): Promise<ConseillerStats[]> {
    const debut = dateDebutPeriode(periode);

    const [consRes, ventesRes, objRes] = await Promise.all([
        supabase.from("conseillers").select("id, nom"),
        supabase
            .from("ventes")
            .select("conseiller_id, quantite, produits(code)")
            .gte("created_at", debut),
        supabase
            .from("objectifs_mensuels")
            .select("conseiller_id, objectif, produits(code)"),
    ]);

    // Fallback created_at absent
    let ventes = ventesRes.data;
    if (ventesRes.error?.message?.includes("created_at")) {
        const fallback = await supabase.from("ventes").select("conseiller_id, quantite, produits(code)");
        ventes = fallback.data;
    }

    const conseillers = consRes.data ?? [];
    const objectifs   = objRes.data ?? [];
    const codesProduits = PRODUITS_ORDRE.map(p => p.code) as ProduitCode[];

    // Init map
    const map = new Map<string, ConseillerStats>();
    conseillers.forEach((c: any) => {
        map.set(c.id, {
            id:   c.id,
            nom:  c.nom,
            total: 0,
            produits: Object.fromEntries(codesProduits.map(k => [k, 0])) as Record<ProduitCode, number>,
            objectifs: Object.fromEntries(codesProduits.map(k => [k, 0])) as Record<ProduitCode, number>,
        });
    });

    // Ventes
    (ventes ?? []).forEach((v: any) => {
        const row = map.get(v.conseiller_id);
        if (!row) return;
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code as ProduitCode;
        if (code && row.produits[code] !== undefined) {
            row.produits[code] += v.quantite ?? 1;
            row.total += v.quantite ?? 1;
        }
    });

    // Objectifs mensuels
    objectifs.forEach((o: any) => {
        const row = map.get(o.conseiller_id);
        if (!row) return;
        const code = (Array.isArray(o.produits) ? o.produits[0] : o.produits)?.code as ProduitCode;
        if (code && row.objectifs[code] !== undefined) {
            row.objectifs[code] += o.objectif ?? 0;
        }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
