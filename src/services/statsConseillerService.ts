/**
 * Données de la page "Mes stats" (variante &stats=v2) : ventes d'un conseiller sur une période,
 * planning sur une période (moyennes par jour travaillé), ventes combo par jour.
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import type { StatutJour } from "@/services/planningService";

export type VenteStat = { createdAt: string; jour: string; heure: number; code: string; quantite: number; ajustement: boolean };

function jourLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ventes du conseiller depuis `debut` (toutes sources ; `ajustement` = cerebro check / correction du jour). */
export async function getVentesConseillerDepuis(conseillerId: string, debut: Date): Promise<VenteStat[]> {
    const lignes = await fetchToutesLesLignes((from, to) =>
        supabase
            .from("ventes")
            .select("created_at, quantite, source, produits(code)")
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debut.toISOString())
            .order("created_at", { ascending: true })
            .range(from, to)
    );
    return (lignes as any[]).map((v) => {
        const d = new Date(v.created_at);
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code ?? "";
        return {
            createdAt: v.created_at,
            jour: jourLocal(d),
            heure: d.getHours(),
            code,
            quantite: v.quantite ?? 1,
            ajustement: v.source === "cerebro_check" || v.source === "reset_jour",
        };
    });
}

/** Statut de planning par jour ("YYYY-MM-DD") sur [debut, fin]. */
export async function getPlanningPlage(conseillerId: string, debut: Date, fin: Date): Promise<Record<string, StatutJour>> {
    const { data } = await supabase
        .from("planning_conseillers")
        .select("jour, statut")
        .eq("conseiller_id", conseillerId)
        .gte("jour", jourLocal(debut))
        .lte("jour", jourLocal(fin));
    const r: Record<string, StatutJour> = {};
    (data ?? []).forEach((row: { jour: string; statut: StatutJour }) => { r[row.jour] = row.statut; });
    return r;
}

/** McAfee Mobile et Assurance essentielle par jour (variable_actes_jour), pour un conseiller. */
export async function getCombosParJour(conseillerId: string, debut: Date, fin: Date): Promise<Record<string, { mcafee_mobile: number; assurance_essentielle: number }>> {
    const [{ data: bonus }, { data: actes }] = await Promise.all([
        supabase.from("variable_bonus_manuels").select("id, label").eq("categorie", "autres_primes"),
        supabase
            .from("variable_actes_jour")
            .select("jour, champ, bonus_manuel_id, quantite")
            .eq("conseiller_id", conseillerId)
            .gte("jour", jourLocal(debut))
            .lte("jour", jourLocal(fin)),
    ]);
    const idsMcafee = new Set(
        (bonus ?? [])
            .filter((b: { label: string }) => b.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("mcafee"))
            .map((b: { id: string }) => b.id)
    );
    const r: Record<string, { mcafee_mobile: number; assurance_essentielle: number }> = {};
    (actes ?? []).forEach((a: { jour: string; champ: string | null; bonus_manuel_id: string | null; quantite: number | null }) => {
        const ligne = (r[a.jour] ??= { mcafee_mobile: 0, assurance_essentielle: 0 });
        if (a.champ === "assurance_essentielle") ligne.assurance_essentielle += a.quantite ?? 1;
        else if (a.bonus_manuel_id && idsMcafee.has(a.bonus_manuel_id)) ligne.mcafee_mobile += a.quantite ?? 1;
    });
    return r;
}

/** Jour travaillé (même règle que les objectifs) : "present", ou jour ouvré sans planning. */
export function estJourTravaille(date: Date, statut: StatutJour | undefined): boolean {
    if (statut !== undefined) return statut === "present";
    const j = date.getDay();
    return j !== 0 && j !== 6;
}
