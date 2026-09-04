/**
 * Suivi des box vendues en attendant leur raccordement — paiement M+2.
 * Chaque vente box fige immédiatement les montants (box, 4P, McAfee) et le seuil/boost
 * individuel en vigueur au moment de la vente : le barème du mois de paiement (M+2) ne doit
 * jamais influencer une vente déjà faite, même s'il change entre-temps.
 * Le conseiller valide ensuite le raccordement (+ confirme 4P / McAfee) quand c'est fait,
 * ce qui alimente automatiquement sa variable du mois M+2. Passé la date limite (fin du
 * mois M+2), une box non raccordée est définitivement perdue (non payée).
 */

import { supabase } from "@/lib/supabase";
import { BaremeVariable } from "./variableConseiller";

export type ModeleBox = "box_ultra" | "box_pop" | "box_pop_s_revolution_5g";

export const MODELE_BOX_LABELS: Record<ModeleBox, string> = {
    box_ultra: "Ultra / Ultra Essentiel",
    box_pop: "POP",
    box_pop_s_revolution_5g: "POP S / Révolution / Box 5G",
};

/** Montant unique McAfee pour le raccordement (oui/non, sans distinction de palier). */
export const MONTANT_MCAFEE_RACCORDEMENT = 4.99;

export type CanalOption = "canal1" | "canal2" | "canal3";

export const CANAL_LABELS: Record<CanalOption, string> = {
    canal1: "Canal+ Option 1",
    canal2: "Canal+ Option 2",
    canal3: "Canal+ Option 3",
};

export type FicheBoxRaccordement = {
    id: string;
    conseillerId: string;
    dateVente: string; // "YYYY-MM-DD" — date réelle de la vente, choisie par le conseiller (peut être antérieure à aujourd'hui pour un rattrapage)
    moisVente: string;
    moisPaiement: string;
    modele: ModeleBox;
    montantBox: number;
    quatreP: boolean;
    montant4P: number;
    mcafee: boolean;
    montantMcafee: number;
    canal1: boolean;
    montantCanal1: number;
    canal2: boolean;
    montantCanal2: number;
    canal3: boolean;
    montantCanal3: number;
    seuilBox: number;
    boostIndividuelBox: number;
    raccordee: boolean;
    raccordeeLe: string | null;
    commentaire: string | null;
    createdAt: string;
};

