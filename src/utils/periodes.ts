export type Periode = "jour" | "semaine" | "mois";

export const PERIODE_LABELS: Record<Periode, string> = {
    jour:    "Aujourd'hui",
    semaine: "Semaine en cours",
    mois:    "Ce mois",
};

/** Retourne la date ISO de début de la période. */
export function dateDebutPeriode(periode: Periode): string {
    const now = new Date();
    if (periode === "jour") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    if (periode === "semaine") {
        const dow = now.getDay();
        const diffLundi = dow === 0 ? -6 : 1 - dow;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffLundi).toISOString();
    }
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/** Proratise un objectif mensuel selon la période et le nombre de jours ouvrés. */
export function proratiserObjectif(
    objectifMensuel: number,
    periode: Periode
): number {
    if (periode === "mois") return objectifMensuel;

    const now = new Date();
    const annee = now.getFullYear();
    const mois  = now.getMonth();

    // Nombre de jours ouvrés (lun-sam) du mois
    const nbJoursMois = new Date(annee, mois + 1, 0).getDate();
    let joursOuvresMois = 0;
    for (let j = 1; j <= nbJoursMois; j++) {
        const d = new Date(annee, mois, j).getDay();
        if (d !== 0) joursOuvresMois++; // tous sauf dimanche
    }

    const tauxJour = objectifMensuel / (joursOuvresMois || 1);

    if (periode === "jour") return Math.round(tauxJour * 10) / 10;

    // Semaine : compter les jours ouvrés de la semaine en cours
    const dow = now.getDay();
    const diffLundi = dow === 0 ? -6 : 1 - dow;
    let joursOuvresSemaine = 0;
    for (let i = 0; i < 6; i++) { // lundi à samedi
        const d = new Date(annee, mois, now.getDate() + diffLundi + i).getDay();
        if (d !== 0) joursOuvresSemaine++;
    }
    return Math.round(tauxJour * joursOuvresSemaine * 10) / 10;
}

/** Couleur CSS selon le taux d'avancement. */
export function couleurTaux(realise: number, objectif: number): {
    text: string; bg: string; bar: string; border: string;
} {
    if (objectif === 0) return { text: "text-slate-400", bg: "bg-slate-50", bar: "bg-slate-300", border: "border-slate-200" };
    const taux = realise / objectif;
    if (taux >= 1)    return { text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", border: "border-emerald-200" };
    if (taux >= 0.5)  return { text: "text-amber-700",   bg: "bg-amber-50",   bar: "bg-amber-400",   border: "border-amber-200"   };
    return               { text: "text-red-700",     bg: "bg-red-50",     bar: "bg-red-400",     border: "border-red-200"     };
}
