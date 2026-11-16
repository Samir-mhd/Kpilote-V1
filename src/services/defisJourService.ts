/**
 * Défi du jour : proposé au Cerebro Check, choisi automatiquement parmi plusieurs types (un
 * produit, une vente combo, des avis Google, une assurance essentielle…). Accepté → suivi sur
 * l'Accueil avec pop-up "Défi remporté" ; refusé → affiché comme "Priorité du jour".
 * Table defis_jour (voir sql/defis_jour.sql).
 */
import { supabase } from "@/lib/supabase";
import { getMissionsReelles, getMissionsCompletes, codeDepuisNom } from "@/services/missionsReelles";
import { getJoursTravail, getJoursTravailPlage } from "@/services/planningService";
import { getRealiseVentesCombo } from "@/services/variableConseiller";

export type StatutDefi = "propose" | "accepte" | "refuse" | "reussi";

export type DefiJour = {
    id: string;
    conseillerId: string;
    jour: string;
    type: "produit" | "combo" | "vente_combo";
    code: string;
    libelle: string;
    cible: number;
    statut: StatutDefi;
    reussiLe: string | null;
};

export function jourDuJour(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function map(r: any): DefiJour {
    return { id: r.id, conseillerId: r.conseiller_id, jour: r.jour, type: r.type, code: r.code, libelle: r.libelle, cible: r.cible, statut: r.statut, reussiLe: r.reussi_le };
}

export async function getDefiJour(conseillerId: string, jour: string = jourDuJour()): Promise<DefiJour | null> {
    const { data } = await supabase.from("defis_jour").select("*").eq("conseiller_id", conseillerId).eq("jour", jour).maybeSingle();
    return data ? map(data) : null;
}

// ── Choix automatique ───────────────────────────────────────────────────────

type Candidat = { type: DefiJour["type"]; code: string; libelle: string; cible: number; poids: number };

// Libellés au pluriel / singulier par code.
const NOMS: Record<string, [string, string]> = {
    box: ["box", "box"],
    forfaits: ["forfait", "forfaits"],
    telephones: ["téléphone", "téléphones"],
    mcafee: ["McAfee", "McAfee"],
    assurance: ["assurance", "assurances"],
    avis_google: ["avis Google", "avis Google"],
    assurance_essentielle: ["assurance essentielle", "assurances essentielles"],
    mcafee_mobile: ["McAfee Mobile", "McAfee Mobile"],
    vente_combo: ["vente combo", "ventes combo"],
};
function libelle(code: string, n: number) {
    const [s, p] = NOMS[code] ?? [code, code];
    return `${n} ${n > 1 ? p : s}`;
}

/** Hash simple et stable : même conseiller + même jour → même tirage (si la création est relancée). */
function graine(texte: string): number {
    let h = 2166136261;
    for (const c of texte) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
}

/** Nom lisible d'un item de défi (singulier), pour la liste "choisis ton défi". */
export function nomItem(code: string): string {
    const n = NOMS[code]?.[0] ?? code;
    return n.charAt(0).toUpperCase() + n.slice(1);
}
export function libelleDefi(code: string, n: number): string { return libelle(code, n); }
function typeDe(code: string): DefiJour["type"] {
    return code === "vente_combo" ? "vente_combo" : code === "assurance_essentielle" || code === "mcafee_mobile" ? "combo" : "produit";
}

/** Tirage pondéré (aléatoire, ou déterministe si `graineTexte` est fourni). */
function tirer(candidats: Candidat[], graineTexte?: string): Candidat | null {
    if (candidats.length === 0) return null;
    const totalPoids = candidats.reduce((t, c) => t + c.poids, 0);
    let tirage = (graineTexte ? graine(graineTexte) : Math.random()) * totalPoids;
    for (const c of candidats) {
        tirage -= c.poids;
        if (tirage <= 0) return c;
    }
    return candidats[candidats.length - 1];
}

/** Défis possibles aujourd'hui : produits avec un objectif du jour (+1), combos, vente combo. */
async function candidatsDefi(conseillerId: string): Promise<Candidat[]> {
    const now = new Date();
    const [missionsJour, missionsMois, jt, transactions] = await Promise.all([
        getMissionsReelles(conseillerId, true),
        getMissionsCompletes(conseillerId).catch(() => []),
        getJoursTravail(conseillerId, now.getFullYear(), now.getMonth() + 1),
        supabase.from("ventes_transactions").select("nb_articles")
            .eq("conseiller_id", conseillerId)
            .gte("created_at", new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
    ]);

    const total = jt.travailles + jt.restants;
    const partEcoulee = total > 0 ? jt.travailles / total : 0;
    // Retard sur le rythme du mois (0 = dans les temps, 1 = rien de fait) → produit plus probable.
    const retard: Record<string, number> = {};
    missionsMois.forEach((m) => {
        const attendu = m.objectifMensuel * partEcoulee;
        retard[codeDepuisNom(m.produit)] = attendu > 0 ? Math.max(0, Math.min(1, (attendu - m.realise) / attendu)) : 0;
    });

    const candidats: Candidat[] = [];
    (missionsJour as { produit: string; objectif: number }[]).forEach((m) => {
        const code = codeDepuisNom(m.produit);
        if (!(code in NOMS) || m.objectif <= 0) return;
        const cible = m.objectif + 1;
        const type: DefiJour["type"] = code === "assurance_essentielle" || code === "mcafee_mobile" ? "combo" : "produit";
        candidats.push({ type, code, libelle: libelle(code, cible), cible, poids: 1 + 3 * (retard[code] ?? 0) });
    });

    // Vente combo (2 articles et +) : moyenne du mois par jour travaillé, +1.
    const nbCombos = (transactions.data ?? []).filter((t: { nb_articles: number }) => (t.nb_articles ?? 1) >= 2).length;
    const moyenneCombos = jt.travailles > 0 ? nbCombos / jt.travailles : 0;
    const cibleCombo = Math.max(1, Math.round(moyenneCombos) + 1);
    candidats.push({ type: "vente_combo", code: "vente_combo", libelle: libelle("vente_combo", cibleCombo), cible: cibleCombo, poids: 1.5 });
    return candidats;
}

async function choisirDefi(conseillerId: string): Promise<Candidat | null> {
    return tirer(await candidatsDefi(conseillerId), `${conseillerId}|${jourDuJour()}`);
}

/** "Changer de défi" : nouveau tirage parmi les autres défis possibles (pas le même item). */
export async function changerDefi(defi: DefiJour): Promise<DefiJour | null> {
    const autres = (await candidatsDefi(defi.conseillerId)).filter((c) => c.code !== defi.code);
    const choix = tirer(autres);
    if (!choix) return null;
    const { error } = await supabase.from("defis_jour")
        .update({ type: choix.type, code: choix.code, libelle: choix.libelle, cible: choix.cible })
        .eq("id", defi.id).eq("statut", "propose");
    if (error) throw error;
    return getDefiJour(defi.conseillerId, defi.jour);
}

/** Tous les items que le conseiller peut se fixer comme défi, avec un nombre suggéré
 *  (objectif du jour + 1, sinon 1). Produits non concernés (objectif 0 et aucune vente) exclus. */
export async function itemsDefiPerso(conseillerId: string): Promise<{ code: string; nom: string; suggestion: number }[]> {
    const [missions, candidats] = await Promise.all([
        getMissionsReelles(conseillerId, true).catch(() => []),
        candidatsDefi(conseillerId).catch(() => [] as Candidat[]),
    ]);
    const items = (missions as { produit: string; objectif: number }[])
        .map((m) => ({ code: codeDepuisNom(m.produit), objectif: m.objectif }))
        .filter((m) => m.code in NOMS && m.code !== "vente_combo")
        .map((m) => ({ code: m.code, nom: nomItem(m.code), suggestion: Math.max(1, m.objectif + 1) }));
    const combo = candidats.find((c) => c.code === "vente_combo");
    items.push({ code: "vente_combo", nom: nomItem("vente_combo"), suggestion: combo?.cible ?? 1 });
    return items;
}

/** Défi choisi par le conseiller lui-même : remplace le défi proposé et l'accepte. */
export async function definirDefiPerso(defi: DefiJour, code: string, cible: number): Promise<DefiJour | null> {
    const n = Math.max(1, Math.round(cible));
    const { error } = await supabase.from("defis_jour")
        .update({ type: typeDe(code), code, libelle: libelle(code, n), cible: n, statut: "accepte" })
        .eq("id", defi.id).in("statut", ["propose", "refuse"]);
    if (error) throw error;
    return getDefiJour(defi.conseillerId, defi.jour);
}

/** Défi du jour existant, ou en crée un (seulement si le conseiller est planifié aujourd'hui). */
export async function getOuCreerDefiJour(conseillerId: string): Promise<DefiJour | null> {
    const existant = await getDefiJour(conseillerId);
    if (existant) return existant;
    const aujourdhui = new Date();
    const planifie = await getJoursTravailPlage(conseillerId, aujourdhui, aujourdhui).catch(() => 0);
    if (planifie <= 0) return null;
    const choix = await choisirDefi(conseillerId);
    if (!choix) return null;
    await supabase.from("defis_jour").upsert(
        { conseiller_id: conseillerId, jour: jourDuJour(), type: choix.type, code: choix.code, libelle: choix.libelle, cible: choix.cible },
        { onConflict: "conseiller_id,jour", ignoreDuplicates: true }
    );
    return getDefiJour(conseillerId);
}

export async function repondreDefi(id: string, statut: "accepte" | "refuse"): Promise<void> {
    const { error } = await supabase.from("defis_jour").update({ statut }).eq("id", id).in("statut", ["propose", "accepte", "refuse"]);
    if (error) throw error;
}

/** Passe le défi à "réussi" une seule fois. true si CET appel l'a validé (→ pop-up). */
export async function marquerDefiReussi(id: string): Promise<boolean> {
    const { data } = await supabase.from("defis_jour")
        .update({ statut: "reussi", reussi_le: new Date().toISOString() })
        .eq("id", id).eq("statut", "accepte")
        .select("id");
    return (data ?? []).length > 0;
}

/** Réalisé du jour sur l'objet du défi. */
export async function mesurerDefi(defi: DefiJour): Promise<number> {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    if (defi.code === "vente_combo") {
        const { data } = await supabase.from("ventes_transactions").select("nb_articles")
            .eq("conseiller_id", defi.conseillerId).gte("created_at", debut.toISOString());
        return (data ?? []).filter((t: { nb_articles: number }) => (t.nb_articles ?? 1) >= 2).length;
    }
    if (defi.code === "assurance_essentielle" || defi.code === "mcafee_mobile") {
        const c = await getRealiseVentesCombo(defi.conseillerId, defi.jour, defi.jour).catch(() => null);
        return c ? c[defi.code] : 0;
    }
    const { data } = await supabase.from("ventes").select("quantite, source, produits(code)")
        .eq("conseiller_id", defi.conseillerId).gte("created_at", debut.toISOString());
    return (data ?? []).reduce((t: number, v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        return code === defi.code && v.source !== "cerebro_check" ? t + (v.quantite ?? 1) : t;
    }, 0);
}

/** Défis remportés aujourd'hui (toute l'équipe) — pour le fil d'actualité. */
export async function getDefisReussisDuJour(): Promise<{ conseillerId: string; libelle: string; reussiLe: string }[]> {
    const { data } = await supabase.from("defis_jour").select("conseiller_id, libelle, reussi_le")
        .eq("jour", jourDuJour()).eq("statut", "reussi");
    return (data ?? []).map((r: any) => ({ conseillerId: r.conseiller_id, libelle: r.libelle, reussiLe: r.reussi_le }));
}

/** Nombre total de défis du jour remportés et série en cours (jours avec défi, d'affilée, tous remportés). */
export async function getBilanDefisJour(conseillerId: string): Promise<{ total: number; serie: number }> {
    const { data } = await supabase.from("defis_jour").select("jour, statut")
        .eq("conseiller_id", conseillerId).order("jour", { ascending: false }).limit(400);
    const lignes = (data ?? []) as { jour: string; statut: StatutDefi }[];
    const total = lignes.filter((l) => l.statut === "reussi").length;
    let serie = 0;
    for (const l of lignes) {
        if (l.statut === "reussi") serie++;
        else if (l.jour === jourDuJour() && (l.statut === "accepte" || l.statut === "propose")) continue; // journée en cours
        else break;
    }
    return { total, serie };
}
