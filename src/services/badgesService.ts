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

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";

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

export type EtatBadges = {
    debloques: Record<string, string>;
    volumeParProduit: Record<string, number>;
    nb4PCumule: number;
    nbBoxRaccordees: number;
    defisGagnes: number;
    equipeGagnes: number;
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

    const [volumeParProduit, fiches, nbForfait4P, defisInfo, equipeGagnes] = await Promise.all([
        getVolumeCumulProduit(conseillerId),
        getFichesBoxRaccordement(conseillerId),
        getNbForfait4PDifferesConseiller(conseillerId),
        getDefis1v1(conseillerId),
        getVictoiresEquipe(conseillerId),
    ]);

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
    };
}
