/**
 * Bilan du soir : volumes de l'équipe et de chaque conseiller pour aujourd'hui, défis remportés.
 * Lit les ventes en direct : un conseiller qui n'a pas validé sa journée est quand même compté.
 */
import { getConseillers } from "@/services/conseillers";
import { getJoursTravailPlageTous } from "@/services/planningService";
import { getMissionsReelles, codeDepuisNom } from "@/services/missionsReelles";
import { getDefisReussisDuJour } from "@/services/defisJourService";

/** Actes commerciaux (total) puis suivis hors actes (affichés à part). */
export const CODES_ACTES_BILAN = ["box", "forfaits", "telephones", "mcafee", "assurance", "mcafee_mobile", "assurance_essentielle"] as const;
export const CODES_SUIVI_BILAN = ["avis_google", "recap_commercial"] as const;
const CODES = [...CODES_ACTES_BILAN, ...CODES_SUIVI_BILAN] as string[];

export type PerfBilan = {
    id: string;
    nom: string;
    photo: string | null;
    actes: number;
    volumes: Record<string, number>;
    defi: string | null;
};

export async function getBilanSoir(): Promise<PerfBilan[]> {
    const cons = ((await getConseillers()) as any[]).filter((c) => c.profil_actif !== false);
    const auj = new Date();
    const [plan, defis] = await Promise.all([
        getJoursTravailPlageTous(cons.map((c) => c.id), auj, auj).catch(() => ({} as Record<string, number>)),
        getDefisReussisDuJour().catch(() => []),
    ]);
    const perfs = await Promise.all(cons.map(async (c): Promise<PerfBilan> => {
        const missions = await getMissionsReelles(c.id, true).catch(() => []);
        const volumes: Record<string, number> = {};
        (missions as { produit: string; realise: number }[]).forEach((m) => {
            const code = codeDepuisNom(m.produit);
            if (CODES.includes(code)) volumes[code] = m.realise ?? 0;
        });
        return {
            id: c.id,
            nom: String(c.nom).split(" ")[0],
            photo: c.avatar && (c.avatar.startsWith("http") || c.avatar.startsWith("data:")) ? c.avatar : null,
            actes: CODES_ACTES_BILAN.reduce((t, k) => t + (volumes[k] ?? 0), 0),
            volumes,
            defi: defis.find((d) => d.conseillerId === c.id)?.libelle ?? null,
        };
    }));
    // Présents = planifiés aujourd'hui, ou ayant vendu quelque chose. Ordre alphabétique (pas de classement).
    return perfs
        .filter((p) => (plan[p.id] ?? 0) > 0 || p.actes > 0 || CODES_SUIVI_BILAN.some((k) => (p.volumes[k] ?? 0) > 0))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
