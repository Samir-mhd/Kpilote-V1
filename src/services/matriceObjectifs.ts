/**
 * Matrice d'objectifs vendeurs — reproduit exactement le calcul du fichier Excel
 * `matrice_objectifs_vendeurs.xlsx`. Fonction pure : testée contre le jeu d'essai
 * dans matriceObjectifs.test.ts (0 écart attendu).
 */

export const ITEMS_PRINCIPAUX = ["Box", "Forfaits", "Téléphone"] as const;
export type ItemPrincipal = typeof ITEMS_PRINCIPAUX[number];

export const PROFILS = ["Moteur", "Solide", "En progression", "À accompagner"] as const;
export type Profil = typeof PROFILS[number];

export type ItemLieConfig = {
    name: string;
    base: ItemPrincipal;
    shopRate: number;
    tauxDefaut: number;
};

export type MatriceConfig = {
    objectifsBoutique: Record<ItemPrincipal, number>;
    deltaProfil: Record<Profil, number>;
    itemsLies: ItemLieConfig[];
    heuresConseiller: number;
    heuresEquipe: number;
    joursForces?: Partial<Record<ItemPrincipal, number | null>>;
};

export type ConseillerMatriceInput = {
    id: string;
    nom: string;
    jours: number;
    profils: Partial<Record<ItemPrincipal, Profil | null>>;
    taux: Record<string, number | null | undefined>;
};

export type ResultatConseiller = {
    id: string;
    nom: string;
    jours: number;
    base: Record<string, number>;
    final: Record<string, number>;
    diff: Record<string, number>;
    totalActesCo: number;
    prod: number;
};

export type ResultatMatrice = {
    joursParItem: Record<ItemPrincipal, number>;
    actesParJour: Record<ItemPrincipal, number>;
    conseillers: ResultatConseiller[];
    totalEquipe: Record<string, number>;
    objectifBoutique: Record<string, number>;
    ecart: Record<string, number>;
    ecartPct: Record<string, number | null>;
    totalActesEquipe: number;
    totalActesBoutique: number;
    prodEquipe: number;
};

/** Arrondi à l'unité supérieure, tolérant aux erreurs de virgule flottante (≈ ROUNDUP(ROUND(x,6),0)). */
function arrondiUnite(x: number): number {
    return Math.ceil(Math.round(x * 1e6) / 1e6);
}

export function calculerMatrice(config: MatriceConfig, conseillers: ConseillerMatriceInput[]): ResultatMatrice {
    const { objectifsBoutique, deltaProfil, itemsLies, heuresConseiller, heuresEquipe, joursForces } = config;

    // 1. Jours planifiés par item principal = jours des conseillers qui ont un profil sur cet item.
    const joursParItem = {} as Record<ItemPrincipal, number>;
    for (const item of ITEMS_PRINCIPAUX) {
        const force = joursForces?.[item];
        joursParItem[item] = force != null
            ? force
            : conseillers.filter((c) => c.profils[item]).reduce((t, c) => t + c.jours, 0);
    }

    // 2. Actes par jour du conseiller classique.
    const actesParJour = {} as Record<ItemPrincipal, number>;
    for (const item of ITEMS_PRINCIPAUX) {
        actesParJour[item] = joursParItem[item] > 0 ? objectifsBoutique[item] / joursParItem[item] : NaN;
    }

    const resultats: ResultatConseiller[] = conseillers.map((c) => {
        const base: Record<string, number> = {};
        const raw: Record<string, number> = {};

        // 3. Items principaux.
        for (const item of ITEMS_PRINCIPAUX) {
            const profil = c.profils[item];
            if (!profil || !isFinite(actesParJour[item])) continue;
            const b = actesParJour[item] * c.jours;
            base[item] = b;
            raw[item] = b * (1 + deltaProfil[profil]);
        }

        // 4. Items liés.
        for (const lie of itemsLies) {
            const taux = c.taux[lie.name];
            if (taux == null || !(lie.base in raw)) continue;
            base[lie.name] = lie.shopRate * base[lie.base];
            raw[lie.name] = taux * raw[lie.base];
        }

        // 5. Arrondi unique, à l'unité supérieure, sur le résultat final.
        const final: Record<string, number> = {};
        const diff: Record<string, number> = {};
        for (const [k, r] of Object.entries(raw)) {
            final[k] = arrondiUnite(r);
            diff[k] = final[k] - arrondiUnite(base[k]);
        }

        const totalActesCo = Object.values(final).reduce((t, v) => t + v, 0);
        const prod = c.jours > 0 ? totalActesCo / (c.jours * heuresConseiller) : 0;

        return { id: c.id, nom: c.nom, jours: c.jours, base, final, diff, totalActesCo, prod };
    });

    // 6. Totaux équipe et objectifs boutique.
    const items = [...ITEMS_PRINCIPAUX, ...itemsLies.map((l) => l.name)];
    const totalEquipe: Record<string, number> = {};
    items.forEach((k) => {
        totalEquipe[k] = resultats.reduce((t, r) => t + (r.final[k] ?? 0), 0);
    });

    const objectifBoutique: Record<string, number> = { ...objectifsBoutique };
    itemsLies.forEach((l) => {
        objectifBoutique[l.name] = arrondiUnite(l.shopRate * objectifsBoutique[l.base]);
    });

    const ecart: Record<string, number> = {};
    const ecartPct: Record<string, number | null> = {};
    items.forEach((k) => {
        ecart[k] = totalEquipe[k] - objectifBoutique[k];
        ecartPct[k] = objectifBoutique[k] ? ecart[k] / objectifBoutique[k] : null;
    });

    const totalActesEquipe = Object.values(totalEquipe).reduce((t, v) => t + v, 0);
    const totalActesBoutique = Object.values(objectifBoutique).reduce((t, v) => t + v, 0);
    const joursEquipe = conseillers.reduce((t, c) => t + c.jours, 0);
    const prodEquipe = joursEquipe > 0 ? totalActesEquipe / (joursEquipe * heuresEquipe) : 0;

    return {
        joursParItem, actesParJour, conseillers: resultats,
        totalEquipe, objectifBoutique, ecart, ecartPct,
        totalActesEquipe, totalActesBoutique, prodEquipe,
    };
}
