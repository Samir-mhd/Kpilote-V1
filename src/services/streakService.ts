/**
 * Streak (série) conseiller : jours de travail planifiés consécutifs avec au moins une vente
 * (hors Spiderhome, hors cerebro_check). Un jour non planifié n'interrompt jamais la série.
 * Un jeton de "gel" mensuel permet d'absorber UN jour travaillé sans vente sans casser la série.
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import { STATUTS_VENDEUR, estWeekend, jourStr, StatutJour } from "@/services/planningService";

export const GELS_PAR_MOIS = 1;
const PROFONDEUR_JOURS = 120;

export type StreakBadge = {
    code: string;
    seuil: number;
    label: string;
    emoji: string;
    de: string;
    a: string;
};

export const STREAK_BADGES: StreakBadge[] = [
    { code: "streak_3",  seuil: 3,  label: "Étincelle", emoji: "✨", de: "#fde68a", a: "#f59e0b" },
    { code: "streak_7",  seuil: 7,  label: "Braise",     emoji: "🔥", de: "#fdba74", a: "#ea580c" },
    { code: "streak_14", seuil: 14, label: "Feu ardent", emoji: "🔥", de: "#fca5a5", a: "#dc2626" },
    { code: "streak_30", seuil: 30, label: "Légende",    emoji: "👑", a: "#7c3aed", de: "#c4b5fd" },
];

export type StreakInfo = {
    streakActuel: number;
    gelsRestants: number;
    risqueAujourdhui: boolean;
    aVenduAujourdhui: boolean;
    badgesObtenus: Record<string, string>;
    prochainBadge: StreakBadge | null;
};

function moisDeJour(jour: string): string {
    return jour.slice(0, 7);
}

export async function calculerStreak(conseillerId: string): Promise<StreakInfo> {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const debut = new Date(aujourdhui);
    debut.setDate(debut.getDate() - PROFONDEUR_JOURS);

    const [{ data: planningRows }, ventesRows, { data: gelRows }, { data: badgeRows }] = await Promise.all([
        supabase
            .from("planning_conseillers")
            .select("jour, statut")
            .eq("conseiller_id", conseillerId)
            .gte("jour", jourStr(debut))
            .lte("jour", jourStr(aujourdhui)),
        fetchToutesLesLignes((from, to) =>
            supabase
                .from("ventes")
                .select("created_at, produits(code)")
                .eq("conseiller_id", conseillerId)
                .or("source.neq.cerebro_check,source.is.null")
                .gte("created_at", debut.toISOString())
                .order("created_at", { ascending: true })
                .range(from, to)
        ),
        supabase
            .from("conseiller_streak_gels")
            .select("jour")
            .eq("conseiller_id", conseillerId)
            .gte("jour", jourStr(debut)),
        supabase
            .from("conseiller_badges")
            .select("badge_code, obtenu_le")
            .eq("conseiller_id", conseillerId),
    ]);

    const planningMap: Record<string, StatutJour> = {};
    (planningRows ?? []).forEach((r: any) => { planningMap[r.jour] = r.statut as StatutJour; });

    function jourTravaille(d: Date): boolean {
        const statut = planningMap[jourStr(d)];
        return statut !== undefined ? STATUTS_VENDEUR.includes(statut) : !estWeekend(d);
    }

    const ventesSet = new Set<string>();
    (ventesRows ?? []).forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (code === "spiderhome") return;
        ventesSet.add(jourStr(new Date(v.created_at)));
    });

    const gelsDejaConsommes = new Set<string>((gelRows ?? []).map((r: any) => r.jour as string));
    const gelsUtilisesParMois: Record<string, number> = {};
    gelsDejaConsommes.forEach((j) => {
        const m = moisDeJour(j);
        gelsUtilisesParMois[m] = (gelsUtilisesParMois[m] ?? 0) + 1;
    });

    const aVenduAujourdhui = ventesSet.has(jourStr(aujourdhui));
    const risqueAujourdhui = !aVenduAujourdhui && jourTravaille(aujourdhui);

    const cursor = new Date(aujourdhui);
    if (!aVenduAujourdhui) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    const nouveauxGels: string[] = [];

    for (let i = 0; i < PROFONDEUR_JOURS; i++) {
        if (!jourTravaille(cursor)) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
        }
        const key = jourStr(cursor);
        if (ventesSet.has(key)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
            continue;
        }
        if (gelsDejaConsommes.has(key)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
            continue;
        }
        const mois = moisDeJour(key);
        const utilisesCeMois = (gelsUtilisesParMois[mois] ?? 0) + nouveauxGels.filter((j) => moisDeJour(j) === mois).length;
        if (utilisesCeMois < GELS_PAR_MOIS) {
            nouveauxGels.push(key);
            streak++;
            cursor.setDate(cursor.getDate() - 1);
            continue;
        }
        break;
    }

    if (nouveauxGels.length > 0) {
        await supabase.from("conseiller_streak_gels").insert(
            nouveauxGels.map((jour) => ({ conseiller_id: conseillerId, jour, mois: moisDeJour(jour) }))
        );
    }

    const moisCourant = jourStr(aujourdhui).slice(0, 7);
    const utilisesMoisCourant = (gelsUtilisesParMois[moisCourant] ?? 0) + nouveauxGels.filter((j) => moisDeJour(j) === moisCourant).length;
    const gelsRestants = Math.max(GELS_PAR_MOIS - utilisesMoisCourant, 0);

    const badgesObtenus: Record<string, string> = {};
    (badgeRows ?? []).forEach((r: any) => { badgesObtenus[r.badge_code] = r.obtenu_le; });

    const aDebloquer = STREAK_BADGES.filter((b) => b.seuil <= streak && !badgesObtenus[b.code]);
    if (aDebloquer.length > 0) {
        const aujourdhuiStr = jourStr(aujourdhui);
        await supabase.from("conseiller_badges").insert(
            aDebloquer.map((b) => ({ conseiller_id: conseillerId, badge_code: b.code, obtenu_le: aujourdhuiStr }))
        );
        aDebloquer.forEach((b) => { badgesObtenus[b.code] = aujourdhuiStr; });
    }

    const prochainBadge = STREAK_BADGES.find((b) => !badgesObtenus[b.code]) ?? null;

    return { streakActuel: streak, gelsRestants, risqueAujourdhui, aVenduAujourdhui, badgesObtenus, prochainBadge };
}
