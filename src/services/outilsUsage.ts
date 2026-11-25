/**
 * Suivi d'utilisation des outils (table outils_usage, sql/outils_usage.sql).
 * Seuls les conseillers sont comptés (id dans l'URL) ; le manager n'est jamais tracé.
 * Silencieux : une erreur d'écriture ne gêne jamais l'outil.
 */
import { supabase } from "@/lib/supabase";

export type OutilSuivi = "telephones" | "box";
export type ActionSuivi = "ouverture" | "impression";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tracerOutil(outil: OutilSuivi, action: ActionSuivi) {
    if (typeof window === "undefined" || window.location.pathname.startsWith("/manager")) return;
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    if (!UUID.test(id)) return;
    supabase.from("outils_usage").insert({ conseiller_id: id, outil, action }).then(() => {}, () => {});
}

export type StatsOutilsLigne = { id: string; nom: string; telephones: number; impressions: number; box: number; total: number };

/** Compteurs par conseiller depuis `depuis` (null = depuis le début). `null` si la table n'existe pas. */
export async function getStatsOutils(depuis: Date | null): Promise<StatsOutilsLigne[] | null> {
    let q = supabase.from("outils_usage").select("conseiller_id, outil, action").limit(50000);
    if (depuis) q = q.gte("created_at", depuis.toISOString());
    const [{ data, error }, { data: cons }] = await Promise.all([q, supabase.from("conseillers").select("id, nom, profil_actif")]);
    if (error) return null;
    const lignes: Record<string, StatsOutilsLigne> = {};
    (cons ?? []).forEach((c: { id: string; nom: string; profil_actif: boolean | null }) => {
        if (c.profil_actif === false) return;
        lignes[c.id] = { id: c.id, nom: c.nom, telephones: 0, impressions: 0, box: 0, total: 0 };
    });
    (data ?? []).forEach((r: { conseiller_id: string; outil: string; action: string }) => {
        const l = lignes[r.conseiller_id] ??= { id: r.conseiller_id, nom: "—", telephones: 0, impressions: 0, box: 0, total: 0 };
        if (r.outil === "telephones" && r.action === "impression") l.impressions++;
        else if (r.outil === "telephones") l.telephones++;
        else if (r.outil === "box") l.box++;
        l.total++;
    });
    return Object.values(lignes).sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom));
}
