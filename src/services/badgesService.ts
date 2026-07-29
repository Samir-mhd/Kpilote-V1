/**
 * Collection de badges hors-série : maîtrise produit (volume cumulé à vie), box & 4P
 * (raccordement), défis & compétition. Les badges sont acquis à vie (table conseiller_badges,
 * partagée avec les badges de série de streakService.ts) — jamais retirés une fois débloqués.
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { getFichesBoxRaccordement, estPerdue, dateLimite, FicheBoxRaccordement } from "@/services/boxRaccordement";
import { getNbForfait4PDifferesConseiller } from "@/services/forfait4P";
import { getDefisEquipe, getScoreDefiEquipe } from "@/services/defisEquipeService";
import { STATUTS_VENDEUR, estWeekend, jourStr, StatutJour } from "@/services/planningService";
import { getMissionsReelles } from "@/services/missionsReelles";

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";
const PROFONDEUR_JOURS = 120;

export type Badge = {
    code: string;
    label: string;
    emoji: string;
    de: string;
    a: string;
    description: string;
};

// ─── Maîtrise produit (bronze / argent / or, volume cumulé à vie) ─────────────────

export const PALIERS_PRODUIT: Record<string, [number, number, number]> = {
    box: [40, 60, 100],
    forfaits: [100, 200, 400],
    telephones: [100, 200, 400],
    mcafee: [20, 30, 50],
    assurance: [30, 60, 100],
};

export const TIER_LABELS = ["Bronze", "Argent", "Or"];
export const TIER_COULEURS: [string, string][] = [
    ["#e7c39a", "#b8763f"],
    ["#e2e8f0", "#94a3b8"],
    ["#fde68a", "#eab308"],
];

export const PRODUIT_BADGES: Badge[] = Object.entries(PALIERS_PRODUIT).flatMap(([code, seuils]) => {
    const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
    return seuils.map((seuil, i) => ({
        code: `produit_${code}_${i}`,
        label: `${produit.label} ${TIER_LABELS[i]}`,
        emoji: produit.emoji,
        de: TIER_COULEURS[i][0],
        a: TIER_COULEURS[i][1],
        description: `${seuil} ventes ${produit.label} cumulées à vie`,
    }));
});

// ─── Box & 4P ───────────────────────────────────────────────────────────────────

export const BOX_BADGES: Badge[] = [
    { code: "box_premier", label: "Premier raccordement", emoji: "🔌", de: "#a7f3d0", a: "#059669", description: "1ère box raccordée avec succès" },
    { code: "box_closer", label: "Closer Box", emoji: "📦", de: "#93c5fd", a: "#2563eb", description: "10 box raccordées cumulées" },
    { code: "box_sans_faute", label: "Sans faute", emoji: "🛡️", de: "#fecaca", a: "#dc2626", description: "0 box perdue sur les 3 derniers mois clôturés" },
    { code: "box_roi_4p", label: "Roi du 4P", emoji: "👑", de: "#ddd6fe", a: "#7c3aed", description: "25 abonnés 4P cumulés (box + forfait)" },
];

// ─── Défis & compétition ────────────────────────────────────────────────────────

export const DEFI_BADGES: Badge[] = [
    { code: "defi_premier_sang", label: "Premier sang", emoji: "🥇", de: "#fecdd3", a: "#e11d48", description: "1ère victoire en défi (1v1 ou équipe)" },
    { code: "defi_guerrier", label: "Guerrier", emoji: "⚔️", de: "#fed7aa", a: "#ea580c", description: "5 victoires cumulées" },
    { code: "defi_invincible", label: "Invincible", emoji: "💎", de: "#bfdbfe", a: "#1d4ed8", description: "100% de victoires sur un mois (min. 3 défis 1v1)" },
    { code: "defi_esprit_equipe", label: "Esprit d'équipe", emoji: "🤝", de: "#c7d2fe", a: "#4338ca", description: "3 victoires en défi d'équipe" },
];

// ─── Streak par produit (box / mcafee / assurance) ─────────────────────────────

export const PRODUITS_STREAK = ["box", "mcafee", "assurance"] as const;

export const PRODUIT_STREAK_BADGES: Badge[] = PRODUITS_STREAK.map((code) => {
    const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
    return {
        code: `streak_${code}_semaine`,
        label: `Semaine ${produit.label} parfaite`,
        emoji: produit.emoji,
        de: "#bbf7d0",
        a: "#16a34a",
        description: `Au moins 1 vente ${produit.label} chaque jour travaillé pendant 7 jours`,
    };
});

// ─── Objectifs jour (hors Spiderhome) ──────────────────────────────────────────

export const PALIERS_JOURS_PARFAITS = [10, 20, 30, 40, 50];
const JOUR_PARFAIT_COULEURS: [string, string][] = [
    ["#e0f2fe", "#0284c7"],
    ["#dbeafe", "#2563eb"],
    ["#e0e7ff", "#4f46e5"],
    ["#ede9fe", "#7c3aed"],
    ["#fae8ff", "#a21caf"],
];

export const JOUR_PARFAIT_BADGES: Badge[] = PALIERS_JOURS_PARFAITS.map((seuil, i) => ({
    code: `jour_parfait_${seuil}`,
    label: `${seuil} jours parfaits`,
    emoji: "🎯",
    de: JOUR_PARFAIT_COULEURS[i][0],
    a: JOUR_PARFAIT_COULEURS[i][1],
    description: `${seuil} jours où tous les objectifs du jour (hors Spiderhome) ont été atteints`,
}));

export const SEMAINE_PARFAITE_BADGE: Badge = {
    code: "semaine_parfaite",
    label: "Semaine parfaite",
    emoji: "💯",
    de: "#ddd6fe",
    a: "#7c3aed",
    description: "7 jours travaillés d'affilée avec tous les objectifs du jour atteints",
};

export type EtatBadges = {
    debloques: Record<string, string>;
    volumeParProduit: Record<string, number>;
    nb4PCumule: number;
    nbBoxRaccordees: number;
    defisGagnes: number;
    equipeGagnes: number;
    streakParProduit: Record<string, number>;
    nbJoursParfaits: number;
    streakJoursParfaits: number;
};

async function getVolumeCumulProduit(conseillerId: string): Promise<Record<string, number>> {
    const rows = await fetchToutesLesLignes((from, to) =>
        supabase
            .from("ventes")
            .select("quantite, produits(code)")
            .eq("conseiller_id", conseillerId)
            .order("created_at", { ascending: true })
            .range(from, to)
    );
    const total: Record<string, number> = {};
    rows.forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (!code || code === "spiderhome") return;
        total[code] = (total[code] ?? 0) + (v.quantite ?? 1);
    });
    return total;
}

function sansFauteBox(fiches: FicheBoxRaccordement[]): boolean {
    const parMois = new Map<string, FicheBoxRaccordement[]>();
    fiches.forEach((f) => {
        if (!parMois.has(f.moisVente)) parMois.set(f.moisVente, []);
        parMois.get(f.moisVente)!.push(f);
    });

    const moisResolus = [...parMois.keys()]
        .filter((mois) => new Date() > dateLimite(parMois.get(mois)![0].moisPaiement))
        .sort()
        .slice(-3);

    if (moisResolus.length < 3) return false;
    return moisResolus.every((mois) => parMois.get(mois)!.every((f) => !estPerdue(f)));
}

async function getDefis1v1(conseillerId: string): Promise<{ gagnes: number; parMois: Record<string, { gagnes: number; total: number }> }> {
    const { data } = await supabase
        .from("challenges")
        .select("*")
        .or(`createur.eq.${conseillerId},adversaire.eq.${conseillerId}`);

    const termines = (data ?? []).filter((r: any) => r.status === "finished" || r.status === "done");
    const defis = termines.filter((r: any) => r.type === "defi" || (r.type !== "challenge" && r.createur !== MANAGER_UUID));

    let gagnes = 0;
    const parMois: Record<string, { gagnes: number; total: number }> = {};

    defis.forEach((r: any) => {
        const sc = r.score_createur ?? 0;
        const sa = r.score_adversaire ?? 0;
        const vainqueurId = r.vainqueur ?? (sc > sa ? r.createur : sa > sc ? r.adversaire : null);
        const gagne = vainqueurId === conseillerId;
        if (gagne) gagnes++;

        const mois = new Date(r.created_at).toISOString().slice(0, 7);
        if (!parMois[mois]) parMois[mois] = { gagnes: 0, total: 0 };
        parMois[mois].total++;
        if (gagne) parMois[mois].gagnes++;
    });

    return { gagnes, parMois };
}

async function getPlanningMap(conseillerId: string, debut: Date, fin: Date): Promise<Record<string, StatutJour>> {
    const { data } = await supabase
        .from("planning_conseillers")
        .select("jour, statut")
        .eq("conseiller_id", conseillerId)
        .gte("jour", jourStr(debut))
        .lte("jour", jourStr(fin));
    const map: Record<string, StatutJour> = {};
    (data ?? []).forEach((r: any) => { map[r.jour] = r.statut as StatutJour; });
    return map;
}

function jourTravailleAvec(planningMap: Record<string, StatutJour>, d: Date): boolean {
    const statut = planningMap[jourStr(d)];
    return statut !== undefined ? STATUTS_VENDEUR.includes(statut) : !estWeekend(d);
}

/** Jours travaillés consécutifs (aujourd'hui inclus si déjà acquis) présents dans `set` — sans gel. */
function calculerStreakDepuisSet(set: Set<string>, planningMap: Record<string, StatutJour>): number {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const cursor = new Date(aujourdhui);
    if (!set.has(jourStr(aujourdhui))) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    for (let i = 0; i < PROFONDEUR_JOURS; i++) {
        if (!jourTravailleAvec(planningMap, cursor)) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
        }
        if (!set.has(jourStr(cursor))) break;
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

async function getVentesParJourParProduit(conseillerId: string, debut: Date): Promise<Record<string, Set<string>>> {
    const rows = await fetchToutesLesLignes((from, to) =>
        supabase
            .from("ventes")
            .select("created_at, produits(code)")
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debut.toISOString())
            .order("created_at", { ascending: true })
            .range(from, to)
    );
    const map: Record<string, Set<string>> = {};
    rows.forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (!code) return;
        if (!map[code]) map[code] = new Set();
        map[code].add(jourStr(new Date(v.created_at)));
    });
    return map;
}

