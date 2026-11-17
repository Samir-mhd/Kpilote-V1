/**
 * Cerebro Check « mini tableau de bord » : dernière journée travaillée, 10 derniers jours
 * travaillés (actes par jour), moyenne du mois, et produits non vendus depuis plusieurs jours.
 */
import { getVentesConseillerDepuis, getCombosParJour, getPlanningPlage, estJourTravaille } from "@/services/statsConseillerService";

/** Actes commerciaux (même périmètre que les totaux de l'Accueil). */
export const CODES_ACTES_MATIN = ["box", "forfaits", "telephones", "mcafee", "assurance", "mcafee_mobile", "assurance_essentielle"];
/** Produits suivis pour « À relancer » (Canal+ et Avis Google en plus). */
const CODES_RELANCE = [...CODES_ACTES_MATIN, "canal_plus", "avis_google"];
/** À relancer : non vendu depuis au moins ce nombre de jours travaillés. */
const SEUIL_RELANCE = 3;

export type JourMatin = { jour: string; actes: number; parCode: Record<string, number> };
export type TableauBordMatin = {
    jours: JourMatin[];               // 10 derniers jours travaillés (ancien → récent), hors aujourd'hui
    veille: JourMatin | null;         // dernier jour travaillé
    moyenne: number;                  // actes moyens par jour travaillé ce mois (hors aujourd'hui)
    meilleureDuMois: boolean;         // la veille est la meilleure journée du mois
    aRelancer: { code: string; joursSans: number; derniere: string | null }[];
};

function jl(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getTableauBordMatin(conseillerId: string): Promise<TableauBordMatin> {
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    const debut = new Date(auj); debut.setDate(debut.getDate() - 45);
    const hier = new Date(auj); hier.setDate(hier.getDate() - 1);
    const [ventes, combos, planning] = await Promise.all([
        getVentesConseillerDepuis(conseillerId, debut),
        getCombosParJour(conseillerId, debut, hier).catch(() => ({} as Record<string, Record<string, number>>)),
        getPlanningPlage(conseillerId, debut, hier).catch(() => ({})),
    ]);

    // Ventes réelles uniquement (les corrections du Cerebro Check ne sont pas des ventes du jour).
    const parJour: Record<string, Record<string, number>> = {};
    ventes.filter((v) => !v.ajustement).forEach((v) => {
        const o = (parJour[v.jour] ??= {});
        o[v.code] = (o[v.code] ?? 0) + v.quantite;
    });
    Object.entries(combos).forEach(([j, c]) => {
        const o = (parJour[j] ??= {});
        Object.entries(c).forEach(([k, n]) => { o[k] = (o[k] ?? 0) + (n as number); });
    });

    const jours: JourMatin[] = [];
    for (let x = new Date(debut); x < auj; x.setDate(x.getDate() + 1)) {
        const k = jl(x);
        if (!estJourTravaille(new Date(x), (planning as Record<string, never>)[k])) continue;
        const pc = parJour[k] ?? {};
        jours.push({ jour: k, actes: CODES_ACTES_MATIN.reduce((t, c) => t + (pc[c] ?? 0), 0), parCode: pc });
    }

    const veille = jours[jours.length - 1] ?? null;
    const debutMois = jl(new Date(auj.getFullYear(), auj.getMonth(), 1));
    const duMois = jours.filter((j) => j.jour >= debutMois);
    const moyenne = duMois.length ? duMois.reduce((t, j) => t + j.actes, 0) / duMois.length : 0;
    const meilleureDuMois = !!veille && veille.jour >= debutMois && veille.actes > 0 && duMois.every((j) => j.actes <= veille.actes);

    const aRelancer = CODES_RELANCE.map((code) => {
        let joursSans = 0, derniere: string | null = null;
        for (let i = jours.length - 1; i >= 0; i--) {
            if ((jours[i].parCode[code] ?? 0) > 0) { derniere = jours[i].jour; break; }
            joursSans++;
        }
        return { code, joursSans, derniere };
    }).filter((r) => r.joursSans >= SEUIL_RELANCE).sort((a, b) => b.joursSans - a.joursSans);

    return { jours: jours.slice(-10), veille, moyenne, meilleureDuMois, aRelancer };
}
