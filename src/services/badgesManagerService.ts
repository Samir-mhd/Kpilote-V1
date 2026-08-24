/**
 * Vue manager du "mur des trophées" : lit les badges déjà débloqués (persistés par les
 * conseillers via leur propre page /dashboard/badges) — ne calcule ni ne débloque rien ici.
 */
import { supabase } from "@/lib/supabase";

export type DetenteurBadge = { conseillerId: string; nom: string; obtenuLe: string };

function estActif(row: any): boolean {
    const c = Array.isArray(row.conseillers) ? row.conseillers[0] : row.conseillers;
    return c?.profil_actif !== false;
}

/** badge_code → liste des détenteurs, triée par date d'obtention (le premier à débloquer en tête).
 *  Profils désactivés exclus — invisibles du mur des trophées comme partout ailleurs. */
export async function getDetenteursBadges(): Promise<Record<string, DetenteurBadge[]>> {
    const { data } = await supabase
        .from("conseiller_badges")
        .select("badge_code, obtenu_le, conseiller_id, conseillers(nom, profil_actif)")
        .order("obtenu_le", { ascending: true });

    const parBadge: Record<string, DetenteurBadge[]> = {};
    (data ?? []).forEach((r: any) => {
        if (!estActif(r)) return;
        const nom = (Array.isArray(r.conseillers) ? r.conseillers[0] : r.conseillers)?.nom ?? "?";
        if (!parBadge[r.badge_code]) parBadge[r.badge_code] = [];
        parBadge[r.badge_code].push({ conseillerId: r.conseiller_id, nom, obtenuLe: r.obtenu_le });
    });
    return parBadge;
}

export type BadgeDebloqueLe = DetenteurBadge & { badgeCode: string };

/** Badges débloqués un jour précis (format "YYYY-MM-DD") — utilisé par le brief du matin pour "hier".
 *  Profils désactivés exclus. */
export async function getBadgesDebloquesLe(jour: string): Promise<BadgeDebloqueLe[]> {
    const { data } = await supabase
        .from("conseiller_badges")
        .select("badge_code, obtenu_le, conseiller_id, conseillers(nom, profil_actif)")
        .eq("obtenu_le", jour);

    return (data ?? [])
        .filter(estActif)
        .map((r: any) => ({
            badgeCode: r.badge_code,
            conseillerId: r.conseiller_id,
            nom: (Array.isArray(r.conseillers) ? r.conseillers[0] : r.conseillers)?.nom ?? "?",
            obtenuLe: r.obtenu_le,
        }));
}
