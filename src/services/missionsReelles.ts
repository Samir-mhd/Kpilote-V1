import { getObjectifsMensuels } from "@/services/objectifs";
import { getVentesDuJour, getVentesDuMois } from "@/services/stats";
import { getJoursTravail } from "@/services/planningService";
import { calculerObjectifs, EtatObjectif } from "@/engine/objectifEngine";
import { supabase } from "@/lib/supabase";

type ProduitLie = { nom: string; code: string };
type ObjectifSupabase = { objectif: number; produits: ProduitLie | ProduitLie[] | null };
type VenteSupabase = { quantite: number; produits: ProduitLie | ProduitLie[] | null };

function getProduit(produits: ProduitLie | ProduitLie[] | null) {
    if (!produits) return null;
    return Array.isArray(produits) ? produits[0] : produits;
}

export function couleurProduit(produit: string): string {
    if (produit === "Box")        return "bg-green-500";
    if (produit === "Forfaits")   return "bg-blue-500";
    if (produit === "Téléphones") return "bg-purple-500";
    if (produit === "McAfee")     return "bg-orange-500";
    if (produit === "Spiderhome") return "bg-sky-500";
    return "bg-red-500";
}

export function couleurGradientProduit(produit: string): string {
    if (produit === "Box")        return "from-green-500 to-emerald-400";
    if (produit === "Forfaits")   return "from-blue-500 to-cyan-400";
    if (produit === "Téléphones") return "from-purple-500 to-violet-400";
    if (produit === "McAfee")     return "from-orange-500 to-amber-400";
    if (produit === "Spiderhome") return "from-sky-500 to-cyan-400";
    return "from-red-500 to-rose-400";
}

// ─── Type complet avec toutes les données du moteur ──────────────────────────

export type MissionComplete = {
    produit: string;
    objectifMensuel: number;
    objectifJour: number;
    realise: number;
    resteAFaire: number;
    progression: number;
    projectionFinMois: number;
    etat: EtatObjectif;
    couleur: string;
    couleurGradient: string;
    message: string;
};

// ─── Calcul brut partagé ─────────────────────────────────────────────────────

type VentesGetter = (id: string) => Promise<VenteSupabase[]>;

