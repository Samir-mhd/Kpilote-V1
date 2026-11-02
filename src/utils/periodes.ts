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
        return periodeSemaineEffective(now).debut.toISOString();
    }
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function jourLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bornes (format jour "YYYY-MM-DD", pour `variable_actes_jour.jour`) de la période active. */
export function joursPeriode(periode: Periode, reference: Date = new Date()): { debut: string; fin: string } {
    if (periode === "jour") {
        const s = jourLocal(reference);
        return { debut: s, fin: s };
    }
    if (periode === "semaine") {
        const { debut, fin } = periodeSemaineEffective(reference);
        return { debut: jourLocal(debut), fin: jourLocal(fin) };
    }
    const debut = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const fin   = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return { debut: jourLocal(debut), fin: jourLocal(fin) };
}

/** Lundi de la semaine ISO contenant `reference` (minuit local). */
export function lundiCourant(reference: Date = new Date()): Date {
    const dow = reference.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + diff);
}

/**
 * Période d'objectif "semaine" : normalement lundi → dimanche, mais tronquée aux bornes du
 * mois. Si un changement de mois tombe au milieu de la semaine ISO, la période s'arrête au
 * dernier jour de l'ancien mois (ou démarre au 1er du nouveau mois) — un objectif semaine ne
 * chevauche jamais deux mois différents ; un nouveau cycle (souvent redéfini manuellement)
 * démarre au 1er du mois même si ce n'est pas un lundi.
 */
export function periodeSemaineEffective(reference: Date = new Date()): { debut: Date; fin: Date } {
    const lundi = lundiCourant(reference);
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    const premierMois = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const dernierMois = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return {
        debut: lundi > premierMois ? lundi : premierMois,
        fin: dimanche < dernierMois ? dimanche : dernierMois,
    };
}

/** Jours restants dans le mois (aujourd'hui inclus, dimanches exclus) — rythme journalier
 *  générique utilisé pour dériver un objectif jour/semaine à partir de l'objectif mensuel.
 *  Volontairement indépendant du planning individuel de chaque conseiller, pour que le même
 *  objectif mensuel donne toujours le même objectif jour/semaine partout dans l'app (classement,
 *  dashboard manager, Accueil conseiller, page Résultats...). */
export function workingDaysRemaining(reference: Date = new Date()): number {
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    let count = 0;
    for (const d = new Date(reference); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) count++;
    }
    return Math.max(count, 1);
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
