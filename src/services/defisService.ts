import { supabase } from "@/lib/supabase";
import { cloturerChallenge } from "./challengeRepository";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ResultatDefi = "gagné" | "perdu" | "égalité";
export type ResultatChallenge = "réussi" | "échoué" | "en cours";

export type DefiRow = {
    id: string;
    participants: string[];
    produit: string;
    scoreCreateur: number;
    scoreAdversaire: number;
    vainqueur: string | null;
    date: string;
    statut: "en cours" | "terminé";
};

export type ChallengeRow = {
    id: string;
    conseiller: string;
    produit: string;
    objectif: number;
    realise: number;
    resultat: ResultatChallenge;
    date: string;
};

export type StatsConseiller = {
    id: string;
    nom: string;
    defis: { gagne: number; perdu: number; egalite: number };
    challenges: { reussi: number; echoue: number; enCours: number };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function err(e: unknown, context: string): Error {
    const msg = e && typeof e === "object" && "message" in e
        ? (e as any).message
        : String(e);
    return new Error(`[${context}] ${msg}`);
}

function isDefi(row: any): boolean {
    // Défi si type = "defi" OU si type absent mais adversaire présent
    return row.type === "defi" || (!row.type && !!row.adversaire);
}

function isChallenge(row: any): boolean {
    return row.type === "challenge";
}

function statutDefi(status: string): DefiRow["statut"] {
    return (status === "finished" || status === "done") ? "terminé" : "en cours";
}

function resultatChallenge(row: any): ResultatChallenge {
    if (row.status !== "finished" && row.status !== "done") return "en cours";
    return row.vainqueur === row.createur ? "réussi" : "échoué";
}

// ─── Requête commune ──────────────────────────────────────────────────────────

async function tousLesChallenges(): Promise<any[]> {
    const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) throw err(error, "challenges");
    if (!data?.length) return [];

    // Charge les vrais noms depuis conseillers (adversaire_nom / createur_nom absents en base)
    const ids = [...new Set(data.flatMap((c: any) => [c.createur, c.adversaire].filter(Boolean)))];
    const { data: cons } = await supabase.from("conseillers").select("id, nom").in("id", ids);
    const nomMap: Record<string, string> = {};
    (cons ?? []).forEach((c: any) => { nomMap[c.id] = c.nom; });

    return data.map((c: any) => ({
        ...c,
        createur_nom:  nomMap[c.createur]  ?? c.createur_nom  ?? "?",
        adversaire_nom: nomMap[c.adversaire] ?? c.adversaire_nom ?? "?",
    }));
}

// ─── API publique ──────────────────────────────────────────────────────────────

/**
 * Défis entre conseillers.
 * Compatible avec ou sans colonne `type` dans la table.
 */
export async function chargerDefis(): Promise<DefiRow[]> {
    const rows = await tousLesChallenges();
    return rows
        .filter((r) => isDefi(r))
        .map((row): DefiRow => ({
            id: row.id,
            participants: [row.createur_nom, row.adversaire_nom].filter(Boolean),
            produit: row.produit,
            scoreCreateur: row.score_createur ?? 0,
            scoreAdversaire: row.score_adversaire ?? 0,
            vainqueur:
                row.vainqueur === row.createur
                    ? row.createur_nom
                    : row.vainqueur === row.adversaire
                    ? row.adversaire_nom
                    : null,
            date: new Date(row.created_at).toLocaleDateString("fr-FR"),
            statut: statutDefi(row.status),
        }));
}

/**
 * Challenges individuels KPILOTE.
 * Nécessite colonne `type = "challenge"` — retourne vide si absente.
 */
export async function chargerChallenges(): Promise<ChallengeRow[]> {
    const rows = await tousLesChallenges();
    return rows
        .filter((r) => isChallenge(r))
        .map((row): ChallengeRow => ({
            id: row.id,
            conseiller: row.createur_nom ?? "—",
            produit: row.produit,
            objectif: row.objectif ?? 0,
            realise: row.score_createur ?? 0,
            resultat: resultatChallenge(row),
            date: new Date(row.created_at).toLocaleDateString("fr-FR"),
        }));
}

/**
 * Classement par conseiller.
 */
export async function chargerClassementDefisEtChallenges(): Promise<StatsConseiller[]> {
    const rows = await tousLesChallenges();
    const map = new Map<string, StatsConseiller>();

    function getOrCreate(id: string, nom: string): StatsConseiller {
        if (!id) return { id: "", nom: "", defis: { gagne: 0, perdu: 0, egalite: 0 }, challenges: { reussi: 0, echoue: 0, enCours: 0 } };
        if (!map.has(id)) {
            map.set(id, {
                id,
                nom,
                defis: { gagne: 0, perdu: 0, egalite: 0 },
                challenges: { reussi: 0, echoue: 0, enCours: 0 },
            });
        }
        return map.get(id)!;
    }

    rows.forEach((row) => {
        const termine = row.status === "finished" || row.status === "done";

        if (isChallenge(row)) {
            const c = getOrCreate(row.createur, row.createur_nom);
            if (!termine) c.challenges.enCours++;
            else if (row.vainqueur === row.createur) c.challenges.reussi++;
            else c.challenges.echoue++;
        } else {
            // défi
            if (!termine) return;
            const createur = getOrCreate(row.createur, row.createur_nom);
            const adversaire = getOrCreate(row.adversaire, row.adversaire_nom);
            if (row.vainqueur === null) {
                createur.defis.egalite++;
                adversaire.defis.egalite++;
            } else if (row.vainqueur === row.createur) {
                createur.defis.gagne++;
                adversaire.defis.perdu++;
            } else {
                adversaire.defis.gagne++;
                createur.defis.perdu++;
            }
        }
    });

    return Array.from(map.values())
        .filter((c) => c.id)
        .sort((a, b) => {
            const sa = a.defis.gagne * 3 + a.defis.egalite + a.challenges.reussi * 2;
            const sb = b.defis.gagne * 3 + b.defis.egalite + b.challenges.reussi * 2;
            return sb - sa;
        });
}

/**
 * Clôture tous les défis/challenges dont le chrono est écoulé.
 * Appelé par la page manager au chargement et toutes les 60s.
 */
export async function cloturerChallengesExpires(): Promise<void> {
    const { data } = await supabase
        .from("challenges")
        .select("id, createur, adversaire, score_createur, score_adversaire, duree, created_at")
        .in("status", ["pending", "running"]);

    if (!data?.length) return;

    const now = Date.now();
    const expires = data.filter((c: any) => {
        const createdAt = new Date(c.created_at).getTime();
        const expiresAt = createdAt + (c.duree ?? 30) * 60 * 1000;
        return now >= expiresAt;
    });

    await Promise.all(expires.map((c: any) =>
        cloturerChallenge({
            id: c.id,
            createur: c.createur,
            adversaire: c.adversaire,
            score_createur: c.score_createur,
            score_adversaire: c.score_adversaire,
        })
    ));
}
