/**
 * Récap mensuel conseiller : archive consultable depuis Profil ("Mes récaps"), un mois passé
 * à la fois. Spiderhome exclu (historisation, pas un acte commercial), comme partout ailleurs.
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import { PRODUITS_ORDRE } from "@/utils/produits";

const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export type MoisDisponible = { valeur: string; label: string };

export type RecapMensuel = {
    mois: string;
    label: string;
    totalVentes: number;
    parProduit: { code: string; label: string; emoji: string; nombre: number }[];
    meilleurJour: { date: string; nombre: number } | null;
    joursActifs: number;
};

/** KPILOTE n'a pas de données pertinentes avant ce mois — jamais affiché, même si nbMois le permettrait. */
const PREMIER_MOIS_RECAP = "2026-07";

/** Les `nbMois` derniers mois révolus (mois en cours exclu), du plus récent au plus ancien, jamais avant `PREMIER_MOIS_RECAP`. */
export function getMoisDisponibles(nbMois = 12): MoisDisponible[] {
    const now = new Date();
    const result: MoisDisponible[] = [];
    for (let i = 1; i <= nbMois; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const valeur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (valeur < PREMIER_MOIS_RECAP) break;
        result.push({ valeur, label: `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}` });
    }
    return result;
}

export async function getRecapMensuel(conseillerId: string, mois: string): Promise<RecapMensuel> {
    const [annee, m] = mois.split("-").map(Number);
    const debut = new Date(annee, m - 1, 1);
    const fin = new Date(annee, m, 0, 23, 59, 59);

    const rows = await fetchToutesLesLignes((from, to) =>
        supabase
            .from("ventes")
            .select("created_at, quantite, produits(code)")
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debut.toISOString())
            .lte("created_at", fin.toISOString())
            .order("created_at", { ascending: true })
            .range(from, to)
    );

    const parJour: Record<string, number> = {};
    const parProduitCount: Record<string, number> = {};
    let total = 0;

    rows.forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (!code || code === "spiderhome") return;
        const q = v.quantite ?? 1;
        total += q;
        parProduitCount[code] = (parProduitCount[code] ?? 0) + q;
        const jour = new Date(v.created_at).toISOString().slice(0, 10);
        parJour[jour] = (parJour[jour] ?? 0) + q;
    });

    let meilleurJour: { date: string; nombre: number } | null = null;
    Object.entries(parJour).forEach(([date, nombre]) => {
        if (!meilleurJour || nombre > meilleurJour.nombre) meilleurJour = { date, nombre };
    });

    const parProduit = PRODUITS_ORDRE
        .filter((p) => p.code !== "spiderhome")
        .map((p) => ({ code: p.code, label: p.label, emoji: p.emoji, nombre: parProduitCount[p.code] ?? 0 }));

    return {
        mois,
        label: `${MOIS_FR[m - 1]} ${annee}`,
        totalVentes: total,
        parProduit,
        meilleurJour,
        joursActifs: Object.keys(parJour).length,
    };
}
