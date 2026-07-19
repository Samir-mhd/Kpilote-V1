/**
 * Calcul de la variable conseiller — barème officiel Free Distribution.
 * Le barème (montants € et seuils) change chaque mois : il est éditable côté manager
 * et persisté en base (Supabase) pour rester synchronisé en temps réel avec la vue conseiller.
 */

import { supabase } from "@/lib/supabase";

// ── Actes du conseiller (données de simulation / réelles) ──────────────────
export type VenteConseiller = {
    box_ultra: number;
    box_pop: number;
    box_pop_s_revolution_5g: number;
    forfait_free_serie: number;
    forfait_free_max: number;
    migration_2e_vers_free_serie: number;
    migration_vers_free_max: number;
    smartphones: number;
    assurance_nouveau_mobile: number;
    assurance_essentielle: number;
    mcafee_499: number;
    mcafee_699: number;
    cross_sell_4p: number;
    migration_adsl_fibre: number;
    actes_ast_box: number;
    note_satisfd_ast_individuelle: number; // % (0-100)
    note_satisfd_individuelle: number; // % (0-100)
    note_satisfd_collective: number; // % (0-100)
    note_satisfd_ast_collective: number; // % (0-100)
    lead_box: number;
    lead_forfait: number;
    lead_coms_pro: number;
    canal_option1: number;
    canal_option2: number;
    canal_option3: number;
    taux_presence: number; // entre 0 et 1
};

// ── Contexte boutique (résultats collectifs du mois) ────────────────────────
export type BoostData = {
    ro_box_boutique: number; // ratio R/O box boutique en %
    ro_forfait_boutique: number;
    ro_smartphone_boutique: number;
};

// ── Barème mensuel (montants € et seuils, éditables par le manager) ─────────
export type BaremeVariable = {
    box_ultra: number;
    box_pop: number;
    box_pop_s_revolution_5g: number;
    boost_individuel_box: number;
    boost_collectif_box: number;
    seuil_box: number;

    forfait_free_serie: number;
    forfait_free_max: number;
    migration_2e_vers_free_serie: number;
    migration_vers_free_max: number;
    boost_individuel_forfait: number;
    boost_collectif_forfait: number;
    seuil_forfait: number;

    smartphone: number;
    boost_individuel_smartphone: number;
    boost_collectif_smartphone: number;
    seuil_smartphone: number;

    cross_sell_4p: number;
    migration_adsl_fibre: number;
    actes_ast: number;

    satisfd_individuelle_base: number;
    satisfd_individuelle_par_point: number;
    satisfd_collective: number;
    satisfd_ast_collective: number;

    assurance_nouveau_mobile: number;
    assurance_essentielle: number;
    mcafee_499: number;
    mcafee_699: number;
    canal_option1: number;
    canal_option2: number;
    canal_option3: number;
    lead_box: number;
    lead_forfait: number;
    lead_coms_pro: number;
};

// ── Bonus manuels (constructeur / déstockage) : liste libre nommée par le manager,
// montant unitaire — chaque conseiller déclare son propre volume pour ces boosts ──
export type BonusManuel = {
    id: string;
    label: string;
    montant: number;
};

// bonusId -> volume déclaré par le conseiller
export type BonusVolumes = Record<string, number>;

export type DetailVariable = {
    prime_box: number;
    boost_individuel_box: number;
    boost_collectif_box: number;
    prime_forfait: number;
    boost_individuel_forfait: number;
    boost_collectif_forfait: number;
    prime_migration_forfait: number;
    prime_smartphone: number;
    boost_individuel_smartphone: number;
    boost_collectif_smartphone: number;
    prime_cross_sell: number;
    prime_migration_adsl: number;
    prime_actes_ast: number;
    prime_satisfd_individuelle: number;
    prime_collective: number;
    prime_assurance: number;
    prime_mcafee: number;
    prime_canal: number;
    prime_lead_free_pro: number;
    prime_bonus_manuel: number;
    total: number;
};

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** +montant par unité proratisée au-delà de l'objectif (R/O boutique). */
function boostCollectif(nb: number, roPourcent: number, montant: number): number {
    if (roPourcent <= 0) return 0;
    const depasse = nb - nb / (roPourcent / 100);
    return depasse > 0 ? Math.ceil(depasse) * montant : 0;
}

