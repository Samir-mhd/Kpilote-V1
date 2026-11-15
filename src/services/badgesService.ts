/**
 * Collection de badges hors-série : maîtrise produit (volume cumulé à vie), box & 4P
 * (raccordement), défis & compétition. Les badges sont acquis à vie (table conseiller_badges,
 * partagée avec les badges de série de streakService.ts) — jamais retirés une fois débloqués.
 */
import { supabase } from "@/lib/supabase";
import { getBilanDefisJour } from "@/services/defisJourService";
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

// ─── Défis du jour (Cerebro Check) ──────────────────────────────────────────────

export const PALIERS_DEFIS_JOUR = [1, 5, 15, 30];
export const SERIE_DEFIS_JOUR = 3;

export const DEFI_JOUR_BADGES: Badge[] = [
    { code: "defi_jour_1", label: "Défi relevé", emoji: "🎯", de: "#ddd6fe", a: "#7c3aed", description: "1er défi du jour remporté" },
    { code: "defi_jour_5", label: "Challenger", emoji: "💪", de: "#fbcfe8", a: "#db2777", description: "5 défis du jour remportés" },
    { code: "defi_jour_15", label: "Machine à défis", emoji: "⚡", de: "#fde68a", a: "#d97706", description: "15 défis du jour remportés" },
    { code: "defi_jour_30", label: "Légende du défi", emoji: "🏆", de: "#fef3c7", a: "#b45309", description: "30 défis du jour remportés" },
    { code: "defi_jour_serie", label: "Inarrêtable", emoji: "🔥", de: "#fed7aa", a: "#ea580c", description: `${SERIE_DEFIS_JOUR} défis du jour remportés d'affilée` },
];

// ─── Streak par produit (box / mcafee / assurance) ─────────────────────────────

/** Une "semaine" ici = jours TRAVAILLÉS d'affilée, pas des jours calendaires (5 jours ouvrés). */
export const SEUIL_SEMAINE = 5;

export const PRODUITS_STREAK = ["box", "mcafee", "assurance"] as const;

export const PRODUIT_STREAK_BADGES: Badge[] = PRODUITS_STREAK.map((code) => {
    const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
    return {
        code: `streak_${code}_semaine`,
        label: `Semaine ${produit.label} parfaite`,
        emoji: produit.emoji,
        de: "#bbf7d0",
        a: "#16a34a",
        description: `Au moins 1 vente ${produit.label} chaque jour travaillé pendant ${SEUIL_SEMAINE} jours`,
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
    description: `${seuil} jours avec au moins 80 % des objectifs du jour atteints`,
}));

export const SEMAINE_PARFAITE_BADGE: Badge = {
    code: "semaine_parfaite",
    label: "Semaine parfaite",
    emoji: "💯",
    de: "#ddd6fe",
    a: "#7c3aed",
    description: `${SEUIL_SEMAINE} jours parfaits d'affilée (jours travaillés)`,
};

// ─── Cartes cachées (extensions) ───────────────────────────────────────────────
// Invisibles ("fantômes") tant que la dernière carte de leur groupe n'est pas validée ;
// ne peuvent se débloquer qu'une fois révélées.

export type MesuresBadges = Omit<EtatBadges, "debloques" | "nouveaux">;
export type BadgeExtension = {
    badge: Badge;
    famille: "produit" | "jours" | "semaines" | "box" | "defisjour";
    /** Regroupement d'affichage (produit pour "produit"/"semaines", sinon la famille). */
    groupe: string;
    prerequis: string[];
    seuil: number;
    mesure: (m: MesuresBadges) => number;
};

export const TIERS_EXTENSION: { label: string; facteur: number; de: string; a: string }[] = [
    { label: "Platine", facteur: 1.5, de: "#cffafe", a: "#0891b2" },
    { label: "Diamant", facteur: 2.5, de: "#f5d0fe", a: "#c026d3" },
];

