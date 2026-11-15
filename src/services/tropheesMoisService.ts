/**
 * Trophées du mois : titres remis en jeu chaque mois (le gagnant du mois les garde à vie).
 * Mois en cours = course en direct ; mois précédent = attribué au premier affichage de la page
 * Trophées du mois suivant (conseiller_badges, code `mois_<categorie>_<AAAA-MM>`, upsert idempotent).
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import { PRODUITS_HORS_TOTAL_CLASSEMENT, COMBOS_DANS_TOTAL, ProduitCode } from "@/utils/produits";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { getRealiseVentesComboParConseiller } from "@/services/variableConseiller";

export type CategorieMois = "combo" | "progression" | "defis" | "avis";

export const CATEGORIES_MOIS: { id: CategorieMois; label: string; labelF: string; emoji: string; de: string; a: string; description: string; unite: string }[] = [
    { id: "combo", label: "Roi du combo", labelF: "Reine du combo", emoji: "🛒", de: "#ccfbf1", a: "#0d9488", description: "Le plus de ventes combo (2 articles et +) du mois", unite: "combos" },
    { id: "progression", label: "Fusée du mois", labelF: "Fusée du mois", emoji: "🚀", de: "#e0e7ff", a: "#4f46e5", description: "Plus forte hausse d'actes par jour travaillé vs le mois d'avant", unite: "%" },
    { id: "defis", label: "Maître des défis", labelF: "Maîtresse des défis", emoji: "🎯", de: "#fae8ff", a: "#a21caf", description: "Le plus de défis du jour remportés dans le mois", unite: "défis" },
    { id: "avis", label: "Ambassadeur", labelF: "Ambassadrice", emoji: "⭐", de: "#fef3c7", a: "#d97706", description: "Le plus d'avis Google du mois", unite: "avis" },
];

export type ScoreMois = { id: string; nom: string; valeur: number };
export type ClassementMois = Record<CategorieMois, ScoreMois[]>;

const jour = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const cleMois = (d: Date) => jour(d).slice(0, 7);
export const codeTropheeMois = (cat: CategorieMois, mois: string) => `mois_${cat}_${mois}`;

/** Actes (même périmètre que le classement : hors Spiderhome / Avis / Récap Co, + combos) et avis Google par conseiller sur [debut, fin[. */
async function actesEtAvis(debut: Date, fin: Date): Promise<{ actes: Record<string, number>; avis: Record<string, number> }> {
    const ventes = await fetchToutesLesLignes((from, to) =>
        supabase.from("ventes").select("conseiller_id, quantite, source, produits(code)")
            .gte("created_at", debut.toISOString()).lt("created_at", fin.toISOString())
            .order("created_at", { ascending: true }).range(from, to)
    );
    const actes: Record<string, number> = {};
    const avis: Record<string, number> = {};
    ventes.forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code as ProduitCode | undefined;
        if (!code || code === "spiderhome") return;
        const q = v.quantite ?? 1;
        if (code === "avis_google") avis[v.conseiller_id] = (avis[v.conseiller_id] ?? 0) + q;
        if (!PRODUITS_HORS_TOTAL_CLASSEMENT.includes(code)) actes[v.conseiller_id] = (actes[v.conseiller_id] ?? 0) + q;
    });
    const veille = new Date(fin); veille.setDate(veille.getDate() - 1);
    const combos = await getRealiseVentesComboParConseiller(jour(debut), jour(veille)).catch(() => ({} as Record<string, Record<string, number>>));
    Object.entries(combos).forEach(([id, c]) => COMBOS_DANS_TOTAL.forEach((code) => { actes[id] = (actes[id] ?? 0) + (c[code] ?? 0); }));
    return { actes, avis };
}