export function calculerVariableConseiller(
    ventes: VenteConseiller,
    boost: BoostData,
    bareme: BaremeVariable,
    bonusManuels: BonusManuel[] = [],
    bonusVolumes: BonusVolumes = {}
): DetailVariable {
    const presence = ventes.taux_presence;

    // ── Box ──────────────────────────────────────────────────────────────
    const nbBox = ventes.box_ultra + ventes.box_pop + ventes.box_pop_s_revolution_5g;
    const prime_box =
        ventes.box_ultra * bareme.box_ultra +
        ventes.box_pop * bareme.box_pop +
        ventes.box_pop_s_revolution_5g * bareme.box_pop_s_revolution_5g;
    const boost_individuel_box = Math.max(0, nbBox - bareme.seuil_box) * bareme.boost_individuel_box;
    const boost_collectif_box = boostCollectif(nbBox, boost.ro_box_boutique, bareme.boost_collectif_box);

    // ── Forfaits 5G ──────────────────────────────────────────────────────
    const nbForfait = ventes.forfait_free_serie + ventes.forfait_free_max;
    const prime_forfait =
        ventes.forfait_free_serie * bareme.forfait_free_serie +
        ventes.forfait_free_max * bareme.forfait_free_max;
    const boost_individuel_forfait =
        Math.max(0, nbForfait - bareme.seuil_forfait) * bareme.boost_individuel_forfait;
    const boost_collectif_forfait = boostCollectif(nbForfait, boost.ro_forfait_boutique, bareme.boost_collectif_forfait);
    const prime_migration_forfait =
        ventes.migration_2e_vers_free_serie * bareme.migration_2e_vers_free_serie +
        ventes.migration_vers_free_max * bareme.migration_vers_free_max;

    // ── Smartphones (montant unique, plus de distinction prospect/abonné) ──
    const prime_smartphone = ventes.smartphones * bareme.smartphone;
    const boost_individuel_smartphone =
        Math.max(0, ventes.smartphones - bareme.seuil_smartphone) * bareme.boost_individuel_smartphone;
    const boost_collectif_smartphone = boostCollectif(
        ventes.smartphones,
        boost.ro_smartphone_boutique,
        bareme.boost_collectif_smartphone
    );

    // ── Cross-sell / migration ADSL / actes AST ─────────────────────────
    const prime_cross_sell = ventes.cross_sell_4p * bareme.cross_sell_4p;
    const prime_migration_adsl = ventes.migration_adsl_fibre * bareme.migration_adsl_fibre;
    const prime_actes_ast =
        (ventes.note_satisfd_ast_individuelle / 100) * ventes.actes_ast_box * bareme.actes_ast;

    // ── SatisFD vente individuelle ───────────────────────────────────────
    const prime_satisfd_individuelle =
        ventes.note_satisfd_individuelle >= 90
            ? (bareme.satisfd_individuelle_base +
                  bareme.satisfd_individuelle_par_point * (ventes.note_satisfd_individuelle - 90)) *
              presence
            : 0;

    // ── Rémunération collective (au prorata présence) ────────────────────
    let prime_collective = 0;
    if (ventes.note_satisfd_collective >= 85) prime_collective += bareme.satisfd_collective * presence;
    if (ventes.note_satisfd_ast_collective >= 70) prime_collective += bareme.satisfd_ast_collective * presence;

    // ── Assurance / McAfee / Canal+ / Lead Free Pro ──────────────────────
    const prime_assurance =
        ventes.assurance_nouveau_mobile * bareme.assurance_nouveau_mobile +
        ventes.assurance_essentielle * bareme.assurance_essentielle;
    const prime_mcafee = ventes.mcafee_499 * bareme.mcafee_499 + ventes.mcafee_699 * bareme.mcafee_699;
    const prime_canal =
        ventes.canal_option1 * bareme.canal_option1 +
        ventes.canal_option2 * bareme.canal_option2 +
        ventes.canal_option3 * bareme.canal_option3;
    const prime_lead_free_pro =
        ventes.lead_box * bareme.lead_box +
        ventes.lead_forfait * bareme.lead_forfait +
        ventes.lead_coms_pro * bareme.lead_coms_pro;

    // ── Bonus manuels (constructeur / déstockage) : montant unitaire × volume déclaré ──
    const prime_bonus_manuel = bonusManuels.reduce(
        (t, b) => t + b.montant * (bonusVolumes[b.id] ?? 0),
        0
    );

    const total =
        prime_box + boost_individuel_box + boost_collectif_box +
        prime_forfait + boost_individuel_forfait + boost_collectif_forfait + prime_migration_forfait +
        prime_smartphone + boost_individuel_smartphone + boost_collectif_smartphone +
        prime_cross_sell + prime_migration_adsl + prime_actes_ast +
        prime_satisfd_individuelle + prime_collective +
        prime_assurance + prime_mcafee + prime_canal + prime_lead_free_pro +
        prime_bonus_manuel;

    return {
        prime_box: round2(prime_box),
        boost_individuel_box: round2(boost_individuel_box),
        boost_collectif_box: round2(boost_collectif_box),
        prime_forfait: round2(prime_forfait),
        boost_individuel_forfait: round2(boost_individuel_forfait),
        boost_collectif_forfait: round2(boost_collectif_forfait),
        prime_migration_forfait: round2(prime_migration_forfait),
        prime_smartphone: round2(prime_smartphone),
        boost_individuel_smartphone: round2(boost_individuel_smartphone),
        boost_collectif_smartphone: round2(boost_collectif_smartphone),
        prime_cross_sell: round2(prime_cross_sell),
        prime_migration_adsl: round2(prime_migration_adsl),
        prime_actes_ast: round2(prime_actes_ast),
        prime_satisfd_individuelle: round2(prime_satisfd_individuelle),
        prime_collective: round2(prime_collective),
        prime_assurance: round2(prime_assurance),
        prime_mcafee: round2(prime_mcafee),
        prime_canal: round2(prime_canal),
        prime_lead_free_pro: round2(prime_lead_free_pro),
        prime_bonus_manuel: round2(prime_bonus_manuel),
        total: round2(total),
    };
}

