/**
 * Données des podiums thématiques (onglet Podiums du Classement) qui n'existent pas ailleurs :
 * actes par jour et par conseiller, pour le "record d'actes en une journée".
 * Même périmètre que les totaux d'actes : ventes hors Spiderhome / Avis Google / Récap Co,
 * plus McAfee Mobile et Assurance essentielle (variable_actes_jour).
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";
import { PRODUITS_HORS_ACTES, ProduitCode } from "@/utils/produits";

function jourLocal(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** debut / fin au format "YYYY-MM-DD" (bornes incluses). Résultat : conseiller → jour → actes. */
export async function getActesParJour(debut: string, fin: string): Promise<Record<string, Record<string, number>>> {
    const [ya, ma, da] = debut.split("-").map(Number);
    const [yb, mb, db] = fin.split("-").map(Number);
    const debutDate = new Date(ya, ma - 1, da);
    const lendemain = new Date(yb, mb - 1, db + 1);

    const [ventes, { data: bonusMcafee }, { data: actes }] = await Promise.all([
        fetchToutesLesLignes((from, to) =>
            supabase
                .from("ventes")
                .select("conseiller_id, created_at, quantite, produits(code)")
                .gte("created_at", debutDate.toISOString())
                .lt("created_at", lendemain.toISOString())
                .order("created_at", { ascending: true })
                .range(from, to)
        ),
        supabase.from("variable_bonus_manuels").select("id, label").eq("categorie", "autres_primes"),
        supabase
            .from("variable_actes_jour")
            .select("conseiller_id, jour, champ, bonus_manuel_id, quantite")
            .gte("jour", debut)
            .lte("jour", fin),
    ]);

    const result: Record<string, Record<string, number>> = {};
    const ajouter = (cid: string, jour: string, n: number) => {
        if (!result[cid]) result[cid] = {};
        result[cid][jour] = (result[cid][jour] ?? 0) + n;
    };

    (ventes as any[]).forEach((v) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code as ProduitCode | undefined;
        if (!code || PRODUITS_HORS_ACTES.includes(code)) return;
        ajouter(v.conseiller_id, jourLocal(v.created_at), v.quantite ?? 1);
    });

    const idsMcafeeMobile = new Set(
        (bonusMcafee ?? [])
            .filter((b: { label: string }) => b.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("mcafee"))
            .map((b: { id: string }) => b.id)
    );
    (actes ?? []).forEach((a: { conseiller_id: string; jour: string; champ: string | null; bonus_manuel_id: string | null; quantite: number | null }) => {
        const estCombo = a.champ === "assurance_essentielle" || (!!a.bonus_manuel_id && idsMcafeeMobile.has(a.bonus_manuel_id));
        if (estCombo) ajouter(a.conseiller_id, a.jour, a.quantite ?? 1);
    });

    return result;
}
