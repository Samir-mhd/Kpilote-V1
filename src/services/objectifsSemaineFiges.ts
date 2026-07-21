/**
 * Objectif "semaine" figé : reste à faire du mois ÷ jours PLANIFIÉS restants du mois (planning
 * réel du conseiller) × jours planifiés de cette semaine — calculé UNE FOIS au premier accès de
 * la semaine (idéalement le lundi) puis mémorisé : ne se recalcule plus ensuite selon
 * l'avancement, contrairement à l'objectif jour qui reste dynamique.
 */
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE, ProduitCode } from "@/utils/produits";
import { getJoursTravailPlageTous, getJoursTravailSemaineTous } from "@/services/planningService";

function dateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CODES_MANUELS = PRODUITS_ORDRE.filter((p) => p.code !== "spiderhome").map((p) => p.code) as ProduitCode[];

export async function getObjectifsSemaineFiges(
    conseillerIds: string[],
    lundi: Date
): Promise<Record<string, Record<ProduitCode, number>>> {
    const result: Record<string, Record<string, number>> = {};
    conseillerIds.forEach((id) => { result[id] = {}; });
    if (conseillerIds.length === 0) return result as Record<string, Record<ProduitCode, number>>;

    const semaineDebut = dateStr(lundi);

    const { data: existants } = await supabase
        .from("objectifs_semaine_figes")
        .select("conseiller_id, objectif, produits(code)")
        .eq("semaine_debut", semaineDebut)
        .in("conseiller_id", conseillerIds);

    (existants ?? []).forEach((row: any) => {
        const code = (Array.isArray(row.produits) ? row.produits[0] : row.produits)?.code;
        if (code) result[row.conseiller_id][code] = row.objectif;
    });

    const manquants: { conseillerId: string; produitCode: ProduitCode }[] = [];
    conseillerIds.forEach((id) => {
        CODES_MANUELS.forEach((code) => {
            if (result[id][code] === undefined) manquants.push({ conseillerId: id, produitCode: code });
        });
    });

    if (manquants.length === 0) return result as Record<string, Record<ProduitCode, number>>;

    const [{ data: objectifsMensuels }, { data: produits }] = await Promise.all([
        supabase.from("objectifs_mensuels").select("conseiller_id, objectif, produits(code)").in("conseiller_id", conseillerIds),
        supabase.from("produits").select("id, code").in("code", CODES_MANUELS),
    ]);

    const produitIdParCode: Record<string, string> = {};
    (produits ?? []).forEach((p: any) => { produitIdParCode[p.code] = p.id; });

    const objMensuelMap: Record<string, Record<string, number>> = {};
    (objectifsMensuels ?? []).forEach((o: any) => {
        const code = (Array.isArray(o.produits) ? o.produits[0] : o.produits)?.code;
        if (!code) return;
        if (!objMensuelMap[o.conseiller_id]) objMensuelMap[o.conseiller_id] = {};
        objMensuelMap[o.conseiller_id][code] = (objMensuelMap[o.conseiller_id][code] ?? 0) + (o.objectif ?? 0);
    });

    // Réalisé du mois à date (maintenant) par conseiller × produit
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const { data: ventesMois } = await supabase
        .from("ventes")
        .select("conseiller_id, quantite, produits(code)")
        .in("conseiller_id", conseillerIds)
        .gte("created_at", debutMois.toISOString());

    const realiseMap: Record<string, Record<string, number>> = {};
    (ventesMois ?? []).forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (!code || code === "spiderhome") return;
        if (!realiseMap[v.conseiller_id]) realiseMap[v.conseiller_id] = {};
        realiseMap[v.conseiller_id][code] = (realiseMap[v.conseiller_id][code] ?? 0) + (v.quantite ?? 1);
    });

    // Jours PLANIFIÉS restants du mois (à partir de ce lundi, planning réel) et jours planifiés
    // de cette semaine précise (peut être < 6 selon le planning du conseiller).
    const finDuMois = new Date(lundi.getFullYear(), lundi.getMonth() + 1, 0);
    const idsConcernes = [...new Set(manquants.map((m) => m.conseillerId))];
    const [joursRestantsMoisParConseiller, joursSemaineParConseiller] = await Promise.all([
        getJoursTravailPlageTous(idsConcernes, lundi, finDuMois),
        getJoursTravailSemaineTous(idsConcernes, lundi),
    ]);

    const aInserer = manquants
        .map(({ conseillerId, produitCode }) => {
            const objMois        = objMensuelMap[conseillerId]?.[produitCode] ?? 0;
            const realise        = realiseMap[conseillerId]?.[produitCode] ?? 0;
            const restant        = Math.max(objMois - realise, 0);
            const joursRestants  = joursRestantsMoisParConseiller[conseillerId] ?? 0;
            const joursSemaine   = joursSemaineParConseiller[conseillerId] ?? 0;
            const tauxJour       = joursRestants > 0 ? restant / joursRestants : 0;
            const objectif       = Math.max(Math.round(tauxJour * joursSemaine), 0);
            result[conseillerId][produitCode] = objectif;
            return {
                conseiller_id: conseillerId,
                produit_id: produitIdParCode[produitCode],
                semaine_debut: semaineDebut,
                objectif,
            };
        })
        .filter((r) => !!r.produit_id);

    if (aInserer.length > 0) {
        await supabase
            .from("objectifs_semaine_figes")
            .upsert(aInserer, { onConflict: "conseiller_id,produit_id,semaine_debut" });
    }

    return result as Record<string, Record<ProduitCode, number>>;
}
