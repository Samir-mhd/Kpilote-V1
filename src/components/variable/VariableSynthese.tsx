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
 * "Ma variable" mise en avant (variante &variable=v2) : montant du mois, projection à ton rythme,
 * scénario "objectifs atteints", et leviers chiffrés ("Encore 3 POP → +X €"). Tous les montants
 * passent par calculerVariableConseiller (le vrai barème) ; les produits payés plus tard (box M+2,
 * assurance M+1, McAfee M+2) sont affichés avec leur mois de paiement.
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

// Volumes du mois qui suivent le rythme de vente (synchronisés depuis l'Accueil ou déclarés au fil
// du mois). Exclus : box / assurance / McAfee (payés plus tard), notes SatisFD et présence.
const CHAMPS_RYTHME: (keyof VenteConseiller)[] = [
    "forfait_free_serie", "forfait_free_max", "migration_2e_vers_free_serie", "migration_vers_free_max",
    "smartphones", "cross_sell_4p", "migration_adsl_fibre", "actes_ast_box",
    "lead_box", "lead_forfait", "lead_coms_pro", "canal_option1", "canal_option2", "canal_option3",
];

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function moisPlus(mois: string, delta: number) {
    const [y, m] = mois.split("-").map(Number);
    return new Date(y, m - 1 + delta, 1).toLocaleDateString("fr-FR", { month: "long" });
}

