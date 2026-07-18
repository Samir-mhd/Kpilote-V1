import { supabase } from "@/lib/supabase";

export type StatutJour =
    | "present"
    | "off"
    | "formation"
    | "arret_maladie"
    | "conges_payes"
    | "ferie";

// Seul "present" compte comme jour de vente pour les objectifs
const STATUTS_VENDEUR: StatutJour[] = ["present"];

// ─── Helpers date ──────────────────────────────────────────────────────────────

function jourStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function jourStrParts(annee: number, mois: number, jour: number): string {
    return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

function estWeekend(d: Date): boolean {
    return d.getDay() === 0 || d.getDay() === 6;
}

// ─── Jours fériés français ─────────────────────────────────────────────────────

/** Calcul de Pâques (algorithme Meeus/Jones/Butcher). */
function calculerPaques(annee: number): Date {
    const a = annee % 19;
    const b = Math.floor(annee / 100);
    const c = annee % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const moisP = Math.floor((h + l - 7 * m + 114) / 31);
    const jourP = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(annee, moisP - 1, jourP);
}

/** Retourne l'ensemble des jours fériés français pour une année (format YYYY-MM-DD). */
export function joursFeriesAnnee(annee: number): Set<string> {
    const feries = new Set<string>();

    // Dates fixes
    [
        `${annee}-01-01`, // Jour de l'An
        `${annee}-05-01`, // Fête du Travail
        `${annee}-05-08`, // Victoire 1945
        `${annee}-07-14`, // Fête Nationale
        `${annee}-08-15`, // Assomption
        `${annee}-11-01`, // Toussaint
        `${annee}-11-11`, // Armistice
        `${annee}-12-25`, // Noël
    ].forEach((d) => feries.add(d));

    // Dates mobiles (basées sur Pâques)
    const paques = calculerPaques(annee);
    const addJours = (base: Date, delta: number) => {
        const d = new Date(base);
        d.setDate(d.getDate() + delta);
        feries.add(jourStr(d));
    };

    feries.add(jourStr(paques));    // Dimanche de Pâques (dimanche = off de toute façon)
    addJours(paques, 1);            // Lundi de Pâques
    addJours(paques, 39);           // Ascension
    addJours(paques, 49);           // Dimanche de Pentecôte
    addJours(paques, 50);           // Lundi de Pentecôte

    return feries;
}

// ─── Pré-planification automatique ────────────────────────────────────────────

/** Calcule le planning de base d'un mois :
 *  - Dimanche      → "off"
 *  - Jour férié    → "ferie"
 *  - Reste (y compris samedi) → "present"
 */
function calculerPlanningBase(
    annee: number,
    mois: number
): { jour: string; statut: StatutJour }[] {
    const feries = joursFeriesAnnee(annee);
    const nb = new Date(annee, mois, 0).getDate();
    const résultat: { jour: string; statut: StatutJour }[] = [];

    for (let j = 1; j <= nb; j++) {
        const date = new Date(annee, mois - 1, j);
        const clé  = jourStrParts(annee, mois, j);

        let statut: StatutJour;
        if (feries.has(clé))          statut = "ferie";
        else if (date.getDay() === 0) statut = "off";   // dimanche
        else                           statut = "present";

        résultat.push({ jour: clé, statut });
    }

    return résultat;
}

/**
 * Génère la pré-planification automatique pour UN conseiller sur un mois entier.
 * Écrase le planning existant pour ce mois.
 */
export async function genererPrePlanification(
    conseillerId: string,
    annee: number,
    mois: number
): Promise<void> {
    const debut = jourStrParts(annee, mois, 1);
    const fin   = jourStrParts(annee, mois, new Date(annee, mois, 0).getDate());

    // Supprime tout le mois
    const { error: errDel } = await supabase
        .from("planning_conseillers")
        .delete()
        .eq("conseiller_id", conseillerId)
        .gte("jour", debut)
        .lte("jour", fin);

    if (errDel) throw new Error(errDel.message ?? "Erreur suppression pré-planning");

    // Insère le planning de base
    const base = calculerPlanningBase(annee, mois).map((e) => ({
        conseiller_id: conseillerId,
        jour: e.jour,
        statut: e.statut,
    }));

    const { error: errIns } = await supabase
        .from("planning_conseillers")
        .insert(base);

    if (errIns) throw new Error(errIns.message ?? "Erreur insertion pré-planning");
}

/**
 * Génère la pré-planification pour TOUS les conseillers d'un mois.
 */
export async function genererPrePlanificationTous(
    conseillerIds: string[],
    annee: number,
    mois: number
): Promise<void> {
    await Promise.all(conseillerIds.map((id) => genererPrePlanification(id, annee, mois)));
}

// ─── Calcul jours travaillés ───────────────────────────────────────────────────

export async function getJoursTravail(
    conseillerId: string,
    annee: number,
    mois: number
): Promise<{ travailles: number; restants: number }> {
    let planning: Record<string, StatutJour> = {};
    try {
        planning = await getPlanningMois(conseillerId, annee, mois);
    } catch { /* fallback : jours ouvrés classiques */ }

    const now = new Date();
    const jourAujourdhui =
        annee === now.getFullYear() && mois === now.getMonth() + 1
            ? now.getDate()
            : null;

    const nb = new Date(annee, mois, 0).getDate();
    let travailles = 0;
    let restants   = 0;

    for (let j = 1; j <= nb; j++) {
        const clé    = jourStrParts(annee, mois, j);
        const dateObj = new Date(annee, mois - 1, j);
        const statut  = planning[clé] as StatutJour | undefined;

        // Jour de vente = "present" explicite OU (pas de planning ET jour ouvré)
        const estJourVente = statut !== undefined
            ? STATUTS_VENDEUR.includes(statut)
            : !estWeekend(dateObj);

        if (!estJourVente) continue;

        if (jourAujourdhui === null) {
            annee < now.getFullYear() || mois < now.getMonth() + 1
                ? travailles++
                : restants++;
        } else if (j <= jourAujourdhui) {
            travailles++;
        } else {
            restants++;
        }
    }

    return { travailles: Math.max(travailles, 1), restants: Math.max(restants, 1) };
}

// ─── Total jours planifiés (tous conseillers) ─────────────────────────────────

/**
 * Retourne le nombre total de jours "present" dans le mois pour chaque conseiller.
 * Fallback : jours ouvrés (hors weekend) si aucune donnée planning.
 */
export async function getJoursTravailTous(
    conseillerIds: string[],
    annee: number,
    mois: number
): Promise<Record<string, number>> {
    if (conseillerIds.length === 0) return {};

    const debut = jourStrParts(annee, mois, 1);
    const fin   = jourStrParts(annee, mois, new Date(annee, mois, 0).getDate());

    const { data } = await supabase
        .from("planning_conseillers")
        .select("conseiller_id, jour, statut")
        .in("conseiller_id", conseillerIds)
        .gte("jour", debut)
        .lte("jour", fin);

    const plannings: Record<string, Record<string, StatutJour>> = {};
    for (const id of conseillerIds) plannings[id] = {};
    (data ?? []).forEach((row: any) => {
        if (plannings[row.conseiller_id]) {
            plannings[row.conseiller_id][row.jour] = row.statut as StatutJour;
        }
    });

    const nb = new Date(annee, mois, 0).getDate();
    const result: Record<string, number> = {};

    for (const conseillerId of conseillerIds) {
        const planning = plannings[conseillerId];
        let total = 0;

        for (let j = 1; j <= nb; j++) {
            const clé     = jourStrParts(annee, mois, j);
            const dateObj = new Date(annee, mois - 1, j);
            const statut  = planning[clé] as StatutJour | undefined;

            const estJourVente = statut !== undefined
                ? STATUTS_VENDEUR.includes(statut)
                : !estWeekend(dateObj);

            if (estJourVente) total++;
        }

        result[conseillerId] = Math.max(total, 1);
    }

    return result;
}

// ─── Lecture planning ──────────────────────────────────────────────────────────

export async function getPlanningMois(
    conseillerId: string,
    annee: number,
    mois: number
): Promise<Record<string, StatutJour>> {
    const debut = jourStrParts(annee, mois, 1);
    const fin   = jourStrParts(annee, mois, new Date(annee, mois, 0).getDate());

    const { data, error } = await supabase
        .from("planning_conseillers")
        .select("jour, statut")
        .eq("conseiller_id", conseillerId)
        .gte("jour", debut)
        .lte("jour", fin);

    if (error) throw new Error(error.message ?? "Erreur lecture planning");

    const result: Record<string, StatutJour> = {};
    (data ?? []).forEach((row: any) => { result[row.jour] = row.statut as StatutJour; });
    return result;
}

// ─── Écriture planning ─────────────────────────────────────────────────────────

export async function savePlanning(
    conseillerId: string,
    modifications: Record<string, StatutJour | null>
): Promise<void> {
    const aInserer: { conseiller_id: string; jour: string; statut: StatutJour }[] = [];
    const aSupprimer: string[] = [];

    Object.entries(modifications).forEach(([jour, statut]) => {
        statut === null
            ? aSupprimer.push(jour)
            : aInserer.push({ conseiller_id: conseillerId, jour, statut });
    });

    const tousLesDates = [...aInserer.map((e) => e.jour), ...aSupprimer];

    if (tousLesDates.length > 0) {
        const { error } = await supabase
            .from("planning_conseillers")
            .delete()
            .eq("conseiller_id", conseillerId)
            .in("jour", tousLesDates);
        if (error) throw new Error(error.message ?? "Erreur suppression planning");
    }

    if (aInserer.length > 0) {
        const { error } = await supabase
            .from("planning_conseillers")
            .insert(aInserer);
        if (error) throw new Error(error.message ?? "Erreur insertion planning");
    }
}