// ── Valeurs par défaut ───────────────────────────────────────────────────

export const BAREME_DEFAUT: BaremeVariable = {
    box_ultra: 9,
    box_pop: 7,
    box_pop_s_revolution_5g: 1,
    boost_individuel_box: 4,
    boost_collectif_box: 6.5,
    seuil_box: 0,

    forfait_free_serie: 1,
    forfait_free_max: 2,
    migration_2e_vers_free_serie: 1,
    migration_vers_free_max: 2,
    boost_individuel_forfait: 1,
    boost_collectif_forfait: 2,
    seuil_forfait: 0,

    smartphone: 2.5,
    boost_individuel_smartphone: 1,
    boost_collectif_smartphone: 3,
    seuil_smartphone: 0,

    cross_sell_4p: 3,
    migration_adsl_fibre: 2,
    actes_ast: 1,

    satisfd_individuelle_base: 25,
    satisfd_individuelle_par_point: 2,
    satisfd_collective: 20,
    satisfd_ast_collective: 20,

    assurance_nouveau_mobile: 3,
    assurance_essentielle: 2,
    mcafee_499: 1.5,
    mcafee_699: 2,
    canal_option1: 2,
    canal_option2: 4,
    canal_option3: 8,
    lead_box: 10,
    lead_forfait: 5,
    lead_coms_pro: 10,
};

