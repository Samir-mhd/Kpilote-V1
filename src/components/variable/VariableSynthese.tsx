"use client";

import { useEffect, useMemo, useState } from "react";
import {
    calculerVariableConseiller,
    VenteConseiller,
    BoostData,
    BaremeVariable,
    BonusManuel,
    BonusVolumes,
} from "@/services/variableConseiller";
import { getJoursTravail } from "@/services/planningService";
import { getMissionsCompletes } from "@/services/missionsReelles";

/**
 * "Ma variable" mise en avant (variante &variable=v2) : montant acquis,
 * et surtout la variable "tous tes objectifs atteints" avec ce qu'il reste à vendre pour y arriver.
 * Tous les montants passent par calculerVariableConseiller (le vrai barème) ; box / assurances /
 * McAfee manquants sont valorisés à part, payés plus tard (M+1 / M+2).
 */

type Props = {
    conseillerId: string;
    mois: string;                 // "YYYY-MM-01"
    ventes: VenteConseiller;      // avec taux_presence
    boost: BoostData;
    bareme: BaremeVariable;
    bonusManuels: BonusManuel[];
    bonusVolumes: BonusVolumes;
    totalExtra: number;           // contributions déjà figées payées ce mois (box M+2, 4P, assurance M+1)
};

// Volumes du mois qui suivent le rythme de vente. Exclus : box / assurance / McAfee (payés plus
// tard), notes SatisFD et présence.
const CHAMPS_RYTHME: (keyof VenteConseiller)[] = [
    "forfait_free_serie", "forfait_free_max", "migration_2e_vers_free_serie", "migration_vers_free_max",
    "smartphones", "cross_sell_4p", "migration_adsl_fibre", "actes_ast_box",
    "lead_box", "lead_forfait", "lead_coms_pro", "canal_option1", "canal_option2", "canal_option3",
];

