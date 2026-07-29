/**
 * Bonus 4P attaché à une vente forfait : le forfait lui-même reste payé sur le mois en cours
 * (aucun changement), mais son bonus 4P (3€) est différé et crédité sur la variable du mois
 * M+2, figé au montant du barème en vigueur au moment de la vente. Se combine avec le 4P sur
 * box (même montant, même décalage M+2) dans une ligne commune côté affichage.
 */

import { supabase } from "@/lib/supabase";

function moisCourantLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function moisPlus(mois: string, delta: number): string {
    const [y, m] = mois.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function creerForfait4PDiffere(conseillerId: string, montant: number): Promise<void> {
    const moisVente = moisCourantLocal();
    await supabase.from("forfait_4p_differes").insert({
        conseiller_id: conseillerId,
        montant,
        mois_vente: moisVente,
        mois_paiement: moisPlus(moisVente, 2),
    });
}

/** Nombre total (à vie) de bonus 4P différés créés pour ce conseiller — pour les badges de collection. */
export async function getNbForfait4PDifferesConseiller(conseillerId: string): Promise<number> {
    const { data } = await supabase
        .from("forfait_4p_differes")
        .select("id")
        .eq("conseiller_id", conseillerId);
    return (data ?? []).length;
}

export type ContributionForfait4P = { nb: number; montantTotal: number };

export async function getContributionForfait4PMoisPaiement(
    conseillerId: string,
    moisPaiement: string
): Promise<ContributionForfait4P> {
    const { data } = await supabase
        .from("forfait_4p_differes")
        .select("montant")
        .eq("conseiller_id", conseillerId)
        .eq("mois_paiement", moisPaiement);

    const rows = data ?? [];
    return {
        nb: rows.length,
        montantTotal: Math.round(rows.reduce((t: number, r: any) => t + (r.montant ?? 0), 0) * 100) / 100,
    };
}