export const VENTES_VIDES: VenteConseiller = {
    box_ultra: 0,
    box_pop: 0,
    box_pop_s_revolution_5g: 0,
    forfait_free_serie: 0,
    forfait_free_max: 0,
    migration_2e_vers_free_serie: 0,
    migration_vers_free_max: 0,
    smartphones: 0,
    assurance_nouveau_mobile: 0,
    assurance_essentielle: 0,
    mcafee_499: 0,
    mcafee_699: 0,
    cross_sell_4p: 0,
    migration_adsl_fibre: 0,
    actes_ast_box: 0,
    note_satisfd_ast_individuelle: 0,
    note_satisfd_individuelle: 0,
    note_satisfd_collective: 0,
    note_satisfd_ast_collective: 0,
    lead_box: 0,
    lead_forfait: 0,
    lead_coms_pro: 0,
    canal_option1: 0,
    canal_option2: 0,
    canal_option3: 0,
    taux_presence: 1,
};

export const BOOST_VIDE: BoostData = {
    ro_box_boutique: 100,
    ro_forfait_boutique: 100,
    ro_smartphone_boutique: 100,
};

// ── Persistance Supabase — barème & bonus manuels (partagés manager ↔ conseillers) ──

export async function getBareme(): Promise<BaremeVariable> {
    const { data } = await supabase.from("variable_bareme").select("data").eq("id", "default").maybeSingle();
    return data ? { ...BAREME_DEFAUT, ...(data.data as Partial<BaremeVariable>) } : BAREME_DEFAUT;
}

export async function sauvegarderBareme(bareme: BaremeVariable): Promise<void> {
    await supabase.from("variable_bareme").upsert({ id: "default", data: bareme, updated_at: new Date().toISOString() });
}

export async function getBonusManuels(): Promise<BonusManuel[]> {
    const { data } = await supabase
        .from("variable_bonus_manuels")
        .select("id, label, montant")
        .order("created_at", { ascending: true });
    return data ?? [];
}

export async function ajouterBonusManuel(label: string, montant: number): Promise<void> {
    await supabase.from("variable_bonus_manuels").insert({ label, montant });
}

export async function supprimerBonusManuel(id: string): Promise<void> {
    await supabase.from("variable_bonus_manuels").delete().eq("id", id);
}

// ── Persistance Supabase — volumes saisis par un conseiller, par mois ───────

export function moisCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export type VentesConseillerMois = {
    ventes: VenteConseiller;
    boost: BoostData;
    tauxPresencePct: number;
    bonusVolumes: BonusVolumes;
};

export async function getVentesConseillerMois(conseillerId: string, mois: string): Promise<VentesConseillerMois> {
    const { data } = await supabase
        .from("variable_ventes_conseiller")
        .select("ventes, boost, taux_presence_pct, bonus_volumes")
        .eq("conseiller_id", conseillerId)
        .eq("mois", mois)
        .maybeSingle();

    if (!data) return { ventes: VENTES_VIDES, boost: BOOST_VIDE, tauxPresencePct: 100, bonusVolumes: {} };

    return {
        ventes: { ...VENTES_VIDES, ...(data.ventes as Partial<VenteConseiller>) },
        boost: { ...BOOST_VIDE, ...(data.boost as Partial<BoostData>) },
        tauxPresencePct: data.taux_presence_pct ?? 100,
        bonusVolumes: (data.bonus_volumes as BonusVolumes) ?? {},
    };
}

export async function sauvegarderVentesConseillerMois(
    conseillerId: string,
    mois: string,
    payload: VentesConseillerMois
): Promise<void> {
    await supabase.from("variable_ventes_conseiller").upsert(
        {
            conseiller_id: conseillerId,
            mois,
            ventes: payload.ventes,
            boost: payload.boost,
            taux_presence_pct: payload.tauxPresencePct,
            bonus_volumes: payload.bonusVolumes,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "conseiller_id,mois" }
    );
}

// ── Journal du jour (cagnotte accueil) ──────────────────────────────────────
// Chaque clic "acte rapide" pousse une ligne ici (pour l'affichage du jour) ET
// incrémente le volume correspondant dans variable_ventes_conseiller du mois
// (pour que le simulateur /dashboard/variable reste juste, sans double saisie).

// Champs payés à M+2 : jamais synchronisés avec le simulateur mensuel (déclaration manuelle uniquement).
const CHAMPS_NON_SYNCHRONISES = new Set<string>([
    "box_ultra", "box_pop", "box_pop_s_revolution_5g",
    "mcafee_499", "mcafee_699",
]);

