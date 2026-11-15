/**
 * Cockpit manager (Dashboard v2) : avancée équipe jour / semaine / mois avec EXACTEMENT les
 * objectifs des conseillers (modèle planning : semaine figée, jour = reste de la semaine ÷ jours
 * planifiés restants, 0 si pas planifié aujourd'hui) — sommés sur l'équipe. Plus l'état de
 * chaque conseiller aujourd'hui (planning, actes, dernière vente, défi du jour).
 */
import { supabase } from "@/lib/supabase";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { getJoursTravailPlageTous, StatutJour, jourStr } from "@/services/planningService";
import { getRealiseVentesComboParConseiller, getObjectifsComboParConseiller, RealiseVentesCombo } from "@/services/variableConseiller";
import { PRODUITS_CLASSEMENT, PRODUITS_HORS_TOTAL_CLASSEMENT, COMBOS_DANS_TOTAL, ProduitCode } from "@/utils/produits";
import { periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import { COMBO_META, ComboCode } from "@/utils/classementGroupes";
import { getCoeffRecapCommercial } from "@/services/recapCommercialConfig";
import { getObjectifsEquipeMois } from "@/services/objectifsEquipe";

const CODES_COMBO = Object.keys(COMBO_META) as ComboCode[];
const COMBO_VIDE: RealiseVentesCombo = { mcafee_mobile: 0, assurance_essentielle: 0, canal_plus: 0 };

export type RO = { realise: number; objectif: number };
export type LigneProduit = { code: string; label: string; emoji: string; actes: boolean; jour: RO; semaine: RO; mois: RO };
export type DefiResume = { libelle: string; statut: "propose" | "accepte" | "refuse" | "reussi" };
export type EtatConseiller = {
    id: string;
    nom: string;
    statut: StatutJour | null;
    planifie: boolean;
    actesJour: RO;
    actesMois: RO;
    derniereVente: string | null;
    defi: DefiResume | null;
};
export type Cockpit = {
    produits: LigneProduit[];
    actes: { jour: RO; semaine: RO; mois: RO; projectionMois: number | null };
    conseillers: EtatConseiller[];
};

/** Un code produit compte-t-il dans les actes (même périmètre que le classement) ? */
function estActe(code: string): boolean {
    if ((CODES_COMBO as string[]).includes(code)) return (COMBOS_DANS_TOTAL as readonly string[]).includes(code);
    return !PRODUITS_HORS_TOTAL_CLASSEMENT.includes(code as ProduitCode);
}

export async function chargerCockpit(): Promise<Cockpit> {
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    const finMois = new Date(auj.getFullYear(), auj.getMonth() + 1, 0);
    const debutMois = new Date(auj.getFullYear(), auj.getMonth(), 1);
    const hier = new Date(auj); hier.setDate(hier.getDate() - 1);
    const { debut: semDebut, fin: semFin } = periodeSemaineEffective();
    const pJ = joursPeriode("jour"), pS = joursPeriode("semaine"), pM = joursPeriode("mois");

    const [jour, semaine, mois, cJ, cS, cM, cObj] = await Promise.all([
        construireClassementPeriode("jour"),
        construireClassementPeriode("semaine"),
        construireClassementPeriode("mois"),
        getRealiseVentesComboParConseiller(pJ.debut, pJ.fin).catch(() => ({} as Record<string, RealiseVentesCombo>)),
        getRealiseVentesComboParConseiller(pS.debut, pS.fin).catch(() => ({} as Record<string, RealiseVentesCombo>)),
        getRealiseVentesComboParConseiller(pM.debut, pM.fin).catch(() => ({} as Record<string, RealiseVentesCombo>)),
        getObjectifsComboParConseiller().catch(() => ({} as Record<string, RealiseVentesCombo>)),
    ]);
    const ids = mois.map((c) => c.id);
    const parId = (l: ConseillerStats[]) => new Map(l.map((c) => [c.id, c]));
    const mJ = parId(jour), mS = parId(semaine);

    const debutSemDansMois = semDebut > debutMois ? semDebut : debutMois;
    const [figes, restantsSemaine, planifAuj, ecoules, restantsMois, planning, ventesAuj, defis, coeffRecap, joursMoisTotal, joursSemaineTotal, objBoutique, joursLundiFinMois] = await Promise.all([
        getObjectifsSemaineFiges(ids, semDebut, semFin).catch(() => ({} as Record<string, Record<string, number>>)),
        getJoursTravailPlageTous(ids, auj, semFin).catch(() => ({} as Record<string, number>)),
        getJoursTravailPlageTous(ids, auj, auj).catch(() => ({} as Record<string, number>)),
        hier >= debutMois ? getJoursTravailPlageTous(ids, debutMois, hier).catch(() => ({} as Record<string, number>)) : Promise.resolve({} as Record<string, number>),
        getJoursTravailPlageTous(ids, auj, finMois).catch(() => ({} as Record<string, number>)),
        supabase.from("planning_conseillers").select("conseiller_id, statut").eq("jour", jourStr(auj)).in("conseiller_id", ids),
        supabase.from("ventes").select("conseiller_id, created_at, source").gte("created_at", auj.toISOString()).order("created_at", { ascending: false }),
        supabase.from("defis_jour").select("conseiller_id, libelle, statut").eq("jour", jourStr(auj)),
        getCoeffRecapCommercial().catch(() => 0),
        getJoursTravailPlageTous(ids, debutMois, finMois).catch(() => ({} as Record<string, number>)),
        getJoursTravailPlageTous(ids, semDebut, semFin).catch(() => ({} as Record<string, number>)),
        getObjectifsEquipeMois().catch(() => ({} as Record<string, number>)),
        getJoursTravailPlageTous(ids, debutSemDansMois, finMois).catch(() => ({} as Record<string, number>)),
    ]);
    const tot = (r: Record<string, number>) => ids.reduce((t, id) => t + (r[id] ?? 0), 0);
    // Jours-conseiller planifiés (somme sur l'équipe) : base de la déclinaison semaine / jour.
    const jcLundiFinMois = tot(joursLundiFinMois), jcSemaine = tot(joursSemaineTotal);
    const jcRestantsSemaine = tot(restantsSemaine), jcAujourdhui = tot(planifAuj);

    // Réalisé / objectif d'un conseiller sur un code, pour chaque période.
    function realise(cid: string, code: string, periode: "jour" | "semaine" | "mois"): number {
        if ((CODES_COMBO as string[]).includes(code)) {
            const src = periode === "jour" ? cJ : periode === "semaine" ? cS : cM;
            return (src[cid] ?? COMBO_VIDE)[code as ComboCode] ?? 0;
        }
        const src = periode === "jour" ? mJ.get(cid) : periode === "semaine" ? mS.get(cid) : mois.find((c) => c.id === cid);
        return src?.produits[code as ProduitCode] ?? 0;
    }
    function objectif(cid: string, code: string, periode: "jour" | "semaine" | "mois"): number {
        // Récap Co : objectif automatique = coeff × jours planifiés de la période (comme au classement).
        if (code === "recap_commercial" && !((mois.find((c) => c.id === cid)?.objectifs.recap_commercial ?? 0) > 0)) {
            const jours = periode === "mois" ? joursMoisTotal[cid] : periode === "semaine" ? joursSemaineTotal[cid] : planifAuj[cid];
            return Math.round(coeffRecap * (jours ?? 0));
        }
        const estCombo = (CODES_COMBO as string[]).includes(code);
        if (periode === "mois") {
            return estCombo ? (cObj[cid] ?? COMBO_VIDE)[code as ComboCode] ?? 0 : mois.find((c) => c.id === cid)?.objectifs[code as ProduitCode] ?? 0;
        }
        const semaineFigee = (figes[cid] as Record<string, number> | undefined)?.[code] ?? 0;
        if (periode === "semaine") return semaineFigee;
        if ((planifAuj[cid] ?? 0) === 0) return 0;
        const avantAuj = Math.max(realise(cid, code, "semaine") - realise(cid, code, "jour"), 0);
        const reste = Math.max(semaineFigee - avantAuj, 0);
        const jr = restantsSemaine[cid] ?? 0;
        return jr > 0 ? Math.ceil(reste / jr) : reste;
    }

    const codes = [
        ...PRODUITS_CLASSEMENT.map((p) => ({ code: p.code as string, label: p.label, emoji: p.emoji })),
        ...CODES_COMBO.map((c) => ({ code: c as string, label: COMBO_META[c].label, emoji: COMBO_META[c].emoji })),
    ];
    const periodes = ["jour", "semaine", "mois"] as const;
    const realiseEquipe = (code: string, per: "jour" | "semaine" | "mois") => ids.reduce((t, id) => t + realise(id, code, per), 0);

    // Objectifs ÉQUIPE : objectif boutique du mois (fixé par le manager via la matrice, pas la
    // somme des objectifs individuels, volontairement surévaluée), décliné comme pour un conseiller
    // mais en jours-conseiller planifiés :
    // - semaine = (objectif mois − réalisé avant lundi) ÷ jours-conseiller lundi→fin du mois × jours-conseiller de la semaine
    // - jour    = (objectif semaine − réalisé de la semaine avant aujourd'hui) ÷ jours-conseiller restants de la semaine × jours-conseiller aujourd'hui
    function objectifEquipe(code: string, per: "jour" | "semaine" | "mois"): number {
        const objMois = objBoutique[code] ?? 0;
        if (per === "mois") return objMois;
        const avantLundi = Math.max(realiseEquipe(code, "mois") - realiseEquipe(code, "semaine"), 0);
        const semaine = jcLundiFinMois > 0 ? Math.ceil(Math.max(objMois - avantLundi, 0) / jcLundiFinMois * jcSemaine) : 0;
        if (per === "semaine") return semaine;
        if (jcAujourdhui === 0) return 0;
        const avantAuj = Math.max(realiseEquipe(code, "semaine") - realiseEquipe(code, "jour"), 0);
        return jcRestantsSemaine > 0 ? Math.ceil(Math.max(semaine - avantAuj, 0) / jcRestantsSemaine * jcAujourdhui) : 0;
    }

    const produits: LigneProduit[] = codes.map((p) => {
        const ligne = { ...p, actes: estActe(p.code) } as LigneProduit;
        periodes.forEach((per) => { ligne[per] = { realise: realiseEquipe(p.code, per), objectif: objectifEquipe(p.code, per) }; });
        return ligne;
    }).filter((l) => l.mois.objectif > 0 || l.mois.realise > 0); // produit sans objectif ni vente : masqué

    const actesDe = (cid: string, per: "jour" | "semaine" | "mois") => codes.filter((p) => estActe(p.code))
        .reduce((t, p) => ({ realise: t.realise + realise(cid, p.code, per), objectif: t.objectif + objectif(cid, p.code, per) }), { realise: 0, objectif: 0 });
    const somme = (per: "jour" | "semaine" | "mois") => produits.filter((p) => p.actes)
        .reduce((t, p) => ({ realise: t.realise + p[per].realise, objectif: t.objectif + p[per].objectif }), { realise: 0, objectif: 0 });

    // Projection fin de mois, par conseiller : rythme = actes avant aujourd'hui ÷ jours planifiés
    // écoulés ; on ajoute ce rythme pour chaque jour planifié restant (aujourd'hui compte au moins
    // pour le rythme, ou pour ce qui est déjà fait s'il est dépassé). Null le 1er du mois.
    let projection: number | null = null;
    if (hier >= debutMois) {
        projection = ids.reduce((t, id) => {
            const e = ecoules[id] ?? 0;
            const fait = actesDe(id, "mois").realise;
            const faitAuj = actesDe(id, "jour").realise;
            if (e === 0) return t + fait;
            const rythme = (fait - faitAuj) / e;
            const restantsApres = Math.max((restantsMois[id] ?? 0) - ((planifAuj[id] ?? 0) > 0 ? 1 : 0), 0);
            const auj = (planifAuj[id] ?? 0) > 0 ? Math.max(rythme, faitAuj) : faitAuj;
            return t + (fait - faitAuj) + auj + rythme * restantsApres;
        }, 0);
    }

    const statutParId: Record<string, StatutJour> = {};
    (planning.data ?? []).forEach((r: { conseiller_id: string; statut: StatutJour }) => { statutParId[r.conseiller_id] = r.statut; });
    const derniere: Record<string, string> = {};
    (ventesAuj.data ?? []).forEach((v: { conseiller_id: string; created_at: string; source: string | null }) => {
        if (v.source === "cerebro_check") return;
        if (!derniere[v.conseiller_id]) derniere[v.conseiller_id] = v.created_at;
    });
    const defiParId: Record<string, DefiResume> = {};
    (defis.data ?? []).forEach((d: { conseiller_id: string; libelle: string; statut: DefiResume["statut"] }) => { defiParId[d.conseiller_id] = { libelle: d.libelle, statut: d.statut }; });

    const conseillers: EtatConseiller[] = mois.map((c) => ({
        id: c.id,
        nom: c.nom,
        statut: statutParId[c.id] ?? null,
        planifie: (planifAuj[c.id] ?? 0) > 0,
        actesJour: actesDe(c.id, "jour"),
        actesMois: actesDe(c.id, "mois"),
        derniereVente: derniere[c.id] ?? null,
        defi: defiParId[c.id] ?? null,
    })).sort((a, b) => Number(b.planifie) - Number(a.planifie) || b.actesJour.realise - a.actesJour.realise);

    return { produits, actes: { jour: somme("jour"), semaine: somme("semaine"), mois: somme("mois"), projectionMois: projection === null ? null : Math.round(projection) }, conseillers };
}