/** Vérifie si TOUS les objectifs du jour (hors Spiderhome) sont atteints maintenant, et
 *  enregistre "jour parfait" pour aujourd'hui si c'est le cas (idempotent, upsert). */
async function verifierJourParfaitAujourdhui(conseillerId: string): Promise<void> {
    const missions = await getMissionsReelles(conseillerId).catch(() => []);
    const commerciales = missions.filter((m: any) => m.produit.toLowerCase() !== "spiderhome");
    const totalObjectif = commerciales.reduce((t: number, m: any) => t + m.objectif, 0);
    if (totalObjectif <= 0) return;
    const parfait = commerciales.every((m: any) => m.objectif === 0 || m.realise >= m.objectif);
    if (!parfait) return;

    await supabase
        .from("conseiller_jours_parfaits")
        .upsert({ conseiller_id: conseillerId, jour: jourStr(new Date()) }, { onConflict: "conseiller_id,jour" });
}

async function getJoursParfaitsTous(conseillerId: string): Promise<Set<string>> {
    const { data } = await supabase.from("conseiller_jours_parfaits").select("jour").eq("conseiller_id", conseillerId);
    return new Set((data ?? []).map((r: any) => r.jour as string));
}

async function getVictoiresEquipe(conseillerId: string): Promise<number> {
    const defis = await getDefisEquipe();
    const termines = defis.filter((d) => d.statut === "termine" && d.membres.some((m) => m.conseillerId === conseillerId));

    let victoires = 0;
    for (const d of termines) {
        const score = await getScoreDefiEquipe(d);
        if (score.score1 === score.score2) continue;
        const monEquipe = d.membres.find((m) => m.conseillerId === conseillerId)?.equipe;
        const gagnante = score.score1 > score.score2 ? 1 : 2;
        if (monEquipe === gagnante) victoires++;
    }
    return victoires;
}