export type ActeJour = {
    id: string;
    label: string;
    montant: number;
    created_at: string;
    quantite: number;
    champ?: keyof VenteConseiller;
    bonusManuelId?: string;
    produitCode?: string;
};

export function jourCourant(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapActe(r: any): ActeJour {
    return {
        id: r.id,
        label: r.label,
        montant: r.montant,
        created_at: r.created_at,
        quantite: r.quantite ?? 1,
        champ: r.champ ?? undefined,
        bonusManuelId: r.bonus_manuel_id ?? undefined,
        produitCode: r.produit_code ?? undefined,
    };
}

const SELECT_ACTE = "id, label, montant, created_at, quantite, champ, bonus_manuel_id, produit_code";

export async function getCagnotteJour(conseillerId: string, jour: string): Promise<ActeJour[]> {
    const { data } = await supabase
        .from("variable_actes_jour")
        .select(SELECT_ACTE)
        .eq("conseiller_id", conseillerId)
        .eq("jour", jour)
        .order("created_at", { ascending: true });
    return (data ?? []).map(mapActe);
}

/**
 * Enregistre un acte rapide (clic accueil) : journal du jour + incrément du volume mensuel.
 * `champ` = clé VenteConseiller identifiant le sous-type (ex: "box_ultra") ; n'incrémente le
 * cumul mensuel que si ce champ n'est pas payé à M+2 (voir CHAMPS_NON_SYNCHRONISES).
 * `bonusManuelId` incrémente le volume d'un boost constructeur/déstockage.
 * `produitCode` rattache l'acte à une carte accueil (pour la correction du jour sur /dashboard/stats).
 */
export async function enregistrerActeJour(
    conseillerId: string,
    label: string,
    montant: number,
    champ?: keyof VenteConseiller,
    bonusManuelId?: string,
    produitCode?: string
): Promise<ActeJour> {
    const jour = jourCourant();
    const { data, error } = await supabase
        .from("variable_actes_jour")
        .insert({
            conseiller_id: conseillerId, jour, label, montant, quantite: 1,
            champ: champ ?? null, bonus_manuel_id: bonusManuelId ?? null, produit_code: produitCode ?? null,
        })
        .select(SELECT_ACTE)
        .single();
    if (error) throw new Error(error.message ?? "Erreur enregistrement acte");

    if ((champ && !CHAMPS_NON_SYNCHRONISES.has(champ)) || bonusManuelId) {
        const mois = moisCourant();
        const actuel = await getVentesConseillerMois(conseillerId, mois);
        if (champ && !CHAMPS_NON_SYNCHRONISES.has(champ)) {
            actuel.ventes = { ...actuel.ventes, [champ]: (actuel.ventes[champ] as number) + 1 };
        }
        if (bonusManuelId) {
            actuel.bonusVolumes = {
                ...actuel.bonusVolumes,
                [bonusManuelId]: (actuel.bonusVolumes[bonusManuelId] ?? 0) + 1,
            };
        }
        await sauvegarderVentesConseillerMois(conseillerId, mois, actuel);
    }

    return mapActe(data);
}

/** Supprime un acte du jour et annule son impact sur le cumul mensuel (inverse d'enregistrerActeJour, pour 1 unité). */
export async function annulerActeJour(conseillerId: string, acte: ActeJour): Promise<void> {
    await supabase.from("variable_actes_jour").delete().eq("id", acte.id);

    if ((acte.champ && !CHAMPS_NON_SYNCHRONISES.has(acte.champ)) || acte.bonusManuelId) {
        const mois = moisCourant();
        const actuel = await getVentesConseillerMois(conseillerId, mois);
        if (acte.champ && !CHAMPS_NON_SYNCHRONISES.has(acte.champ)) {
            const champ = acte.champ;
            actuel.ventes = { ...actuel.ventes, [champ]: Math.max(0, (actuel.ventes[champ] as number) - 1) };
        }
        if (acte.bonusManuelId) {
            const id = acte.bonusManuelId;
            actuel.bonusVolumes = {
                ...actuel.bonusVolumes,
                [id]: Math.max(0, (actuel.bonusVolumes[id] ?? 0) - 1),
            };
        }
        await sauvegarderVentesConseillerMois(conseillerId, mois, actuel);
    }
}

/**
 * Annule le dernier acte du jour pour ce produit, si posé à moins de 15s de la vente qu'on annule
 * (les deux sont créés dans le même geste "J'ai vendu → sous-choix"). Ne fait rien sinon.
 */
export async function annulerDernierActeLie(
    conseillerId: string,
    produitCode: string,
    venteCreatedAtIso: string
): Promise<void> {
    const actes = await getCagnotteJour(conseillerId, jourCourant());
    const liesAuProduit = actes.filter((a) => a.produitCode === produitCode);
    if (liesAuProduit.length === 0) return;

    const dernier = liesAuProduit[liesAuProduit.length - 1];
    const diff = Math.abs(new Date(dernier.created_at).getTime() - new Date(venteCreatedAtIso).getTime());
    if (diff > 15000) return;

    await annulerActeJour(conseillerId, dernier);
}

/** Compte, pour aujourd'hui, le volume déjà déclaré par sous-type (pour préremplir un formulaire de correction). */
export async function compterActesJourParChamp(
    conseillerId: string,
    champs: (keyof VenteConseiller)[]
): Promise<Record<string, number>> {
    const { data } = await supabase
        .from("variable_actes_jour")
        .select("champ, quantite")
        .eq("conseiller_id", conseillerId)
        .eq("jour", jourCourant())
        .in("champ", champs as string[]);

    const out: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { out[r.champ] = (out[r.champ] ?? 0) + (r.quantite ?? 1); });
    return out;
}