export const BADGES_EXTENSION: BadgeExtension[] = [
    ...Object.entries(PALIERS_PRODUIT).flatMap(([code, seuils]) => {
        const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
        return TIERS_EXTENSION.map((t, i) => {
            const seuil = Math.round(seuils[2] * t.facteur);
            return {
                badge: { code: `produit_${code}_${3 + i}`, label: `${produit.label} ${t.label}`, emoji: produit.emoji, de: t.de, a: t.a, description: `${seuil} ventes à vie` },
                famille: "produit" as const, groupe: code, prerequis: [`produit_${code}_2`], seuil,
                mesure: (m: MesuresBadges) => m.volumeParProduit[code] ?? 0,
            };
        });
    }),
    ...[75, 100].map((seuil) => ({
        badge: { code: `jour_parfait_${seuil}`, label: `${seuil} jours parfaits`, emoji: seuil === 100 ? "💠" : "🎯", de: seuil === 100 ? "#fde68a" : "#fce7f3", a: seuil === 100 ? "#ca8a04" : "#be185d", description: `${seuil} jours avec au moins 80 % des objectifs du jour atteints` },
        famille: "jours" as const, groupe: "jours", prerequis: ["jour_parfait_50"], seuil,
        mesure: (m: MesuresBadges) => m.nbJoursParfaits,
    })),
    ...PRODUITS_STREAK.map((code) => {
        const produit = PRODUITS_ORDRE.find((p) => p.code === code)!;
        return {
            badge: { code: `streak_${code}_mois`, label: `Mois ${produit.label} parfait`, emoji: produit.emoji, de: "#99f6e4", a: "#0f766e", description: `Au moins 1 vente ${produit.label} chaque jour travaillé pendant 20 jours` },
            famille: "semaines" as const, groupe: code, prerequis: [`streak_${code}_semaine`], seuil: 20,
            mesure: (m: MesuresBadges) => m.streakParProduit[code] ?? 0,
        };
    }),
    {
        badge: { code: "box_closer_50", label: "Closer légendaire", emoji: "🏗️", de: "#bfdbfe", a: "#1d4ed8", description: "50 box raccordées cumulées" },
        famille: "box", groupe: "box", prerequis: ["box_premier", "box_closer", "box_sans_faute", "box_roi_4p"], seuil: 50,
        mesure: (m) => m.nbBoxRaccordees,
    },
    {
        badge: { code: "box_empereur_4p", label: "Empereur 4P", emoji: "🏰", de: "#e9d5ff", a: "#6d28d9", description: "60 abonnés 4P cumulés (box + forfait)" },
        famille: "box", groupe: "box", prerequis: ["box_premier", "box_closer", "box_sans_faute", "box_roi_4p"], seuil: 60,
        mesure: (m) => m.nb4PCumule,
    },
    ...[50, 100].map((seuil) => ({
        badge: { code: `defi_jour_${seuil}`, label: seuil === 100 ? "Centurion du défi" : "Maître du défi", emoji: seuil === 100 ? "💎" : "🥇", de: seuil === 100 ? "#f5d0fe" : "#fef08a", a: seuil === 100 ? "#a21caf" : "#ca8a04", description: `${seuil} défis du jour remportés` },
        famille: "defisjour" as const, groupe: "defisjour", prerequis: ["defi_jour_30", "defi_jour_serie"], seuil,
        mesure: (m: MesuresBadges) => m.nbDefisJour,
    })),
    {
        badge: { code: "defi_jour_serie_7", label: "Semaine de feu", emoji: "☄️", de: "#fecaca", a: "#b91c1c", description: "7 défis du jour remportés d'affilée" },
        famille: "defisjour", groupe: "defisjour", prerequis: ["defi_jour_30", "defi_jour_serie"], seuil: 7,
        mesure: (m) => m.serieDefisJour,
    },
];

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
    nbDefisJour: number;
    serieDefisJour: number;
    /** Codes tout juste débloqués PAR CET APPEL (pour déclencher une célébration côté page). */
    nouveaux: string[];
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

/** Part des objectifs du jour à atteindre pour un "jour parfait". */
export const SEUIL_JOUR_PARFAIT = 0.8;

/** Vérifie si au moins 80 % des objectifs du jour (hors Spiderhome) sont atteints maintenant, et
 *  enregistre "jour parfait" pour aujourd'hui si c'est le cas (idempotent, upsert). */
export async function verifierJourParfaitAujourdhui(conseillerId: string): Promise<void> {
    const missions = await getMissionsReelles(conseillerId).catch(() => []);
    const avecObjectif = missions.filter((m: any) => m.produit.toLowerCase() !== "spiderhome" && m.objectif > 0);
    if (avecObjectif.length === 0) return;
    const atteints = avecObjectif.filter((m: any) => m.realise >= m.objectif).length;
    if (atteints / avecObjectif.length < SEUIL_JOUR_PARFAIT) return;

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
    const bilanDefisJour = await getBilanDefisJour(conseillerId).catch(() => ({ total: 0, serie: 0 }));

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
        if (streakParProduit[code] >= SEUIL_SEMAINE && !debloques[badgeCode]) aDebloquer.push(badgeCode);
    });

    PALIERS_JOURS_PARFAITS.forEach((seuil) => {
        const badgeCode = `jour_parfait_${seuil}`;
        if (nbJoursParfaits >= seuil && !debloques[badgeCode]) aDebloquer.push(badgeCode);
    });

    if (streakJoursParfaits >= SEUIL_SEMAINE && !debloques["semaine_parfaite"]) aDebloquer.push("semaine_parfaite");

    PALIERS_DEFIS_JOUR.forEach((seuil) => {
        if (bilanDefisJour.total >= seuil && !debloques[`defi_jour_${seuil}`]) aDebloquer.push(`defi_jour_${seuil}`);
    });
    if (bilanDefisJour.serie >= SERIE_DEFIS_JOUR && !debloques["defi_jour_serie"]) aDebloquer.push("defi_jour_serie");

    const mesures: MesuresBadges = {
        volumeParProduit,
        nb4PCumule,
        nbBoxRaccordees: raccordees.length,
        defisGagnes: defisInfo.gagnes,
        equipeGagnes,
        streakParProduit,
        nbJoursParfaits,
        streakJoursParfaits,
        nbDefisJour: bilanDefisJour.total,
        serieDefisJour: bilanDefisJour.serie,
    };
    // Cartes cachées : seulement une fois leurs prérequis validés (y compris par cet appel).
    const acquis = (code: string) => !!debloques[code] || aDebloquer.includes(code);
    BADGES_EXTENSION.forEach((x) => {
        if (acquis(x.badge.code) || !x.prerequis.every(acquis)) return;
        if (x.mesure(mesures) >= x.seuil) aDebloquer.push(x.badge.code);
    });

    if (aDebloquer.length > 0) {
        const aujourdhui = new Date().toISOString().slice(0, 10);
        await supabase.from("conseiller_badges").insert(
            aDebloquer.map((code) => ({ conseiller_id: conseillerId, badge_code: code, obtenu_le: aujourdhui }))
        );
        aDebloquer.forEach((code) => { debloques[code] = aujourdhui; });
    }

    return { debloques, ...mesures, nouveaux: aDebloquer };
}

