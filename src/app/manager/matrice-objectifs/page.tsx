"use client";

import { useEffect, useMemo, useState } from "react";

import {
    getMoisMatriceDisponibles, getOuCreerMatriceConfig, mettreAJourMatriceConfig,
    versConfigCalcul, getConseillersActifs, getMatriceConseillers, upsertMatriceConseiller,
    versConseillerCalcul, moisCourantISO, appliquerMatriceVersObjectifsConseiller,
    MatriceConfigRow, MatriceConseillerRow, ConseillerActif,
} from "@/services/matriceObjectifsData";
import { calculerMatrice, ITEMS_PRINCIPAUX, PROFILS, Profil, ItemLieConfig } from "@/services/matriceObjectifs";
import { getJoursTravailTous } from "@/services/planningService";

function nomMoisFr(moisISO: string): string {
    const [y, m] = moisISO.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function moisSuivant(moisISO: string, delta: number): string {
    const [y, m] = moisISO.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const LIGNE_VIDE: Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id"> = {
    jours: 0, profil_box: null, profil_forfaits: null, profil_telephone: null,
    taux_mcafee: null, taux_assurance: null, taux_mcafee_mobile: null, taux_assurance_essentielle: null, taux_canal: null,
};

function pct(x: number | null): string {
    return x === null || x === undefined ? "" : String(Math.round(x * 1000) / 10);
}
function pctVersFraction(valeur: string): number | null {
    if (valeur.trim() === "") return null;
    const n = Number(valeur.replace(",", "."));
    return isNaN(n) ? null : n / 100;
}

function Cellule({ final, diff }: { final?: number; diff?: number }) {
    if (final === undefined) return <span className="text-slate-300">–</span>;
    const signe = diff !== undefined && diff > 0 ? "+" : "";
    return (
        <span className="font-black text-slate-800">
            {final}
            {diff !== undefined && (
                <span className={`ml-1 text-[11px] font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-slate-400"}`}>
                    ({signe}{diff})
                </span>
            )}
        </span>
    );
}

export default function MatriceObjectifsPage() {
    const [mois, setMois] = useState(moisCourantISO());
    const [moisDispo, setMoisDispo] = useState<string[]>([]);
    const [config, setConfig] = useState<MatriceConfigRow | null>(null);
    const [conseillers, setConseillers] = useState<ConseillerActif[]>([]);
    const [lignes, setLignes] = useState<Record<string, Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">>>({});
    const [edits, setEdits] = useState<Record<string, Partial<Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">>>>({});
    const [configEdits, setConfigEdits] = useState<Partial<MatriceConfigRow>>({});
    const [loading, setLoading] = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);
    const [application, setApplication] = useState(false);
    const [confirmation, setConfirmation] = useState<string | null>(null);

    async function charger(m: string) {
        setLoading(true);
        setConfirmation(null);
        const [moisListe, cfg, cons, lignesDb] = await Promise.all([
            getMoisMatriceDisponibles(),
            getOuCreerMatriceConfig(m),
            getConseillersActifs(),
            getMatriceConseillers(m),
        ]);

        const map: Record<string, Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">> = {};
        lignesDb.forEach((r) => { map[r.conseiller_id] = r; });

        const idsSansSaisie = cons.filter((c) => !map[c.id]).map((c) => c.id);
        if (idsSansSaisie.length > 0) {
            const [y, mm] = m.split("-").map(Number);
            const jours = await getJoursTravailTous(idsSansSaisie, y, mm).catch(() => ({} as Record<string, number>));
            idsSansSaisie.forEach((id) => {
                map[id] = { ...LIGNE_VIDE, jours: jours[id] ?? 0 };
            });
        }

        setMoisDispo(moisListe.includes(m) ? moisListe : [m, ...moisListe].sort().reverse());
        setConfig(cfg);
        setConseillers(cons);
        setLignes(map);
        setEdits({});
        setConfigEdits({});
        setLoading(false);
    }

    useEffect(() => { charger(mois); }, [mois]);

    const itemsLiesEffectifs: ItemLieConfig[] = configEdits.items_lies ?? config?.items_lies ?? [];

    function appliquerEditConfig(patch: Partial<MatriceConfigRow>) {
        setConfigEdits((prev) => ({ ...prev, ...patch }));
    }

    function changerItemLie(index: number, patch: Partial<ItemLieConfig>) {
        const base = itemsLiesEffectifs.map((it, i) => (i === index ? { ...it, ...patch } : it));
        appliquerEditConfig({ items_lies: base });
    }

    function changerLigne(conseillerId: string, patch: Partial<Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">>) {
        setEdits((prev) => ({ ...prev, [conseillerId]: { ...prev[conseillerId], ...patch } }));
    }

    const resultat = useMemo(() => {
        if (!config) return null;
        const configCalcul = versConfigCalcul({ ...config, ...configEdits, items_lies: itemsLiesEffectifs });
        const conseillersCalcul = conseillers.map((c) => {
            const ligne = { ...lignes[c.id], ...edits[c.id] } as MatriceConseillerRow;
            return versConseillerCalcul(c.nom, { ...ligne, id: "", mois, conseiller_id: c.id }, itemsLiesEffectifs);
        });
        return calculerMatrice(configCalcul, conseillersCalcul);
    }, [config, configEdits, itemsLiesEffectifs, conseillers, lignes, edits, mois]);

    const aDesModifications = Object.keys(edits).length > 0 || Object.keys(configEdits).length > 0;

    async function enregistrer() {
        if (!config) return;
        setEnregistrement(true);
        try {
            if (Object.keys(configEdits).length > 0) {
                await mettreAJourMatriceConfig(config.id, configEdits);
            }
            await Promise.all(
                Object.keys(edits).map((conseillerId) => {
                    // Envoie la ligne complète (valeurs pré-remplies incluses), pas seulement les champs
                    // touchés : sinon des jours pré-remplis depuis le planning mais jamais édités à la
                    // main seraient écrasés à 0 par l'upsert.
                    const ligneComplete = { ...lignes[conseillerId], ...edits[conseillerId] };
                    return upsertMatriceConseiller(mois, conseillerId, ligneComplete);
                })
            );
            setConfirmation("Matrice enregistrée.");
            await charger(mois);
        } finally {
            setEnregistrement(false);
        }
    }

    async function appliquerVersObjectifs() {
        if (!resultat) return;
        setApplication(true);
        try {
            await appliquerMatriceVersObjectifsConseiller(resultat);
            setConfirmation("Objectifs conseiller mis à jour à partir de la matrice.");
        } finally {
            setApplication(false);
        }
    }

    if (loading || !config || !resultat) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center text-slate-400 font-semibold">
                Chargement...
            </main>
        );
    }

    const objBox = configEdits.objectif_box ?? config.objectif_box;
    const objForfaits = configEdits.objectif_forfaits ?? config.objectif_forfaits;
    const objTelephone = configEdits.objectif_telephone ?? config.objectif_telephone;
    const deltaMoteur = configEdits.delta_moteur ?? config.delta_moteur;
    const deltaSolide = configEdits.delta_solide ?? config.delta_solide;
    const deltaProgression = configEdits.delta_progression ?? config.delta_progression;
    const deltaAccompagner = configEdits.delta_accompagner ?? config.delta_accompagner;
    const heuresConseiller = configEdits.heures_conseiller ?? config.heures_conseiller;
    const heuresEquipe = configEdits.heures_equipe ?? config.heures_equipe;

    const itemsAffichage = [...ITEMS_PRINCIPAUX, ...itemsLiesEffectifs.map((l) => l.name)];

    return (
        <main>
            <p className="text-emerald-600 font-black uppercase tracking-[0.35em]">KPILOTE MANAGER</p>

            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Matrice objectifs</h1>
                    <p className="mt-4 max-w-2xl text-lg text-slate-500">
                        Répartit l&apos;objectif boutique entre conseillers selon leur profil (Moteur, Solide, En progression, À accompagner) — remplace la matrice Excel, avec le même calcul.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMois((m) => moisSuivant(m, -1))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-50"
                    >
                        ←
                    </button>
                    <select
                        value={mois}
                        onChange={(e) => setMois(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800"
                    >
                        {(moisDispo.includes(mois) ? moisDispo : [mois, ...moisDispo]).map((m) => (
                            <option key={m} value={m}>{nomMoisFr(m)}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setMois((m) => moisSuivant(m, 1))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-50"
                    >
                        →
                    </button>
                </div>
            </div>

            {confirmation && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                    {confirmation}
                </div>
            )}

            {/* ── Paramètres ─────────────────────────────────────────────── */}
            <div className="mt-8 rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-[0_16px_48px_rgba(15,23,42,.35)]">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">Paramètres du mois</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {([
                        ["Objectif Box", objBox, (v: number) => appliquerEditConfig({ objectif_box: v })],
                        ["Objectif Forfaits", objForfaits, (v: number) => appliquerEditConfig({ objectif_forfaits: v })],
                        ["Objectif Téléphone", objTelephone, (v: number) => appliquerEditConfig({ objectif_telephone: v })],
                    ] as const).map(([label, val, set]) => (
                        <label key={label} className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">{label}</span>
                            <input
                                type="number" min={0} value={val}
                                onChange={(e) => set(Number(e.target.value))}
                                className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-base font-black text-white outline-none focus:border-emerald-400"
                            />
                        </label>
                    ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {([
                        ["Moteur", deltaMoteur, (v: number) => appliquerEditConfig({ delta_moteur: v })],
                        ["Solide", deltaSolide, (v: number) => appliquerEditConfig({ delta_solide: v })],
                        ["En progression", deltaProgression, (v: number) => appliquerEditConfig({ delta_progression: v })],
                        ["À accompagner", deltaAccompagner, (v: number) => appliquerEditConfig({ delta_accompagner: v })],
                    ] as const).map(([label, val, set]) => (
                        <label key={label} className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">Écart {label}</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number" step={0.5} value={Math.round(val * 1000) / 10}
                                    onChange={(e) => set(Number(e.target.value) / 100)}
                                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-base font-black text-white outline-none focus:border-emerald-400"
                                />
                                <span className="text-sm font-bold text-white/40">%</span>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">Heures / jour — conseiller</span>
                        <input
                            type="number" step={0.1} value={heuresConseiller}
                            onChange={(e) => appliquerEditConfig({ heures_conseiller: Number(e.target.value) })}
                            className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-base font-black text-white outline-none focus:border-emerald-400"
                        />
                    </label>
                    <label className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">Heures / jour — équipe</span>
                        <input
                            type="number" step={0.1} value={heuresEquipe}
                            onChange={(e) => appliquerEditConfig({ heures_equipe: Number(e.target.value) })}
                            className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-base font-black text-white outline-none focus:border-emerald-400"
                        />
                    </label>
                </div>

                {/* Items liés */}
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400">Items liés</p>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm text-white">
                        <thead>
                            <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-white/40">
                                <th className="pb-2 pr-3">Item</th>
                                <th className="pb-2 pr-3">Base</th>
                                <th className="pb-2 pr-3">Taux boutique</th>
                                <th className="pb-2 pr-3">Taux conseiller (défaut)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsLiesEffectifs.map((item, i) => (
                                <tr key={item.name} className="border-t border-white/10">
                                    <td className="py-2 pr-3 font-black">{item.name}</td>
                                    <td className="py-2 pr-3">
                                        <select
                                            value={item.base}
                                            onChange={(e) => changerItemLie(i, { base: e.target.value as ItemLieConfig["base"] })}
                                            className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1 font-bold"
                                        >
                                            {ITEMS_PRINCIPAUX.map((it) => <option key={it} value={it}>{it}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number" step={1} value={Math.round(item.shopRate * 1000) / 10}
                                                onChange={(e) => changerItemLie(i, { shopRate: Number(e.target.value) / 100 })}
                                                className="w-16 rounded-lg border border-white/15 bg-slate-950 px-2 py-1 font-bold"
                                            />
                                            <span className="text-white/40">%</span>
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number" step={1} value={Math.round(item.tauxDefaut * 1000) / 10}
                                                onChange={(e) => changerItemLie(i, { tauxDefaut: Number(e.target.value) / 100 })}
                                                className="w-16 rounded-lg border border-white/15 bg-slate-950 px-2 py-1 font-bold"
                                            />
                                            <span className="text-white/40">%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Référence conseiller classique ───────────────────────────── */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {ITEMS_PRINCIPAUX.map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item} — conseiller classique</p>
                        <p className="mt-1 text-sm text-slate-600">
                            {resultat.joursParItem[item]} jours planifiés · {isFinite(resultat.actesParJour[item]) ? resultat.actesParJour[item].toFixed(2) : "—"} actes/jour
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Saisie conseillers ───────────────────────────────────────── */}
            <div className="mt-8 overflow-x-auto rounded-[28px] border border-slate-200 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-violet-500">Saisie par conseiller</p>
                <table className="mt-3 w-full min-w-[980px] text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <th className="py-2 pr-3">Conseiller</th>
                            <th className="py-2 pr-3">Jours</th>
                            {ITEMS_PRINCIPAUX.map((it) => <th key={it} className="py-2 pr-3">{it}</th>)}
                            {itemsLiesEffectifs.map((l) => <th key={l.name} className="py-2 pr-3">{l.name}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {conseillers.map((c) => {
                            const ligne = { ...lignes[c.id], ...edits[c.id] } as Omit<MatriceConseillerRow, "id" | "mois" | "conseiller_id">;
                            return (
                                <tr key={c.id} className="border-t border-slate-100">
                                    <td className="py-2 pr-3 font-black text-slate-800">{c.nom}</td>
                                    <td className="py-2 pr-3">
                                        <input
                                            type="number" min={0} value={ligne.jours}
                                            onChange={(e) => changerLigne(c.id, { jours: Number(e.target.value) })}
                                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center font-bold"
                                        />
                                    </td>
                                    {([
                                        ["profil_box", ligne.profil_box],
                                        ["profil_forfaits", ligne.profil_forfaits],
                                        ["profil_telephone", ligne.profil_telephone],
                                    ] as const).map(([champ, valeur]) => (
                                        <td key={champ} className="py-2 pr-3">
                                            <select
                                                value={valeur ?? ""}
                                                onChange={(e) => changerLigne(c.id, { [champ]: (e.target.value || null) as Profil | null })}
                                                className="rounded-lg border border-slate-200 px-2 py-1 font-semibold"
                                            >
                                                <option value="">— aucun —</option>
                                                {PROFILS.map((p) => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </td>
                                    ))}
                                    {itemsLiesEffectifs.map((item) => {
                                        const colonne = (
                                            { "McAfee": "taux_mcafee", "Assurance": "taux_assurance", "McAfee mobile": "taux_mcafee_mobile", "Assurance essentielle": "taux_assurance_essentielle", "Canal+": "taux_canal" } as Record<string, keyof typeof LIGNE_VIDE>
                                        )[item.name];
                                        const valeur = colonne ? ligne[colonne] : null;
                                        return (
                                            <td key={item.name} className="py-2 pr-3">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number" step={1}
                                                        value={pct(valeur as number | null)}
                                                        placeholder="—"
                                                        onChange={(e) => colonne && changerLigne(c.id, { [colonne]: pctVersFraction(e.target.value) })}
                                                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center font-bold"
                                                    />
                                                    <span className="text-slate-400">%</span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <button
                    onClick={enregistrer}
                    disabled={!aDesModifications || enregistrement}
                    className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(16,185,129,.25)] transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:w-auto sm:px-8"
                >
                    {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
            </div>

            {/* ── Résultats ─────────────────────────────────────────────────── */}
            <div className="mt-8 overflow-x-auto rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-violet-500">Objectifs calculés</p>
                    <button
                        onClick={appliquerVersObjectifs}
                        disabled={application}
                        title="Écrit ces 8 objectifs (Box, Forfaits, Téléphone, McAfee, Assurance, McAfee mobile, Assurance essentielle, Canal+) dans Objectifs conseiller, pour chaque conseiller listé ci-dessous."
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-xs font-black text-white shadow-sm transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {application ? "Application..." : "Appliquer vers Objectifs conseiller"}
                    </button>
                </div>
                <table className="mt-3 w-full min-w-[1100px] text-sm">
                    <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <th className="py-2 pr-3">Conseiller</th>
                            {itemsAffichage.map((it) => <th key={it} className="py-2 pr-3">{it}</th>)}
                            <th className="py-2 pr-3">Total actes co</th>
                            <th className="py-2 pr-3">Prod</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resultat.conseillers.map((c) => (
                            <tr key={c.id} className="border-t border-slate-100">
                                <td className="py-2 pr-3 font-black text-slate-800">{c.nom}</td>
                                {itemsAffichage.map((it) => (
                                    <td key={it} className="py-2 pr-3">
                                        <Cellule final={c.final[it]} diff={c.diff[it]} />
                                    </td>
                                ))}
                                <td className="py-2 pr-3 font-black text-violet-700">{c.totalActesCo}</td>
                                <td className="py-2 pr-3 font-bold text-slate-500">{c.prod.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-200 font-black text-slate-800">
                            <td className="py-2 pr-3">Total équipe</td>
                            {itemsAffichage.map((it) => (
                                <td key={it} className="py-2 pr-3">{resultat.totalEquipe[it]}</td>
                            ))}
                            <td className="py-2 pr-3 text-violet-700">{resultat.totalActesEquipe}</td>
                            <td className="py-2 pr-3 text-slate-500">{resultat.prodEquipe.toFixed(2)}</td>
                        </tr>
                        <tr className="text-slate-500">
                            <td className="py-2 pr-3 font-bold">Objectif boutique</td>
                            {itemsAffichage.map((it) => (
                                <td key={it} className="py-2 pr-3">{resultat.objectifBoutique[it]}</td>
                            ))}
                            <td className="py-2 pr-3">{resultat.totalActesBoutique}</td>
                            <td className="py-2 pr-3">—</td>
                        </tr>
                        <tr className="text-emerald-600">
                            <td className="py-2 pr-3 font-bold">Écart (volume / %)</td>
                            {itemsAffichage.map((it) => (
                                <td key={it} className="py-2 pr-3">
                                    {resultat.ecart[it] > 0 ? "+" : ""}{resultat.ecart[it]}
                                    {resultat.ecartPct[it] !== null && (
                                        <span className="ml-1 text-[11px] text-slate-400">
                                            ({resultat.ecartPct[it]! > 0 ? "+" : ""}{Math.round(resultat.ecartPct[it]! * 1000) / 10}%)
                                        </span>
                                    )}
                                </td>
                            ))}
                            <td className="py-2 pr-3" />
                            <td className="py-2 pr-3" />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </main>
    );
}
