import { describe, it, expect } from "vitest";
import { calculerMatrice, MatriceConfig, ConseillerMatriceInput } from "./matriceObjectifs";

/**
 * Jeu d'essai du cahier des charges "matrice d'objectifs vendeurs" — vérifié contre le
 * fichier Excel d'origine (0 écart). Toute modification de la logique de calcul doit
 * continuer à reproduire exactement ces chiffres.
 */

const CONFIG: MatriceConfig = {
    objectifsBoutique: { Box: 143, Forfaits: 347, Téléphone: 342 },
    deltaProfil: { Moteur: 0.15, Solide: 0.10, "En progression": 0.07, "À accompagner": 0.05 },
    itemsLies: [
        { name: "McAfee", base: "Box", shopRate: 0.25, tauxDefaut: 0.20 },
        { name: "Assurance", base: "Téléphone", shopRate: 0.25, tauxDefaut: 0.25 },
        { name: "McAfee mobile", base: "Forfaits", shopRate: 0.05, tauxDefaut: 0.05 },
        { name: "Assurance essentielle", base: "Forfaits", shopRate: 0.10, tauxDefaut: 0.10 },
        { name: "Canal+", base: "Box", shopRate: 0.10, tauxDefaut: 0.10 },
    ],
    heuresConseiller: 7,
    heuresEquipe: 7.1,
};

function advisor(
    nom: string, jours: number,
    [box, forfaits, telephone]: (ConseillerMatriceInput["profils"][keyof ConseillerMatriceInput["profils"]] | null)[],
    [mcafee, assurance, mcafeeMobile, assuranceEss, canal]: (number | null)[]
): ConseillerMatriceInput {
    return {
        id: nom, nom, jours,
        profils: { Box: box, Forfaits: forfaits, Téléphone: telephone },
        taux: { McAfee: mcafee, Assurance: assurance, "McAfee mobile": mcafeeMobile, "Assurance essentielle": assuranceEss, "Canal+": canal },
    };
}

const ADVISORS: ConseillerMatriceInput[] = [
    advisor("Andrea", 20, ["Solide", "Moteur", "Moteur"], [.25, .25, .08, .10, .10]),
    advisor("Esteban", 18, ["Moteur", "Moteur", "Moteur"], [.35, .25, .10, .10, .10]),
    advisor("Julie", 19, ["En progression", "En progression", "En progression"], [.20, .25, .05, .10, .10]),
    advisor("Dylan", 17, ["Moteur", "Moteur", "Moteur"], [.35, .28, .10, .10, .10]),
    advisor("Hadil", 19, ["À accompagner", "À accompagner", "À accompagner"], [.15, .25, .05, .10, .10]),
    advisor("Stéphane", 22, ["À accompagner", "À accompagner", "À accompagner"], [.15, .25, .05, .10, .10]),
    advisor("Pauline", 13, ["À accompagner", "En progression", null], [.10, null, .05, null, .10]),
];