// Objectifs qui comptent dans la variable (nom de mission → emoji / libellé).
const OBJECTIFS_VARIABLE: { produit: string; emoji: string; libelle: (n: number) => string }[] = [
    { produit: "Box", emoji: "💻", libelle: () => "box" },
    { produit: "Forfaits", emoji: "📶", libelle: (n) => `forfait${n > 1 ? "s" : ""}` },
    { produit: "Téléphones", emoji: "📲", libelle: (n) => `smartphone${n > 1 ? "s" : ""}` },
    { produit: "Assurance", emoji: "🛟", libelle: (n) => `assurance${n > 1 ? "s" : ""}` },
    { produit: "Assurance Essentielle", emoji: "⛑️", libelle: (n) => `assurance${n > 1 ? "s" : ""} essentielle${n > 1 ? "s" : ""}` },
    { produit: "McAfee", emoji: "🔒", libelle: () => "McAfee" },
];

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function VariableSynthese({ conseillerId, mois, ventes, boost, bareme, bonusManuels, bonusVolumes, totalExtra }: Props) {
    const [jours, setJours] = useState<{ travailles: number; restants: number } | null>(null);
    const [objectifs, setObjectifs] = useState<Record<string, { realise: number; objectif: number }>>({});

    useEffect(() => {
        if (!conseillerId) return;
        const [y, m] = mois.split("-").map(Number);
        getJoursTravail(conseillerId, y, m).then(setJours).catch(() => setJours(null));
        getMissionsCompletes(conseillerId).then((ms) => {
            const r: Record<string, { realise: number; objectif: number }> = {};
            ms.forEach((x) => { r[x.produit] = { realise: x.realise, objectif: x.objectifMensuel }; });
            setObjectifs(r);
        }).catch(() => setObjectifs({}));
    }, [conseillerId, mois]);

    const calc = (v: VenteConseiller, vol: BonusVolumes = bonusVolumes) =>
        calculerVariableConseiller(v, boost, bareme, bonusManuels, vol).total;

    const acquis = useMemo(() => calc(ventes) + totalExtra, [ventes, boost, bareme, bonusManuels, bonusVolumes, totalExtra]); // eslint-disable-line react-hooks/exhaustive-deps

    // Volumes projetés en fin de mois (sert au scénario « tous tes objectifs atteints ») : volumes du mois × (jours planifiés du mois / jours déjà travaillés).
    const projete = useMemo(() => {
        if (!jours || jours.travailles <= 0) return null;
        const facteur = (jours.travailles + jours.restants) / jours.travailles;
        const v = { ...ventes };
        CHAMPS_RYTHME.forEach((k) => { v[k] = Math.round((ventes[k] as number) * facteur); });
        const vol: BonusVolumes = {};
        Object.entries(bonusVolumes).forEach(([id, n]) => { vol[id] = Math.round(n * facteur); });
        return { v, vol };
    }, [jours, ventes, bonusVolumes]);


    const manque = (produit: string) => {
        const o = objectifs[produit];
        return o ? Math.max(o.objectif - o.realise, 0) : 0;
    };

    // Scénario "tous tes objectifs atteints" : la projection, avec forfaits et smartphones portés au
    // moins à l'objectif du mois (payés ce mois) ; box / assurances / McAfee manquants payés plus tard.
    const scenario = useMemo(() => {
        const objectifDe = (produit: string) => objectifs[produit]?.objectif ?? 0;
        const v = { ...(projete?.v ?? ventes) };
        const forfaits = v.forfait_free_serie + v.forfait_free_max;
        v.forfait_free_serie += Math.max(objectifDe("Forfaits") - forfaits, 0);
        v.smartphones = Math.max(v.smartphones, objectifDe("Téléphones"));
        const ceMois = calc(v, projete?.vol ?? bonusVolumes) + totalExtra;
        const aVenir =
            manque("Box") * bareme.box_pop +
            manque("Assurance") * bareme.assurance_nouveau_mobile +
            manque("Assurance Essentielle") * bareme.assurance_essentielle +
            manque("McAfee") * bareme.mcafee_699;
        return { ceMois, aVenir };
    }, [objectifs, projete, ventes, boost, bareme, bonusManuels, bonusVolumes, totalExtra]); // eslint-disable-line react-hooks/exhaustive-deps

    const restants = OBJECTIFS_VARIABLE
        .map((o) => ({ ...o, n: manque(o.produit), avecObjectif: (objectifs[o.produit]?.objectif ?? 0) > 0 }))
        .filter((o) => o.avecObjectif && o.n > 0);
    const objectifsCharges = Object.keys(objectifs).length > 0;

    const nomDuMois = new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "long" });

    const totalObjectifs = scenario.ceMois + scenario.aVenir;
    const pctAcquis = totalObjectifs > 0 ? Math.min(100, (acquis / totalObjectifs) * 100) : 0;
    const pctRepere = totalObjectifs > 0 ? Math.min(100, (scenario.ceMois / totalObjectifs) * 100) : 0;

    // Une seule jauge : acquis à ce jour → variable avec tous les objectifs atteints.
    return (
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-700 via-fuchsia-700 to-violet-900 p-6 text-white shadow-[0_20px_60px_rgba(124,58,237,.30)] sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/70">Ta variable de {nomDuMois} · acquis à ce jour</p>
                        <p className="mt-1 text-5xl font-black tabular-nums sm:text-6xl">{fmtEuro(acquis)}</p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200">🎯 Avec tous tes objectifs</p>
                        <p className="mt-1 text-3xl font-black tabular-nums text-amber-300 sm:text-4xl">{objectifsCharges ? fmtEuro(totalObjectifs) : "…"}</p>
                    </div>
                </div>

                <div
                    className="relative mt-6 h-5 rounded-full bg-white/15"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pctAcquis)}
                    aria-label="Part de la variable possible déjà acquise"
                >
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width] duration-700" style={{ width: `${pctAcquis}%` }} />
                    {scenario.aVenir > 0 && <div className="absolute -top-1 h-7 w-[2px] bg-white/70" style={{ left: `${pctRepere}%` }} />}
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] font-bold text-white/70">
                    <span>{Math.round(pctAcquis)} % du possible</span>
                    {objectifsCharges && (
                        <span>
                            {scenario.aVenir > 0 ? "Repère : " : ""}{fmtEuro(scenario.ceMois)} en {nomDuMois}
                            {scenario.aVenir > 0 && <> · +{fmtEuro(scenario.aVenir)} payés les mois suivants (box, assurances, McAfee)</>}
                        </span>
                    )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    {!objectifsCharges ? (
                        <span className="text-sm font-semibold text-white/70">…</span>
                    ) : restants.length === 0 ? (
                        <span className="text-sm font-black">🎉 Tous tes objectifs du mois sont atteints !</span>
                    ) : (
                        <>
                            <span className="text-xs font-black uppercase tracking-wider text-white/70">Il te reste :</span>
                            {restants.map((o) => (
                                <span key={o.produit} className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-black ring-1 ring-white/20">
                                    <span aria-hidden="true">{o.emoji}</span> {o.n} {o.libelle(o.n)}
                                </span>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