export type CorrectionChamp = {
    champ: keyof VenteConseiller;
    label: string;
    montantUnitaire: number;
    ancienneValeur: number;
    nouvelleValeur: number;
};

/**
 * Corrige le total du jour d'une carte produit (Box, Forfaits...) : remplace les actes du jour
 * pour ce produit par un acte consolidé par sous-type (aucune ligne historique supprimée par
 * ailleurs — heatmap et feedbar restent intacts), et ajuste le cumul mensuel des champs synchronisés.
 * Retourne le delta total (nouveau - ancien) pour la ligne de compensation côté ventes.
 */
export async function corrigerProduitJour(
    conseillerId: string,
    produitCode: string,
    corrections: CorrectionChamp[]
): Promise<{ deltaTotal: number }> {
    const jour = jourCourant();

    await supabase
        .from("variable_actes_jour")
        .delete()
        .eq("conseiller_id", conseillerId)
        .eq("jour", jour)
        .eq("produit_code", produitCode);

    const lignes = corrections
        .filter((c) => c.nouvelleValeur > 0)
        .map((c) => ({
            conseiller_id: conseillerId,
            jour,
            label: c.label,
            montant: c.montantUnitaire * c.nouvelleValeur,
            quantite: c.nouvelleValeur,
            champ: c.champ,
            produit_code: produitCode,
        }));
    if (lignes.length > 0) {
        await supabase.from("variable_actes_jour").insert(lignes);
    }

    const champsAAjuster = corrections.filter(
        (c) => !CHAMPS_NON_SYNCHRONISES.has(c.champ) && c.nouvelleValeur !== c.ancienneValeur
    );
    if (champsAAjuster.length > 0) {
        const mois = moisCourant();
        const actuel = await getVentesConseillerMois(conseillerId, mois);
        const ventes = { ...actuel.ventes };
        champsAAjuster.forEach((c) => {
            ventes[c.champ] = Math.max(0, ventes[c.champ] + (c.nouvelleValeur - c.ancienneValeur));
        });
        await sauvegarderVentesConseillerMois(conseillerId, mois, { ...actuel, ventes });
    }

    const deltaTotal = corrections.reduce((t, c) => t + (c.nouvelleValeur - c.ancienneValeur), 0);
    return { deltaTotal };
}
