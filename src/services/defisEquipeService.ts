/**
 * Défis d'équipe : N conseillers vs M conseillers (tailles libres, ex. 2v1, 3v2...), composés
 * en cliquant sur des avatars. Créables aussi bien par un conseiller que par le manager.
 */
import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";

export type ModeScoreEquipe = "total" | "moyenne";

export type MembreDefiEquipe = { conseillerId: string; nom: string; equipe: 1 | 2 };

export type DefiEquipe = {
    id: string;
    nom: string;
    produit: string;
    mode: ModeScoreEquipe;
    /** ISO datetime — début du créneau (précision minute pour les défis flash, minuit pour "Aujourd'hui"). */
    dateDebut: string;
    /** ISO datetime — fin du créneau. */
    dateFin: string;
    statut: "en_cours" | "termine";
    creePar: string | null;
    createdAt: string;
    membres: MembreDefiEquipe[];
};

export type ScoreDefiEquipe = {
    score1: number;
    score2: number;
    parConseiller: Record<string, number>;
};

export async function creerDefiEquipe(params: {
    nom: string;
    produit: string;
    mode: ModeScoreEquipe;
    dateDebut: string;
    dateFin: string;
    creePar?: string | null;
    equipe1: string[];
    equipe2: string[];
}): Promise<string> {
    const { data, error } = await supabase
        .from("defis_equipe")
        .insert({
            nom: params.nom,
            produit: params.produit,
            mode: params.mode,
            date_debut: params.dateDebut,
            date_fin: params.dateFin,
            cree_par: params.creePar ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    const defiId = data.id as string;

    const membres = [
        ...params.equipe1.map((conseillerId) => ({ defi_id: defiId, conseiller_id: conseillerId, equipe: 1 })),
        ...params.equipe2.map((conseillerId) => ({ defi_id: defiId, conseiller_id: conseillerId, equipe: 2 })),
    ];

    const { error: errMembres } = await supabase.from("defis_equipe_membres").insert(membres);
    if (errMembres) throw errMembres;

    return defiId;
}

export async function getDefisEquipe(): Promise<DefiEquipe[]> {
    const [{ data: defis }, { data: membresRows }] = await Promise.all([
        supabase.from("defis_equipe").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("defis_equipe_membres").select("defi_id, conseiller_id, equipe, conseillers(nom)"),
    ]);

    if (!defis?.length) return [];

    const membresParDefi: Record<string, MembreDefiEquipe[]> = {};
    (membresRows ?? []).forEach((r: any) => {
        const nom = (Array.isArray(r.conseillers) ? r.conseillers[0] : r.conseillers)?.nom ?? "?";
        if (!membresParDefi[r.defi_id]) membresParDefi[r.defi_id] = [];
        membresParDefi[r.defi_id].push({ conseillerId: r.conseiller_id, nom, equipe: r.equipe });
    });

    return defis.map((d: any) => ({
        id: d.id,
        nom: d.nom,
        produit: d.produit,
        mode: d.mode,
        dateDebut: d.date_debut,
        dateFin: d.date_fin,
        statut: d.statut,
        creePar: d.cree_par,
        createdAt: d.created_at,
        membres: membresParDefi[d.id] ?? [],
    }));
}

export async function getScoreDefiEquipe(defi: DefiEquipe): Promise<ScoreDefiEquipe> {
    const ids = defi.membres.map((m) => m.conseillerId);
    if (ids.length === 0) return { score1: 0, score2: 0, parConseiller: {} };

    const rows = await fetchToutesLesLignes((from, to) =>
        supabase
            .from("ventes")
            .select("conseiller_id, quantite, produits(code)")
            .in("conseiller_id", ids)
            .gte("created_at", defi.dateDebut)
            .lte("created_at", defi.dateFin)
            .order("created_at", { ascending: true })
            .range(from, to)
    );

    const parConseiller: Record<string, number> = {};
    ids.forEach((id) => { parConseiller[id] = 0; });

    rows.forEach((v: any) => {
        const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
        if (!code || code === "spiderhome") return;
        if (defi.produit !== "tous" && code !== defi.produit) return;
        parConseiller[v.conseiller_id] = (parConseiller[v.conseiller_id] ?? 0) + (v.quantite ?? 1);
    });

    const equipe1 = defi.membres.filter((m) => m.equipe === 1);
    const equipe2 = defi.membres.filter((m) => m.equipe === 2);
    const total1 = equipe1.reduce((s, m) => s + (parConseiller[m.conseillerId] ?? 0), 0);
    const total2 = equipe2.reduce((s, m) => s + (parConseiller[m.conseillerId] ?? 0), 0);

    const score1 = defi.mode === "moyenne" && equipe1.length > 0 ? total1 / equipe1.length : total1;
    const score2 = defi.mode === "moyenne" && equipe2.length > 0 ? total2 / equipe2.length : total2;

    return { score1, score2, parConseiller };
}

export async function cloturerDefiEquipe(id: string): Promise<void> {
    const { error } = await supabase.from("defis_equipe").update({ statut: "termine" }).eq("id", id);
    if (error) throw error;
}

export async function supprimerDefiEquipe(id: string): Promise<void> {
    const { error } = await supabase.from("defis_equipe").delete().eq("id", id);
    if (error) throw error;
}
