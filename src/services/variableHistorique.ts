/**
 * Historique mensuel de la variable : au 1er accès sur l'onglet "Historique" après le passage
 * au mois suivant, le mois qui vient de se terminer (M-1) est figé une bonne fois pour toutes
 * (détail complet + total réel payé, box raccordées et 4P différé du mois inclus) et devient
 * téléchargeable. Le barème utilisé est celui réellement en vigueur fin de ce mois-là
 * (getBaremeAuMois, voir variable_bareme_historique) ; les bonus manuels (constructeur/
 * déstockage), eux, restent ceux actuellement en base — un bonus supprimé depuis ne remonte
 * plus dans un mois archivé après coup.
 */
import { supabase } from "@/lib/supabase";
import {
    BaremeVariable,
    DetailVariable,
    VenteConseiller,
    calculerVariableConseiller,
    getBaremeAuMois,
    getBonusManuels,
    getVentesConseillerMois,
} from "./variableConseiller";
import { getContributionBoxMoisPaiement } from "./boxRaccordement";
import { getContributionForfait4PMoisPaiement } from "./forfait4P";

export type LigneExtra = { label: string; montant: number };
export type LigneActe = { label: string; quantite: number; prixUnitaire: number; montant: number };

export type HistoriqueMois = {
    id: string;
    conseillerId: string;
    mois: string; // "YYYY-MM-01"
    detail: DetailVariable;
    extra: LigneExtra[];
    lignesActes: LigneActe[];
    total: number;
    createdAt: string;
};

function mapHistorique(r: any): HistoriqueMois {
    return {
        id: r.id,
        conseillerId: r.conseiller_id,
        mois: r.mois,
        detail: r.detail as DetailVariable,
        extra: (r.extra as LigneExtra[]) ?? [],
        lignesActes: (r.lignes_actes as LigneActe[]) ?? [],
        total: r.total,
        createdAt: r.created_at,
    };
}

// Actes à volume simple (quantité × prix unitaire du barème) — exclut les primes à formule
// (boosts, SatisFD, actes AST) qui restent affichées en agrégat via `extra`/`detail`.
const CHAMPS_ACTES: { venteKey: keyof VenteConseiller; baremeKey: keyof BaremeVariable; label: string }[] = [
    { venteKey: "box_ultra", baremeKey: "box_ultra", label: "Box Ultra / Ultra Essentiel" },
    { venteKey: "box_pop", baremeKey: "box_pop", label: "Box POP" },
    { venteKey: "box_pop_s_revolution_5g", baremeKey: "box_pop_s_revolution_5g", label: "Box POP S / Révolution / 5G" },
    { venteKey: "forfait_free_serie", baremeKey: "forfait_free_serie", label: "Forfait Free / Série Free" },
    { venteKey: "forfait_free_max", baremeKey: "forfait_free_max", label: "Forfait Free Max" },
    { venteKey: "migration_2e_vers_free_serie", baremeKey: "migration_2e_vers_free_serie", label: "Migration 2€ → Free/Série Free" },
    { venteKey: "migration_vers_free_max", baremeKey: "migration_vers_free_max", label: "Migration → Free Max" },
    { venteKey: "smartphones", baremeKey: "smartphone", label: "Smartphones vendus" },
    { venteKey: "cross_sell_4p", baremeKey: "cross_sell_4p", label: "Cross-sell 4P" },
    { venteKey: "migration_adsl_fibre", baremeKey: "migration_adsl_fibre", label: "Migration ADSL → Fibre" },
    { venteKey: "assurance_nouveau_mobile", baremeKey: "assurance_nouveau_mobile", label: "Assurance Nouveau Mobile" },
    { venteKey: "assurance_essentielle", baremeKey: "assurance_essentielle", label: "Assurance Essentielle" },
    { venteKey: "mcafee_499", baremeKey: "mcafee_499", label: "McAfee 4,99€" },
    { venteKey: "mcafee_699", baremeKey: "mcafee_699", label: "McAfee 6,99€" },
    { venteKey: "canal_option1", baremeKey: "canal_option1", label: "Canal+ Option 1" },
    { venteKey: "canal_option2", baremeKey: "canal_option2", label: "Canal+ Option 2" },
    { venteKey: "canal_option3", baremeKey: "canal_option3", label: "Canal+ Option 3" },
    { venteKey: "lead_box", baremeKey: "lead_box", label: "Lead Free Pro — box" },
    { venteKey: "lead_forfait", baremeKey: "lead_forfait", label: "Lead Free Pro — forfait" },
    { venteKey: "lead_coms_pro", baremeKey: "lead_coms_pro", label: "Lead Free Pro — Coms' Pro" },
];

function moisCourantLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Mois précédent au format "YYYY-MM-01". */
export function moisPrecedent(mois: string = moisCourantLocal()): string {
    const [y, m] = mois.split("-").map(Number);
    const d = new Date(y, m - 1 - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function getHistoriqueConseiller(conseillerId: string): Promise<HistoriqueMois[]> {
    const { data } = await supabase
        .from("variable_historique_mensuelle")
        .select("id, conseiller_id, mois, detail, extra, lignes_actes, total, created_at")
        .eq("conseiller_id", conseillerId)
        .order("mois", { ascending: false });
    return (data ?? []).map(mapHistorique);
}

/**
 * Calcule et fige l'historique d'un mois donné (déjà terminé) pour ce conseiller, s'il n'existe
 * pas encore. N'écrase jamais un mois déjà figé (upsert ignore-duplicate via un select préalable).
 */
export async function genererHistoriqueMoisSiManquant(conseillerId: string, mois: string): Promise<void> {
    if (mois >= moisCourantLocal()) return; // jamais le mois en cours : encore en train de se remplir

    const { data: existant } = await supabase
        .from("variable_historique_mensuelle")
        .select("id")
        .eq("conseiller_id", conseillerId)
        .eq("mois", mois)
        .maybeSingle();
    if (existant) return;

    const [bareme, bonusManuels, ventesMois, contributionBox, contributionForfait4P] = await Promise.all([
        getBaremeAuMois(mois),
        getBonusManuels(),
        getVentesConseillerMois(conseillerId, mois),
        getContributionBoxMoisPaiement(conseillerId, mois),
        getContributionForfait4PMoisPaiement(conseillerId, mois),
    ]);

    const ventesAvecPresence = {
        ...ventesMois.ventes,
        taux_presence: Math.max(0, Math.min(100, ventesMois.tauxPresencePct)) / 100,
    };
    const detail = calculerVariableConseiller(ventesAvecPresence, ventesMois.boost, bareme, bonusManuels, ventesMois.bonusVolumes);

    const lignesActes: LigneActe[] = [];
    CHAMPS_ACTES.forEach(({ venteKey, baremeKey, label }) => {
        const quantite = ventesMois.ventes[venteKey] as number;
        if (quantite > 0) {
            const prixUnitaire = bareme[baremeKey] as number;
            lignesActes.push({ label, quantite, prixUnitaire, montant: Math.round(quantite * prixUnitaire * 100) / 100 });
        }
    });
    bonusManuels.forEach((b) => {
        const quantite = ventesMois.bonusVolumes[b.id] ?? 0;
        if (quantite > 0) {
            lignesActes.push({ label: b.label, quantite, prixUnitaire: b.montant, montant: Math.round(quantite * b.montant * 100) / 100 });
        }
    });

    const boxHors4P = contributionBox.total - contributionBox.prime4P;
    const montant4PTotal = contributionBox.prime4P + contributionForfait4P.montantTotal;
    const extra: LigneExtra[] = [
        { label: "Box raccordées (figé)", montant: Math.round(boxHors4P * 100) / 100 },
        { label: "Cross-sell 4P (box + forfait)", montant: Math.round(montant4PTotal * 100) / 100 },
    ].filter((l) => l.montant > 0);

    const total = Math.round((detail.total + boxHors4P + montant4PTotal) * 100) / 100;

    await supabase.from("variable_historique_mensuelle").insert({
        conseiller_id: conseillerId,
        mois,
        detail,
        extra,
        lignes_actes: lignesActes,
        total,
    });
}