export async function calculerBadgesConseiller(conseillerId: string): Promise<EtatBadges> {
    const { data: badgeRows } = await supabase
        .from("conseiller_badges")
        .select("badge_code, obtenu_le")
        .eq("conseiller_id", conseillerId);

    const debloques: Record<string, string> = {};
    (badgeRows ?? []).forEach((r: any) => { debloques[r.badge_code] = r.obtenu_le; });

    const debutFenetre = new Date();
    debutFenetre.setDate(debutFenetre.getDate() - PROFONDEUR_JOURS);

    await verifierJourParfaitAujourdhui(conseillerId).catch(() => {});

    const [volumeParProduit, fiches, nbForfait4P, defisInfo, equipeGagnes, planningMap, ventesParJourParProduit, joursParfaitsSet] = await Promise.all([
        getVolumeCumulProduit(conseillerId),
        getFichesBoxRaccordement(conseillerId),
        getNbForfait4PDifferesConseiller(conseillerId),
        getDefis1v1(conseillerId),
        getVictoiresEquipe(conseillerId),
        getPlanningMap(conseillerId, debutFenetre, new Date()),
        getVentesParJourParProduit(conseillerId, debutFenetre),
        getJoursParfaitsTous(conseillerId),
    ]);

    const streakParProduit: Record<string, number> = {};
    PRODUITS_STREAK.forEach((code) => {
        streakParProduit[code] = calculerStreakDepuisSet(ventesParJourParProduit[code] ?? new Set(), planningMap);
    });
    const nbJoursParfaits = joursParfaitsSet.size;
    const streakJoursParfaits = calculerStreakDepuisSet(joursParfaitsSet, planningMap);

    const raccordees = fiches.filter((f) => f.raccordee);
    const nb4PCumule = raccordees.filter((f) => f.quatreP).length + nbForfait4P;
    const defisGagnesTotal = defisInfo.gagnes + equipeGagnes;

    const aDebloquer: string[] = [];

    Object.entries(PALIERS_PRODUIT).forEach(([code, seuils]) => {
        const volume = volumeParProduit[code] ?? 0;
        seuils.forEach((seuil, i) => {
            const badgeCode = `produit_${code}_${i}`;
            if (volume >= seuil && !debloques[badgeCode]) aDebloquer.push(badgeCode);
        });
    });

    if (raccordees.length >= 1 && !debloques["box_premier"]) aDebloquer.push("box_premier");
    if (raccordees.length >= 10 && !debloques["box_closer"]) aDebloquer.push("box_closer");
    if (nb4PCumule >= 25 && !debloques["box_roi_4p"]) aDebloquer.push("box_roi_4p");
    if (!debloques["box_sans_faute"] && sansFauteBox(fiches)) aDebloquer.push("box_sans_faute");

    if (defisGagnesTotal >= 1 && !debloques["defi_premier_sang"]) aDebloquer.push("defi_premier_sang");
    if (defisGagnesTotal >= 5 && !debloques["defi_guerrier"]) aDebloquer.push("defi_guerrier");
    if (!debloques["defi_invincible"] && Object.values(defisInfo.parMois).some((m) => m.total >= 3 && m.gagnes === m.total)) {
        aDebloquer.push("defi_invincible");
    }
    if (equipeGagnes >= 3 && !debloques["defi_esprit_equipe"]) aDebloquer.push("defi_esprit_equipe");

    PRODUITS_STREAK.forEach((code) => {
        const badgeCode = `streak_${code}_semaine`;
        if (streakParProduit[code] >= 7 && !debloques[badgeCode]) aDebloquer.push(badgeCode);
    });

    PALIERS_JOURS_PARFAITS.forEach((seuil) => {
        const badgeCode = `jour_parfait_${seuil}`;
        if (nbJoursParfaits >= seuil && !debloques[badgeCode]) aDebloquer.push(badgeCode);
    });

    if (streakJoursParfaits >= 7 && !debloques["semaine_parfaite"]) aDebloquer.push("semaine_parfaite");

    if (aDebloquer.length > 0) {
        const aujourdhui = new Date().toISOString().slice(0, 10);
        await supabase.from("conseiller_badges").insert(
            aDebloquer.map((code) => ({ conseiller_id: conseillerId, badge_code: code, obtenu_le: aujourdhui }))
        );
        aDebloquer.forEach((code) => { debloques[code] = aujourdhui; });
    }

    return {
        debloques,
        volumeParProduit,
        nb4PCumule,
        nbBoxRaccordees: raccordees.length,
        defisGagnes: defisInfo.gagnes,
        equipeGagnes,
        streakParProduit,
        nbJoursParfaits,
        streakJoursParfaits,
    };
}