async function calcul(conseillerId: string, annee: number, mois: number, ventesGetter: VentesGetter = getVentesDuMois) {
    const [objectifs, ventes, joursTravail] = await Promise.all([
        getObjectifsMensuels(conseillerId) as Promise<ObjectifSupabase[]>,
        ventesGetter(conseillerId) as Promise<VenteSupabase[]>,
        getJoursTravail(conseillerId, annee, mois),
    ]);

    const { travailles: joursTravailles, restants: joursRestants } = joursTravail;

    const inputs = objectifs.map((objectif) => {
        const produitObjectif = getProduit(objectif.produits);
        const produitNom = produitObjectif?.nom ?? "Produit";
        const produitCode = produitObjectif?.code ?? "";

        const realise = ventes
            .filter((v) => getProduit(v.produits)?.code === produitCode)
            .reduce((t, v) => t + v.quantite, 0);

        // Spiderhome : objectif mensuel auto = 25 × total jours planifiés du mois
        const objectifMensuel = produitCode === "spiderhome"
            ? 25 * (joursTravailles + joursRestants)
            : objectif.objectif;

        return { produit: produitNom, objectifMensuel, realise, joursTravailles, joursRestants };
    });

    return calculerObjectifs(inputs);
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Vue simplifiée (dashboard principal) :
 * - objectif = objectifJour calculé depuis le cumul mensuel + jours restants
 *   → adapte la cible en fonction de ce qui est déjà réalisé ce mois
 * - realise = ventes d'AUJOURD'HUI uniquement → repart à 0 chaque matin
 *
 * Cela permet à Julie de commencer à 0 chaque jour, avec une cible journalière
 * qui intègre les jours précédents et les jours restants.
 */
export async function getMissionsReelles(conseillerId: string) {
    const now = new Date();
    const annee = now.getFullYear();
    const mois  = now.getMonth() + 1;

    // Le moteur utilise le cumul mensuel pour calculer objectifJour correctement
    const [resultats, ventesJour] = await Promise.all([
        calcul(conseillerId, annee, mois, getVentesDuMois),
        getVentesDuJour(conseillerId),
    ]);

    // Index des ventes d'aujourd'hui par code produit
    const realiseJour: Record<string, number> = {};
    (ventesJour as any[]).forEach((v) => {
        const p = Array.isArray(v.produits) ? v.produits[0] : v.produits;
        if (p?.code) realiseJour[p.code] = (realiseJour[p.code] ?? 0) + (v.quantite ?? 1);
    });

    return resultats.map((m) => {
        // Normalise le nom produit en code : "Téléphones" → "telephones"
        const code = m.produit.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        return {
            produit:  m.produit,
            objectif: m.objectifJour,         // pace journalière calculée depuis le cumul mensuel
            realise:  realiseJour[code] ?? 0, // ventes d'aujourd'hui = 0 au début de chaque journée
            couleur:  couleurProduit(m.produit),
            message:  m.message,
        };
    });
}

/** Vue complète (page Résultats : projections, état, historique) — ventes du MOIS entier */
export async function getMissionsCompletes(conseillerId: string): Promise<MissionComplete[]> {
    const now = new Date();
    const resultats = await calcul(conseillerId, now.getFullYear(), now.getMonth() + 1, getVentesDuMois);

    return resultats.map((m) => ({
        produit: m.produit,
        objectifMensuel: m.objectifMensuel,
        objectifJour: m.objectifJour,
        realise: m.realise,
        resteAFaire: m.resteAFaire,
        progression: m.progression,
        projectionFinMois: m.projectionFinMois,
        etat: m.etat,
        couleur: couleurProduit(m.produit),
        couleurGradient: couleurGradientProduit(m.produit),
        message: m.message,
    }));
}

/** Ventes d'un mois précis par produit (historique).
 *  Filtre par created_at si la colonne existe, sinon retourne vide pour les mois passés. */
export async function getVentesParMois(
    conseillerId: string,
    annee: number,
    mois: number
): Promise<Record<string, number>> {
    const dernierJour = new Date(annee, mois, 0).getDate();
    const debut = `${annee}-${String(mois).padStart(2, "0")}-01T00:00:00.000Z`;
    const fin = `${annee}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}T23:59:59.999Z`;

    const { data, error } = await supabase
        .from("ventes")
        .select("quantite, produits(nom)")
        .eq("conseiller_id", conseillerId)
        .gte("created_at", debut)
        .lte("created_at", fin);

    // Colonne created_at absente → retour vide (pas d'historique possible)
    if (error) return {};

    const result: Record<string, number> = {};
    (data ?? []).forEach((row: any) => {
        const nom = Array.isArray(row.produits) ? row.produits[0]?.nom : row.produits?.nom;
        if (nom) result[nom] = (result[nom] ?? 0) + row.quantite;
    });
    return result;
}

/** Classement de tous les conseillers.
 *  Filtre par created_at si disponible, sinon classement sur toutes les ventes. */
export async function getClassementMois(annee: number, mois: number) {
    const dernierJour = new Date(annee, mois, 0).getDate();
    const debut = `${annee}-${String(mois).padStart(2, "0")}-01T00:00:00.000Z`;
    const fin = `${annee}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}T23:59:59.999Z`;

    const { data: conseillers } = await supabase.from("conseillers").select("id, nom");

    // Tentative avec filtre date (inclut le code produit pour exclure Spiderhome)
    let { data: ventes, error } = await supabase
        .from("ventes")
        .select("conseiller_id, quantite, produits(code)")
        .gte("created_at", debut)
        .lte("created_at", fin);

    // Fallback sans filtre si created_at absent
    if (error && error.message?.includes("created_at")) {
        const fallback = await supabase.from("ventes").select("conseiller_id, quantite, produits(code)");
        ventes = fallback.data;
    }

    const totaux: Record<string, { id: string; nom: string; ventes: number }> = {};
    (conseillers ?? []).forEach((c: any) => { totaux[c.id] = { id: c.id, nom: c.nom, ventes: 0 }; });
    (ventes ?? []).forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (code === "spiderhome") return; // historisation, pas un acte commercial
        if (totaux[v.conseiller_id]) totaux[v.conseiller_id].ventes += v.quantite;
    });

    return Object.values(totaux).sort((a, b) => b.ventes - a.ventes);
}

/** Ventes d'aujourd'hui (pour notifications/coach).
 *  Retourne le total toutes ventes si created_at absent. */
export async function getVentesAujourdhui(conseillerId: string): Promise<number> {
    const now = new Date();
    const debut = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data, error } = await supabase
        .from("ventes")
        .select("quantite")
        .eq("conseiller_id", conseillerId)
        .gte("created_at", debut)
        .lte("created_at", fin);

    if (error && error.message?.includes("created_at")) {
        // Fallback : total général
        const { data: all } = await supabase.from("ventes").select("quantite").eq("conseiller_id", conseillerId);
        return (all ?? []).reduce((t: number, v: any) => t + v.quantite, 0);
    }

    return (data ?? []).reduce((t: number, v: any) => t + v.quantite, 0);
}