describe("calculerMatrice — jeu d'essai (7 conseillers, vérifié vs Excel)", () => {
    const res = calculerMatrice(CONFIG, ADVISORS);
    const byName = Object.fromEntries(res.conseillers.map((c) => [c.nom, c]));

    it("jours planifiés par item", () => {
        expect(res.joursParItem.Box).toBe(128);
        expect(res.joursParItem.Forfaits).toBe(128);
        expect(res.joursParItem.Téléphone).toBe(115);
    });

    it("Andrea", () => {
        const c = byName["Andrea"];
        expect(c.final).toEqual({ Box: 25, Forfaits: 63, Téléphone: 69, McAfee: 7, Assurance: 18, "McAfee mobile": 5, "Assurance essentielle": 7, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 2, Forfaits: 8, Téléphone: 9, McAfee: 1, Assurance: 3, "McAfee mobile": 2, "Assurance essentielle": 1, "Canal+": 0 });
        expect(c.totalActesCo).toBe(197);
        expect(c.prod).toBeCloseTo(1.41, 2);
    });

    it("Esteban", () => {
        const c = byName["Esteban"];
        expect(c.final).toEqual({ Box: 24, Forfaits: 57, Téléphone: 62, McAfee: 9, Assurance: 16, "McAfee mobile": 6, "Assurance essentielle": 6, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 3, Forfaits: 8, Téléphone: 8, McAfee: 3, Assurance: 2, "McAfee mobile": 3, "Assurance essentielle": 1, "Canal+": 0 });
        expect(c.totalActesCo).toBe(183);
        expect(c.prod).toBeCloseTo(1.45, 2);
    });

    it("Julie", () => {
        const c = byName["Julie"];
        expect(c.final).toEqual({ Box: 23, Forfaits: 56, Téléphone: 61, McAfee: 5, Assurance: 16, "McAfee mobile": 3, "Assurance essentielle": 6, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 1, Forfaits: 4, Téléphone: 4, McAfee: -1, Assurance: 1, "McAfee mobile": 0, "Assurance essentielle": 0, "Canal+": 0 });
        expect(c.totalActesCo).toBe(173);
        expect(c.prod).toBeCloseTo(1.30, 2);
    });

    it("Dylan", () => {
        const c = byName["Dylan"];
        expect(c.final).toEqual({ Box: 22, Forfaits: 53, Téléphone: 59, McAfee: 8, Assurance: 17, "McAfee mobile": 6, "Assurance essentielle": 6, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 3, Forfaits: 6, Téléphone: 8, McAfee: 3, Assurance: 4, "McAfee mobile": 3, "Assurance essentielle": 1, "Canal+": 1 });
        expect(c.totalActesCo).toBe(174);
        expect(c.prod).toBeCloseTo(1.46, 2);
    });

    it("Hadil", () => {
        const c = byName["Hadil"];
        expect(c.final).toEqual({ Box: 23, Forfaits: 55, Téléphone: 60, McAfee: 4, Assurance: 15, "McAfee mobile": 3, "Assurance essentielle": 6, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 1, Forfaits: 3, Téléphone: 3, McAfee: -2, Assurance: 0, "McAfee mobile": 0, "Assurance essentielle": 0, "Canal+": 0 });
        expect(c.totalActesCo).toBe(169);
        expect(c.prod).toBeCloseTo(1.27, 2);
    });

    it("Stéphane", () => {
        const c = byName["Stéphane"];
        expect(c.final).toEqual({ Box: 26, Forfaits: 63, Téléphone: 69, McAfee: 4, Assurance: 18, "McAfee mobile": 4, "Assurance essentielle": 7, "Canal+": 3 });
        expect(c.diff).toEqual({ Box: 1, Forfaits: 3, Téléphone: 3, McAfee: -3, Assurance: 1, "McAfee mobile": 1, "Assurance essentielle": 1, "Canal+": 0 });
        expect(c.totalActesCo).toBe(194);
        expect(c.prod).toBeCloseTo(1.26, 2);
    });

    it("Pauline (pas de profil Téléphone → pas d'Assurance ni d'Assurance essentielle)", () => {
        const c = byName["Pauline"];
        expect(c.final).toEqual({ Box: 16, Forfaits: 38, McAfee: 2, "McAfee mobile": 2, "Canal+": 2 });
        expect(c.diff).toEqual({ Box: 1, Forfaits: 2, McAfee: -2, "McAfee mobile": 0, "Canal+": 0 });
        expect(c.totalActesCo).toBe(60);
        expect(c.prod).toBeCloseTo(0.66, 2);
    });

    it("totaux équipe", () => {
        expect(res.totalEquipe).toEqual({
            Box: 159, Forfaits: 385, Téléphone: 380,
            McAfee: 39, Assurance: 100, "McAfee mobile": 29, "Assurance essentielle": 38, "Canal+": 20,
        });
        expect(res.totalActesEquipe).toBe(1150);
        expect(res.prodEquipe).toBeCloseTo(1.27, 2);
    });

    it("objectif boutique (items liés arrondis à l'unité sup.)", () => {
        expect(res.objectifBoutique).toEqual({
            Box: 143, Forfaits: 347, Téléphone: 342,
            McAfee: 36, Assurance: 86, "McAfee mobile": 18, "Assurance essentielle": 35, "Canal+": 15,
        });
        expect(res.totalActesBoutique).toBe(1022);
    });
});