/** Date du jour au format "YYYY-MM-DD" (locale, pas UTC) — valeur par défaut du sélecteur de date de vente. */
export function dateDuJour(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" -> "YYYY-MM-01" : mois de vente à partir de la date choisie (simple découpage, pas de fuseau horaire en jeu). */
function moisDe(dateIso: string): string {
    return `${dateIso.slice(0, 7)}-01`;
}

function moisPlus(mois: string, delta: number): string {
    const [y, m] = mois.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Nom du mois (ex: "août 2026") à partir d'une chaîne "YYYY-MM-01". */
export function nomMois(mois: string): string {
    const [y, m] = mois.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

const SELECT_FICHE =
    "id, conseiller_id, date_vente, mois_vente, mois_paiement, modele, montant_box, quatre_p, montant_4p, mcafee, montant_mcafee, canal1, montant_canal1, canal2, montant_canal2, canal3, montant_canal3, seuil_box, boost_individuel_box, raccordee, raccordee_le, commentaire, created_at";

function mapFiche(r: any): FicheBoxRaccordement {
    return {
        id: r.id,
        conseillerId: r.conseiller_id,
        dateVente: r.date_vente,
        moisVente: r.mois_vente,
        moisPaiement: r.mois_paiement,
        modele: r.modele,
        montantBox: r.montant_box,
        quatreP: r.quatre_p,
        montant4P: r.montant_4p,
        mcafee: r.mcafee,
        montantMcafee: r.montant_mcafee,
        canal1: r.canal1,
        montantCanal1: r.montant_canal1,
        canal2: r.canal2,
        montantCanal2: r.montant_canal2,
        canal3: r.canal3,
        montantCanal3: r.montant_canal3,
        seuilBox: r.seuil_box,
        boostIndividuelBox: r.boost_individuel_box,
        raccordee: r.raccordee,
        raccordeeLe: r.raccordee_le,
        commentaire: r.commentaire ?? null,
        createdAt: r.created_at,
    };
}

/**
 * Crée la fiche de suivi au moment de la vente — fige tout le barème pertinent tout de suite.
 * `dateVente` (optionnel, "YYYY-MM-DD") permet un rattrapage : mois de vente et mois de paiement
 * (M+2) suivent la date choisie, pas la date de saisie. Le barème figé, lui, reste toujours celui
 * en vigueur au moment du clic (aucun historique de barème par mois passé n'est conservé) — pour
 * un rattrapage sur un mois où le barème a changé depuis, les montants figés peuvent différer de
 * ceux réellement en vigueur ce mois-là.
 */
export async function creerFicheBoxRaccordement(
    conseillerId: string,
    modele: ModeleBox,
    bareme: BaremeVariable,
    dateVente?: string
): Promise<void> {
    const dateVenteFinale = dateVente ?? dateDuJour();
    const moisVente = moisDe(dateVenteFinale);
    await supabase.from("box_raccordements").insert({
        conseiller_id: conseillerId,
        date_vente: dateVenteFinale,
        mois_vente: moisVente,
        mois_paiement: moisPlus(moisVente, 2),
        modele,
        montant_box: bareme[modele],
        montant_4p: bareme.cross_sell_4p,
        montant_mcafee: MONTANT_MCAFEE_RACCORDEMENT,
        montant_canal1: bareme.canal_option1,
        montant_canal2: bareme.canal_option2,
        montant_canal3: bareme.canal_option3,
        seuil_box: bareme.seuil_box,
        boost_individuel_box: bareme.boost_individuel_box,
    });
}

export async function getFichesBoxRaccordement(conseillerId: string): Promise<FicheBoxRaccordement[]> {
    const { data } = await supabase
        .from("box_raccordements")
        .select(SELECT_FICHE)
        .eq("conseiller_id", conseillerId)
        .order("date_vente", { ascending: false })
        .order("created_at", { ascending: false });
    return (data ?? []).map(mapFiche);
}

/** Dernier jour du mois de paiement (23:59:59) — date limite de raccordement. */
export function dateLimite(moisPaiement: string): Date {
    const [y, m] = moisPaiement.split("-").map(Number);
    return new Date(y, m, 0, 23, 59, 59);
}

export function estPerdue(fiche: FicheBoxRaccordement): boolean {
    return !fiche.raccordee && new Date() > dateLimite(fiche.moisPaiement);
}

/** Bascule le statut raccordée — recliquer une fiche déjà raccordée la remet en attente
 *  (pour corriger un 4P/McAfee oublié avant validation, sans perdre la fiche). */
export async function basculerRaccordement(ficheId: string, raccordee: boolean): Promise<void> {
    await supabase
        .from("box_raccordements")
        .update({ raccordee, raccordee_le: raccordee ? new Date().toISOString() : null })
        .eq("id", ficheId);
}

/** Met à jour 4P / McAfee / Canal+ / commentaire — enregistré immédiatement, indépendamment du raccordement. */
export async function mettreAJourFiche(
    ficheId: string,
    valeurs: Partial<{ quatreP: boolean; mcafee: boolean; canal1: boolean; canal2: boolean; canal3: boolean; commentaire: string }>
): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (valeurs.quatreP !== undefined) payload.quatre_p = valeurs.quatreP;
    if (valeurs.mcafee !== undefined) payload.mcafee = valeurs.mcafee;
    if (valeurs.canal1 !== undefined) payload.canal1 = valeurs.canal1;
    if (valeurs.canal2 !== undefined) payload.canal2 = valeurs.canal2;
    if (valeurs.canal3 !== undefined) payload.canal3 = valeurs.canal3;
    if (valeurs.commentaire !== undefined) payload.commentaire = valeurs.commentaire || null;
    if (Object.keys(payload).length === 0) return;
    await supabase.from("box_raccordements").update(payload).eq("id", ficheId);
}

export async function supprimerFicheBoxRaccordement(ficheId: string): Promise<void> {
    await supabase.from("box_raccordements").delete().eq("id", ficheId);
}

export type ContributionBoxMoisPaiement = {
    primeBox: number;
    prime4P: number;
    nb4P: number;
    primeMcafee: number;
    primeCanal: number;
    boostIndividuel: number;
    total: number;
    nbRaccordees: number;
};

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Contribution figée (box + 4P + McAfee + Canal+ + boost individuel du cohort) à ajouter à la
 * variable du mois de paiement donné — recalculée à chaque nouveau raccordement de ce cohort.
 */
export async function getContributionBoxMoisPaiement(
    conseillerId: string,
    moisPaiement: string
): Promise<ContributionBoxMoisPaiement> {
    const { data } = await supabase
        .from("box_raccordements")
        .select(SELECT_FICHE)
        .eq("conseiller_id", conseillerId)
        .eq("mois_paiement", moisPaiement);

    const raccordees = (data ?? []).map(mapFiche).filter((f) => f.raccordee);

    const primeBox = raccordees.reduce((t, f) => t + f.montantBox, 0);
    const box4P = raccordees.filter((f) => f.quatreP);
    const prime4P = box4P.reduce((t, f) => t + f.montant4P, 0);
    const primeMcafee = raccordees.filter((f) => f.mcafee).reduce((t, f) => t + f.montantMcafee, 0);
    const primeCanal =
        raccordees.filter((f) => f.canal1).reduce((t, f) => t + f.montantCanal1, 0) +
        raccordees.filter((f) => f.canal2).reduce((t, f) => t + f.montantCanal2, 0) +
        raccordees.filter((f) => f.canal3).reduce((t, f) => t + f.montantCanal3, 0);

    // Seuil et taux de boost figés identiques pour tout le cohort (même vente/même barème figé).
    const seuil = raccordees[0]?.seuilBox ?? 0;
    const tauxBoost = raccordees[0]?.boostIndividuelBox ?? 0;
    const boostIndividuel = Math.max(0, raccordees.length - seuil) * tauxBoost;

    return {
        primeBox: round2(primeBox),
        prime4P: round2(prime4P),
        nb4P: box4P.length,
        primeMcafee: round2(primeMcafee),
        primeCanal: round2(primeCanal),
        boostIndividuel: round2(boostIndividuel),
        total: round2(primeBox + prime4P + primeMcafee + primeCanal + boostIndividuel),
        nbRaccordees: raccordees.length,
    };
}
