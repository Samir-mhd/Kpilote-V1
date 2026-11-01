import { supabase } from "@/lib/supabase";
import { ItemLieConfig, MatriceConfig, ConseillerMatriceInput, ItemPrincipal, Profil } from "./matriceObjectifs";

const ITEMS_LIES_DEFAUT: ItemLieConfig[] = [
    { name: "McAfee", base: "Box", shopRate: 0.25, tauxDefaut: 0.20 },
    { name: "Assurance", base: "Téléphone", shopRate: 0.25, tauxDefaut: 0.25 },
    { name: "McAfee mobile", base: "Forfaits", shopRate: 0.05, tauxDefaut: 0.05 },
    { name: "Assurance essentielle", base: "Forfaits", shopRate: 0.10, tauxDefaut: 0.10 },
    { name: "Canal+", base: "Box", shopRate: 0.10, tauxDefaut: 0.10 },
];

/** Colonne `taux_*` de matrice_objectifs_conseillers associée à chaque item lié (noms fixes, non renommables en UI). */
const COLONNE_TAUX: Record<string, string> = {
    "McAfee": "taux_mcafee",
    "Assurance": "taux_assurance",
    "McAfee mobile": "taux_mcafee_mobile",
    "Assurance essentielle": "taux_assurance_essentielle",
    "Canal+": "taux_canal",
};

export type MatriceConfigRow = {
    id: string;
    mois: string;
    objectif_box: number;
    objectif_forfaits: number;
    objectif_telephone: number;
    delta_moteur: number;
    delta_solide: number;
    delta_progression: number;
    delta_accompagner: number;
    heures_conseiller: number;
    heures_equipe: number;
    jours_forces_box: number | null;
    jours_forces_forfaits: number | null;
    jours_forces_telephone: number | null;
    items_lies: ItemLieConfig[];
};

function moisISO(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function moisCourantISO(): string {
    return moisISO();
}

/** Liste les mois déjà configurés (historique), du plus récent au plus ancien. */
export async function getMoisMatriceDisponibles(): Promise<string[]> {
    const { data, error } = await supabase
        .from("matrice_objectifs_config")
        .select("mois")
        .order("mois", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: { mois: string }) => r.mois);
}

/** Récupère la config d'un mois, la crée avec les valeurs par défaut si elle n'existe pas encore. */
export async function getOuCreerMatriceConfig(mois: string): Promise<MatriceConfigRow> {
    const { data: existant, error: errSelect } = await supabase
        .from("matrice_objectifs_config")
        .select("*")
        .eq("mois", mois)
        .maybeSingle();
    if (errSelect) throw errSelect;
    if (existant) return existant as MatriceConfigRow;

    const { data: cree, error: errInsert } = await supabase
        .from("matrice_objectifs_config")
        .insert({ mois, items_lies: ITEMS_LIES_DEFAUT })
        .select("*")
        .single();
    if (errInsert) {
        // Conflit (23505) : une autre requête a créé la ligne entre-temps (effet rejoué en dev,
        // double clic...) — la ligne existe forcément désormais, on va la chercher au lieu d'échouer.
        if (errInsert.code === "23505") {
            const { data: rattrape, error: errRattrape } = await supabase
                .from("matrice_objectifs_config")
                .select("*")
                .eq("mois", mois)
                .single();
            if (errRattrape) throw errRattrape;
            return rattrape as MatriceConfigRow;
        }
        throw errInsert;
    }
    return cree as MatriceConfigRow;
}

export async function mettreAJourMatriceConfig(id: string, partiel: Partial<Omit<MatriceConfigRow, "id" | "mois">>): Promise<void> {
    const { error } = await supabase.from("matrice_objectifs_config").update(partiel).eq("id", id);
    if (error) throw error;
}

export function versConfigCalcul(row: MatriceConfigRow): MatriceConfig {
    return {
        objectifsBoutique: {
            Box: row.objectif_box,
            Forfaits: row.objectif_forfaits,
            Téléphone: row.objectif_telephone,
        },
        deltaProfil: {
            Moteur: row.delta_moteur,
            Solide: row.delta_solide,
            "En progression": row.delta_progression,
            "À accompagner": row.delta_accompagner,
        },
        itemsLies: row.items_lies,
        heuresConseiller: row.heures_conseiller,
        heuresEquipe: row.heures_equipe,
        joursForces: {
            Box: row.jours_forces_box,
            Forfaits: row.jours_forces_forfaits,
            Téléphone: row.jours_forces_telephone,
        },
    };
}

export type MatriceConseillerRow = {
    id: string;
    mois: string;
    conseiller_id: string;
    jours: number;
    profil_box: Profil | null;
    profil_forfaits: Profil | null;
    profil_telephone: Profil | null;
    taux_mcafee: number | null;
    taux_assurance: number | null;
    taux_mcafee_mobile: number | null;
    taux_assurance_essentielle: number | null;
    taux_canal: number | null;
};

export type ConseillerActif = { id: string; nom: string };

export async function getConseillersActifs(): Promise<ConseillerActif[]> {
    const { data, error } = await supabase
        .from("conseillers")
        .select("id, nom, profil_actif")
        .order("nom");
    if (error) throw error;
    return (data ?? [])
        .filter((c: { profil_actif: boolean | null }) => c.profil_actif !== false)
        .map((c: { id: string; nom: string }) => ({ id: c.id, nom: c.nom }));
}

export async function getMatriceConseillers(mois: string): Promise<MatriceConseillerRow[]> {
    const { data, error } = await supabase
        .from("matrice_objectifs_conseillers")
        .select("*")
        .eq("mois", mois);
    if (error) throw error;
    return (data ?? []) as MatriceConseillerRow[];
}

export async function upsertMatriceConseiller(
    mois: string,
    conseillerId: string,
    partiel: Partial<Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">>
): Promise<void> {
    const { error } = await supabase
        .from("matrice_objectifs_conseillers")
        .upsert({ mois, conseiller_id: conseillerId, ...partiel }, { onConflict: "mois,conseiller_id" });
    if (error) throw error;
}

/** Convertit une ligne DB + nom du conseiller vers l'entrée attendue par calculerMatrice. */
export function versConseillerCalcul(
    nom: string,
    row: MatriceConseillerRow | undefined,
    itemsLies: ItemLieConfig[]
): ConseillerMatriceInput {
    const taux: Record<string, number | null | undefined> = {};
    itemsLies.forEach((item) => {
        const colonne = COLONNE_TAUX[item.name];
        taux[item.name] = colonne ? (row?.[colonne as keyof MatriceConseillerRow] as number | null | undefined) : undefined;
    });

    return {
        id: row?.conseiller_id ?? nom,
        nom,
        jours: row?.jours ?? 0,
        profils: {
            Box: row?.profil_box ?? null,
            Forfaits: row?.profil_forfaits ?? null,
            Téléphone: row?.profil_telephone ?? null,
        },
        taux,
    };
}

export { COLONNE_TAUX };
export type { ItemPrincipal };
