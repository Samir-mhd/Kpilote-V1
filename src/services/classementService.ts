/**
 * Service de classement avec filtrage par période et objectifs par produit.
 * Utilisé par manager/classement et dashboard/classement.
 */
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE, ProduitCode } from "@/utils/produits";
import { Periode, dateDebutPeriode } from "@/utils/periodes";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";

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

    const [consRes, objRes] = await Promise.all([
        supabase.from("conseillers").select("id, nom, profil_actif"),
        supabase
            .from("objectifs_mensuels")
            .select("conseiller_id, objectif, produits(code)"),
    ]);

    // Paginé : au-delà de 1000 lignes (plafond Supabase par défaut), les ventes de toute
    // l'équipe sur un mois seraient sinon coupées silencieusement, sans tri garanti —
    // ce qui faisait varier les totaux d'un appel à l'autre.
    let ventes: any[];
    try {
        ventes = await fetchToutesLesLignes((from, to) =>
            supabase
                .from("ventes")
                .select("conseiller_id, quantite, produits(code)")
                .gte("created_at", debut)
                .order("created_at", { ascending: true })
                .range(from, to)
        );
    } catch (e: any) {
        // Fallback created_at absent
        if (e?.message?.includes("created_at")) {
            ventes = await fetchToutesLesLignes((from, to) =>
                supabase
                    .from("ventes")
                    .select("conseiller_id, quantite, produits(code)")
                    .order("conseiller_id", { ascending: true })
                    .range(from, to)
            );
        } else {
            throw e;
        }
    }

    const conseillers = consRes.data ?? [];
    const objectifs   = objRes.data ?? [];
    const codesProduits = PRODUITS_ORDRE.map(p => p.code) as ProduitCode[];

    // Init map
    const map = new Map<string, ConseillerStats>();
    conseillers.forEach((c: any) => {
        // Profil désactivé (mode restreint) : invisible du classement et des totaux boutique
        if (c.profil_actif === false) return;
        map.set(c.id, {
            id:   c.id,
            nom:  c.nom,
            total: 0,
            produits: Object.fromEntries(codesProduits.map(k => [k, 0])) as Record<ProduitCode, number>,
            objectifs: Object.fromEntries(codesProduits.map(k => [k, 0])) as Record<ProduitCode, number>,
        });
    });

    // Ventes (Spiderhome = historisation → exclu du classement commercial)
    (ventes ?? []).forEach((v: any) => {
        const row = map.get(v.conseiller_id);
        if (!row) return;
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code as ProduitCode;
        if (code === "spiderhome") return;
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