type Levier = { id: string; emoji: string; texte: string; gain: number; quand: string; note?: string };

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

    // Volumes projetés en fin de mois à ton rythme : volumes du mois × (jours planifiés du mois / jours déjà travaillés).
    const projete = useMemo(() => {
        if (!jours || jours.travailles <= 0) return null;
        const facteur = (jours.travailles + jours.restants) / jours.travailles;
        const v = { ...ventes };
        CHAMPS_RYTHME.forEach((k) => { v[k] = Math.round((ventes[k] as number) * facteur); });
        const vol: BonusVolumes = {};
        Object.entries(bonusVolumes).forEach(([id, n]) => { vol[id] = Math.round(n * facteur); });
        return { v, vol };
    }, [jours, ventes, bonusVolumes]);

    const projection = useMemo(
        () => (projete ? calc(projete.v, projete.vol) + totalExtra : null),
        [projete, boost, bareme, bonusManuels, totalExtra] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // Scénario "tous tes objectifs atteints" : la projection, avec forfaits et smartphones portés au
    // moins à l'objectif du mois (toujours ≥ projection) ; box / assurances / McAfee manquants
    // valorisés à part (payés plus tard).
    const scenarioObjectifs = useMemo(() => {
        const manque = (produit: string) => {
            const o = objectifs[produit];
            return o ? Math.max(o.objectif - o.realise, 0) : 0;
        };
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

    // Leviers : gain réel (barème + boosts) de quelques ventes de plus.
    const leviers = useMemo(() => {
        const base = calc(ventes);
        const l: Levier[] = [];
        const versSeuil = (actuel: number, seuil: number) => (seuil > 0 && actuel <= seuil && seuil - actuel + 1 <= 10 ? seuil - actuel + 1 : 3);

        const nbForfaits = ventes.forfait_free_serie + ventes.forfait_free_max;
        const kF = versSeuil(nbForfaits, bareme.seuil_forfait);
        const gF = calc({ ...ventes, forfait_free_serie: ventes.forfait_free_serie + kF }) - base;
        l.push({
            id: "forfaits", emoji: "📱", texte: `Encore ${kF} forfait${kF > 1 ? "s" : ""} Free / Série`, gain: gF, quand: "ce mois-ci",
            note: bareme.seuil_forfait > 0 && nbForfaits <= bareme.seuil_forfait && nbForfaits + kF > bareme.seuil_forfait ? "débloque le boost forfait" : undefined,
        });
        const gMax = calc({ ...ventes, forfait_free_max: ventes.forfait_free_max + 2 }) - base;
        l.push({ id: "freemax", emoji: "🚀", texte: "Encore 2 Free Max", gain: gMax, quand: "ce mois-ci" });

        const kS = versSeuil(ventes.smartphones, bareme.seuil_smartphone);
        const gS = calc({ ...ventes, smartphones: ventes.smartphones + kS }) - base;
        l.push({
            id: "smartphones", emoji: "📲", texte: `Encore ${kS} smartphone${kS > 1 ? "s" : ""}`, gain: gS, quand: "ce mois-ci",
            note: bareme.seuil_smartphone > 0 && ventes.smartphones <= bareme.seuil_smartphone && ventes.smartphones + kS > bareme.seuil_smartphone ? "débloque le boost smartphone" : undefined,
        });

        const enM2 = `en ${moisPlus(mois, 2)}`;
        const enM1 = `en ${moisPlus(mois, 1)}`;
        l.push({ id: "pop", emoji: "📦", texte: "Encore 3 box POP", gain: 3 * bareme.box_pop, quand: enM2, note: "après raccordement, hors boosts" });
        l.push({ id: "ultra", emoji: "📦", texte: "Encore 2 box Ultra", gain: 2 * bareme.box_ultra, quand: enM2, note: "après raccordement, hors boosts" });
        l.push({ id: "assurance", emoji: "🛡️", texte: "Encore 4 assurances Nouveau Mobile", gain: 4 * bareme.assurance_nouveau_mobile, quand: enM1 });
        l.push({ id: "essentielle", emoji: "🧩", texte: "Encore 4 assurances essentielles", gain: 4 * bareme.assurance_essentielle, quand: enM1 });
        l.push({ id: "mcafee", emoji: "🛡️", texte: "Encore 3 McAfee 6,99 €", gain: 3 * bareme.mcafee_699, quand: enM2 });

        return l.filter((x) => x.gain > 0);
    }, [ventes, boost, bareme, bonusManuels, bonusVolumes, mois]); // eslint-disable-line react-hooks/exhaustive-deps

    const nomDuMois = new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)) - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
    const ceMois = leviers.filter((l) => l.quand === "ce mois-ci");
    const plusTard = leviers.filter((l) => l.quand !== "ce mois-ci");

    return (
        <div className="space-y-5">
            {/* ── Montant + scénarios ───────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-700 via-fuchsia-700 to-violet-900 p-6 text-white shadow-[0_20px_60px_rgba(124,58,237,.35)] sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/70">Ta variable de {nomDuMois}</p>
                        <p className="mt-1 text-5xl font-black tabular-nums sm:text-6xl">{fmtEuro(acquis)}</p>
                        <p className="mt-1 text-sm font-semibold text-white/70">acquis à ce jour</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:min-w-[420px]">
                        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Fin de mois à ton rythme</p>
                            <p className="mt-1 text-2xl font-black tabular-nums">{projection !== null ? fmtEuro(projection) : "…"}</p>
                            {projection !== null && projection > acquis && (
                                <p className="text-[11px] font-bold text-emerald-200">+{fmtEuro(projection - acquis)} d&apos;ici la fin du mois</p>
                            )}
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Avec tous tes objectifs atteints</p>
                            <p className="mt-1 text-2xl font-black tabular-nums">{fmtEuro(scenarioObjectifs.ceMois)}</p>
                            {scenarioObjectifs.aVenir > 0 && (
                                <p className="text-[11px] font-bold text-amber-200">+{fmtEuro(scenarioObjectifs.aVenir)} à venir (box, assurances, McAfee)</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Leviers ───────────────────────────────────────────── */}
            <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-6">
                <h2 className="text-base font-black text-slate-900">💡 Tes leviers pour augmenter ta variable</h2>
                <p className="text-xs font-semibold text-slate-400">Calculés avec le barème du mois, boosts compris.</p>

                {ceMois.length > 0 && (
                    <>
                        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-violet-600">Payé ce mois-ci</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            {ceMois.map((l) => <CarteLevier key={l.id} l={l} />)}
                        </div>
                    </>
                )}
                {plusTard.length > 0 && (
                    <>
                        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Payé plus tard</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
                            {plusTard.map((l) => <CarteLevier key={l.id} l={l} />)}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function CarteLevier({ l }: { l: Levier }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <p className="text-sm font-bold text-slate-700"><span aria-hidden="true">{l.emoji}</span> {l.texte}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-600">+{fmtEuro(l.gain)}</p>
            <p className="text-[11px] font-semibold text-slate-400">
                {l.quand === "ce mois-ci" ? "sur ta variable de ce mois" : `payé ${l.quand}`}
                {l.note && <span className="text-violet-600"> · {l.note}</span>}
            </p>
        </div>
    );
}
