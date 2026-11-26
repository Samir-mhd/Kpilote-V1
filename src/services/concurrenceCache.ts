/**
 * Cache serveur des offres concurrentes, un cache par opérateur.
 * - Relecture en arrière-plan au-delà de 12 h (déclenchée par /api/outils/rafraichir, appelé
 *   toutes les heures par GitHub Actions, et par les visites de la page).
 * - Si une relecture échoue (site en panne, page modifiée, lecture invalide), Next garde la
 *   dernière version valide : la page l'affiche avec sa date de relevé (« à vérifier » si trop ancienne).
 */
import { unstable_cache } from "next/cache";
import { lireOperateur, OPERATEURS, type OperateurId, type ReleveOperateur } from "@/services/concurrenceService";

export const DUREE_CONCURRENCE_S = 12 * 60 * 60;

const caches = Object.fromEntries(
    OPERATEURS.map((op) => [op, unstable_cache(() => lireOperateur(op), [`concurrence-${op}-v2`], { revalidate: DUREE_CONCURRENCE_S, tags: ["concurrence"] })]),
) as Record<OperateurId, () => Promise<ReleveOperateur>>;

export type EtatOperateur = ReleveOperateur | { op: OperateurId; erreur: string };

export async function concurrenceEnCache(): Promise<EtatOperateur[]> {
    const res = await Promise.allSettled(OPERATEURS.map((op) => caches[op]()));
    return res.map((r, i) => (r.status === "fulfilled" ? r.value : { op: OPERATEURS[i], erreur: r.reason instanceof Error ? r.reason.message : "Lecture impossible" }));
}