// ─── Prochain badge à débloquer (le plus proche, tous types confondus) ────────

export type ProchainBadge = { badge: Badge; restant: number };

/** Parmi tous les badges non encore débloqués à progression numérique claire (hors conditions
 *  binaires comme "sans faute" ou "invincible"), celui qui demande le moins d'efforts restants. */
export function prochainBadgeADebloquer(etat: EtatBadges): ProchainBadge | null {
    const candidats: ProchainBadge[] = [];

    Object.entries(PALIERS_PRODUIT).forEach(([code, seuils]) => {
        const volume = etat.volumeParProduit[code] ?? 0;
        const badges = PRODUIT_BADGES.filter((b) => b.code.startsWith(`produit_${code}_`));
        seuils.forEach((seuil, i) => {
            const badgeCode = `produit_${code}_${i}`;
            if (!etat.debloques[badgeCode] && volume < seuil) {
                candidats.push({ badge: badges[i], restant: seuil - volume });
            }
        });
    });

    if (!etat.debloques["box_premier"]) candidats.push({ badge: BOX_BADGES[0], restant: Math.max(1 - etat.nbBoxRaccordees, 1) });
    if (!etat.debloques["box_closer"] && etat.nbBoxRaccordees < 10) candidats.push({ badge: BOX_BADGES[1], restant: 10 - etat.nbBoxRaccordees });
    if (!etat.debloques["box_roi_4p"] && etat.nb4PCumule < 25) candidats.push({ badge: BOX_BADGES[3], restant: 25 - etat.nb4PCumule });

    const defisGagnesTotal = etat.defisGagnes + etat.equipeGagnes;
    if (!etat.debloques["defi_premier_sang"]) candidats.push({ badge: DEFI_BADGES[0], restant: Math.max(1 - defisGagnesTotal, 1) });
    if (!etat.debloques["defi_guerrier"] && defisGagnesTotal < 5) candidats.push({ badge: DEFI_BADGES[1], restant: 5 - defisGagnesTotal });
    if (!etat.debloques["defi_esprit_equipe"] && etat.equipeGagnes < 3) candidats.push({ badge: DEFI_BADGES[3], restant: 3 - etat.equipeGagnes });

    const prochainPalierDefi = PALIERS_DEFIS_JOUR.findIndex((seuil) => !etat.debloques[`defi_jour_${seuil}`] && etat.nbDefisJour < seuil);
    if (prochainPalierDefi >= 0) candidats.push({ badge: DEFI_JOUR_BADGES[prochainPalierDefi], restant: PALIERS_DEFIS_JOUR[prochainPalierDefi] - etat.nbDefisJour });

    PRODUITS_STREAK.forEach((code, i) => {
        const badgeCode = `streak_${code}_semaine`;
        const streak = etat.streakParProduit[code] ?? 0;
        if (!etat.debloques[badgeCode] && streak < SEUIL_SEMAINE) {
            candidats.push({ badge: PRODUIT_STREAK_BADGES[i], restant: SEUIL_SEMAINE - streak });
        }
    });

    const prochainPalierJour = PALIERS_JOURS_PARFAITS.find((seuil, i) => !etat.debloques[`jour_parfait_${seuil}`] && etat.nbJoursParfaits < seuil);
    if (prochainPalierJour !== undefined) {
        const i = PALIERS_JOURS_PARFAITS.indexOf(prochainPalierJour);
        candidats.push({ badge: JOUR_PARFAIT_BADGES[i], restant: prochainPalierJour - etat.nbJoursParfaits });
    }

    if (!etat.debloques["semaine_parfaite"] && etat.streakJoursParfaits < SEUIL_SEMAINE) {
        candidats.push({ badge: SEMAINE_PARFAITE_BADGE, restant: SEUIL_SEMAINE - etat.streakJoursParfaits });
    }

    if (candidats.length === 0) return null;
    return candidats.reduce((min, c) => (c.restant < min.restant ? c : min));
}