/** Classement de chaque catégorie pour le mois commençant à `debut` (trié décroissant, valeurs > 0 seulement). */
export async function calculerClassementMois(debut: Date): Promise<ClassementMois> {
    const fin = new Date(debut.getFullYear(), debut.getMonth() + 1, 1);
    const finEffective = fin > new Date() ? new Date() : fin;
    const debutPrec = new Date(debut.getFullYear(), debut.getMonth() - 1, 1);
    const finPrecJour = new Date(debut); finPrecJour.setDate(0);
    const finEffJour = new Date(finEffective); finEffJour.setDate(finEffJour.getDate() - (finEffective.getTime() === fin.getTime() ? 1 : 0));

    const { data: cons } = await supabase.from("conseillers").select("id, nom, profil_actif");
    const actifs = (cons ?? []).filter((c: any) => c.profil_actif !== false) as { id: string; nom: string }[];
    const ids = actifs.map((c) => c.id);

    const [mois, prec, joursMois, joursPrec, transactions, defis] = await Promise.all([
        actesEtAvis(debut, fin),
        actesEtAvis(debutPrec, debut),
        getJoursTravailPlageTous(ids, debut, finEffJour).catch(() => ({} as Record<string, number>)),
        getJoursTravailPlageTous(ids, debutPrec, finPrecJour).catch(() => ({} as Record<string, number>)),
        fetchToutesLesLignes((from, to) =>
            supabase.from("ventes_transactions").select("conseiller_id, nb_articles")
                .gte("created_at", debut.toISOString()).lt("created_at", fin.toISOString())
                .order("created_at", { ascending: true }).range(from, to)
        ),
        supabase.from("defis_jour").select("conseiller_id").eq("statut", "reussi").gte("jour", jour(debut)).lt("jour", jour(fin)),
    ]);

    const combos: Record<string, number> = {};
    transactions.forEach((t: any) => { if ((t.nb_articles ?? 1) >= 2) combos[t.conseiller_id] = (combos[t.conseiller_id] ?? 0) + 1; });
    const nbDefis: Record<string, number> = {};
    (defis.data ?? []).forEach((d: any) => { nbDefis[d.conseiller_id] = (nbDefis[d.conseiller_id] ?? 0) + 1; });
    const progression: Record<string, number> = {};
    ids.forEach((id) => {
        const jm = joursMois[id] ?? 0, jp = joursPrec[id] ?? 0;
        if (jm < 3 || jp < 3) return; // trop peu de jours pour comparer
        const avant = (prec.actes[id] ?? 0) / jp;
        if (avant <= 0) return;
        progression[id] = Math.round((((mois.actes[id] ?? 0) / jm) / avant - 1) * 100);
    });

    const trier = (m: Record<string, number>): ScoreMois[] => actifs
        .map((c) => ({ id: c.id, nom: c.nom, valeur: m[c.id] ?? 0 }))
        .filter((s) => s.valeur > 0)
        .sort((a, b) => b.valeur - a.valeur);

    return { combo: trier(combos), progression: trier(progression), defis: trier(nbDefis), avis: trier(mois.avis) };
}

/** Attribue les titres du mois précédent s'ils ne l'ont pas encore été (ex aequo : tous gagnent). */
export async function attribuerTropheesMoisPrecedent(): Promise<void> {
    const now = new Date();
    const debutPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mois = cleMois(debutPrec);
    const { data: deja } = await supabase.from("conseiller_badges").select("badge_code").like("badge_code", `mois_%_${mois}`).limit(1);
    if ((deja ?? []).length > 0) return;
    const classement = await calculerClassementMois(debutPrec);
    const obtenuLe = jour(new Date(now.getFullYear(), now.getMonth(), 1));
    const lignes = CATEGORIES_MOIS.flatMap((cat) => {
        const l = classement[cat.id];
        if (l.length === 0) return [];
        return l.filter((s) => s.valeur === l[0].valeur).map((s) => ({ conseiller_id: s.id, badge_code: codeTropheeMois(cat.id, mois), obtenu_le: obtenuLe }));
    });
    if (lignes.length > 0) {
        await supabase.from("conseiller_badges").upsert(lignes, { onConflict: "conseiller_id,badge_code", ignoreDuplicates: true });
    }
}
