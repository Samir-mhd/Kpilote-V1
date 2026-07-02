import { supabase } from "@/lib/supabase";

export type StatutJour = "present" | "off" | "formation" | "arret_maladie";

// Jours où le conseiller peut vendre (pour le calcul des objectifs)
const STATUTS_VENDEUR: StatutJour[] = ["present"];

function estWeekend(date: Date): boolean {
    const d = date.getDay();
    return d === 0 || d === 6;
}

function dateStr(annee: number, mois: number, jour: number): string {
    return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/**
 * Calcule le nombre de jours "vendeur" travaillés et restants pour un mois donné.
 *
 * Règles :
 * - Si un jour a le statut "present" dans le planning → compte comme jour de vente
 * - Si un jour a un autre statut (off, formation, arret_maladie) → ne compte pas
 * - Si aucune entrée planning pour ce jour → fallback : compte si c'est un jour de semaine (lun-ven)
 *
 * "travailles" = du 1er au jour J inclus (jours passés + aujourd'hui)
 * "restants"   = du lendemain à la fin du mois
 */
export async function getJoursTravail(
    conseillerId: string,
    annee: number,
    mois: number
): Promise<{ travailles: number; restants: number }> {
    // Récupère le planning du mois (silencieux si table absente)
    let planning: Record<string, StatutJour> = {};
    try {
        planning = await getPlanningMois(conseillerId, annee, mois);
    } catch {
        // Table planning_conseillers absente → fallback jours ouvrés
    }

    const now = new Date();
    const jourAujourdhui =
        annee === now.getFullYear() && mois === now.getMonth() + 1
            ? now.getDate()
            : null; // mois différent du mois courant

    const nbJours = new Date(annee, mois, 0).getDate();
    let travailles = 0;
    let restants = 0;

    for (let jour = 1; jour <= nbJours; jour++) {
        const date = dateStr(annee, mois, jour);
        const dateObj = new Date(annee, mois - 1, jour);
        const statut = planning[date] as StatutJour | undefined;

        // Un jour compte comme jour de vente si :
        // - planning explicitement "present"
        // - OU aucune entrée ET c'est un jour de semaine
        const estJourVente = statut !== undefined
            ? STATUTS_VENDEUR.includes(statut)
            : !estWeekend(dateObj);

        if (!estJourVente) continue;

        if (jourAujourdhui === null) {
            // Mois passé → tout compte en "travaillé"
            if (annee < now.getFullYear() || mois < now.getMonth() + 1) {
                travailles++;
            } else {
                // Mois futur → tout compte en "restants"
                restants++;
            }
        } else if (jour <= jourAujourdhui) {
            travailles++;
        } else {
            restants++;
        }
    }

    return {
        travailles: Math.max(travailles, 1),
        restants: Math.max(restants, 1),
    };
}

export type PlanningEntry = {
    id?: string;
    conseiller_id: string;
    date: string; // YYYY-MM-DD
    statut: StatutJour;
};

export async function getPlanningMois(
    conseillerId: string,
    annee: number,
    mois: number // 1-12
): Promise<Record<string, StatutJour>> {
    const debut = `${annee}-${String(mois).padStart(2, "0")}-01`;
    const fin = new Date(annee, mois, 0); // dernier jour du mois
    const finStr = `${annee}-${String(mois).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
        .from("planning_conseillers")
        .select("date, statut")
        .eq("conseiller_id", conseillerId)
        .gte("date", debut)
        .lte("date", finStr);

    if (error) throw new Error(error.message ?? "Erreur Supabase planning");

    const result: Record<string, StatutJour> = {};
    (data ?? []).forEach((row: any) => {
        result[row.date] = row.statut as StatutJour;
    });

    return result;
}

export async function savePlanning(
    conseillerId: string,
    modifications: Record<string, StatutJour | null>
): Promise<void> {
    const aUpsert: PlanningEntry[] = [];
    const aSupprimer: string[] = [];

    Object.entries(modifications).forEach(([date, statut]) => {
        if (statut === null) {
            aSupprimer.push(date);
        } else {
            aUpsert.push({ conseiller_id: conseillerId, date, statut });
        }
    });

    if (aUpsert.length > 0) {
        const { error } = await supabase
            .from("planning_conseillers")
            .upsert(aUpsert, { onConflict: "conseiller_id,date" });

        if (error) throw new Error(error.message ?? "Erreur Supabase planning");
    }

    for (const date of aSupprimer) {
        const { error } = await supabase
            .from("planning_conseillers")
            .delete()
            .eq("conseiller_id", conseillerId)
            .eq("date", date);

        if (error) throw new Error(error.message ?? "Erreur Supabase planning");
    }
}
