"use client";

import { useEffect, useMemo, useState } from "react";
import {
    calculerVariableConseiller,
    VenteConseiller,
    BoostData,
    BaremeVariable,
    BonusManuel,
    VENTES_VIDES,
    BOOST_VIDE,
    BAREME_DEFAUT,
    getBareme,
    sauvegarderBareme,
    getBonusManuels,
    ajouterBonusManuel,
    supprimerBonusManuel,
} from "@/services/variableConseiller";
import { CATEGORIES_VENTES, NumberField, CardShell, BonusManuelsCard, BonusManuelsInline, DetailResultatsCard } from "@/components/variable/variableUi";
import { nomMois } from "@/services/boxRaccordement";

// Mois M-2 : les box payées ce mois-ci reflètent le R/O du mois où elles ont été vendues.
function moisM2Actuel(): string {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type ChampBareme = { key: Exclude<keyof BaremeVariable, "champsMasques">; label: string };

// ── Barème mensuel (montants € éditables) ───────────────────────────────────
// `categorieKey` rattache la carte aux items manuels ajoutés par le manager sur cette même carte.
const CATEGORIES_BAREME: { titre: string; accent: string; categorieKey: string; champs: ChampBareme[] }[] = [
    {
        titre: "Box",
        accent: "text-emerald-400",
        categorieKey: "box",
        champs: [
            { key: "box_ultra", label: "Ultra / Ultra Essentiel" },
            { key: "box_pop", label: "POP" },
            { key: "box_pop_s_revolution_5g", label: "POP S / Révolution / Box 5G" },
            { key: "seuil_box", label: "Seuil individuel du mois (nb box)" },
            { key: "boost_individuel_box", label: "Boost individuel (au-delà du seuil)" },
            { key: "boost_collectif_box", label: "Boost collectif (par unité proratisée)" },
        ],
    },
    {
        titre: "Forfaits 5G",
        accent: "text-blue-400",
        categorieKey: "forfaits",
        champs: [
            { key: "forfait_free_serie", label: "Forfait Free / Série Free" },
            { key: "forfait_free_max", label: "Forfait Free Max" },
            { key: "migration_2e_vers_free_serie", label: "Migration 2€ → Free/Série Free" },
            { key: "migration_vers_free_max", label: "Migration → Free Max" },
            { key: "seuil_forfait", label: "Seuil individuel du mois (nb forfaits)" },
            { key: "boost_individuel_forfait", label: "Boost individuel (au-delà du seuil)" },
            { key: "boost_collectif_forfait", label: "Boost collectif (par unité proratisée)" },
        ],
    },
    {
        titre: "Smartphones",
        accent: "text-violet-400",
        categorieKey: "smartphones",
        champs: [
            { key: "smartphone", label: "Prime par smartphone" },
            { key: "seuil_smartphone", label: "Seuil individuel du mois (nb smartphones)" },
            { key: "boost_individuel_smartphone", label: "Boost individuel (au-delà du seuil)" },
            { key: "boost_collectif_smartphone", label: "Boost collectif (par unité proratisée)" },
        ],
    },
    {
        titre: "Autres primes",
        accent: "text-amber-400",
        categorieKey: "autres_primes",
        champs: [
            { key: "cross_sell_4p", label: "Cross-sell 4P" },
            { key: "migration_adsl_fibre", label: "Migration ADSL → Fibre" },
            { key: "actes_ast", label: "Actes AST (par acte, à note 100%)" },
            { key: "assurance_nouveau_mobile", label: "Assurance Nouveau Mobile" },
            { key: "assurance_essentielle", label: "Assurance Essentielle" },
            { key: "mcafee_499", label: "McAfee 4,99€" },
            { key: "mcafee_699", label: "McAfee 6,99€" },
            { key: "canal_option1", label: "Canal+ Option 1" },
            { key: "canal_option2", label: "Canal+ Option 2" },
            { key: "canal_option3", label: "Canal+ Option 3" },
            { key: "lead_box", label: "Lead Free Pro — box" },
            { key: "lead_forfait", label: "Lead Free Pro — forfait" },
            { key: "lead_coms_pro", label: "Lead Free Pro — Coms' Pro" },
        ],
    },
    {
        titre: "SatisFD",
        accent: "text-rose-400",
        categorieKey: "satisfd",
        champs: [
            { key: "satisfd_individuelle_base", label: "Base à 90% (individuelle)" },
            { key: "satisfd_individuelle_par_point", label: "Par % supplémentaire" },
            { key: "satisfd_collective", label: "SatisFD vente collective (85%)" },
            { key: "satisfd_ast_collective", label: "SatisFD AST collective (70%)" },
        ],
    },
];

export default function VariableSimulationPage() {
    const [ventes, setVentes] = useState<VenteConseiller>(VENTES_VIDES);
    const [boost, setBoost] = useState<BoostData>(BOOST_VIDE);
    const [bareme, setBareme] = useState<BaremeVariable>(BAREME_DEFAUT);
    const [bonusManuels, setBonusManuels] = useState<BonusManuel[]>([]);
    const [tauxPresencePct, setTauxPresencePct] = useState(100);
    const [bonusVolumes, setBonusVolumes] = useState<Record<string, number>>({});
    const [ongletBareme, setOngletBareme] = useState(false);
    const [loading, setLoading] = useState(true);

    async function charger() {
        const [b, m] = await Promise.all([getBareme(), getBonusManuels()]);
        setBareme(b);
        setBonusManuels(m);
        setLoading(false);
    }

    useEffect(() => { charger(); }, []);

    function updateVente(key: keyof VenteConseiller, value: number) {
        setVentes((prev) => ({ ...prev, [key]: value }));
    }

    function updateBoost(key: keyof BoostData, value: number) {
        setBoost((prev) => ({ ...prev, [key]: value }));
    }

    function updateBareme(key: keyof BaremeVariable, value: number) {
        setBareme((prev) => {
            const next = { ...prev, [key]: value };
            sauvegarderBareme(next);
            return next;
        });
    }

    // Retire/remet en vente un champ fixe du barème (Box Ultra, Forfait Free Max...) : masqué
    // du barème ET de la carte Accueil (sous-choix) tant qu'il n'est pas remis en vente.
    function toggleChampMasque(key: keyof BaremeVariable) {
        setBareme((prev) => {
            const masques = new Set(prev.champsMasques ?? []);
            if (masques.has(key)) masques.delete(key); else masques.add(key);
            const next = { ...prev, champsMasques: Array.from(masques) };
            sauvegarderBareme(next);
            return next;
        });
    }

    function reinitialiserBareme() {
        setBareme(BAREME_DEFAUT);
        sauvegarderBareme(BAREME_DEFAUT);
    }

    async function handleAjouterBonus(label: string, montant: number, categorie: string | null = null) {
        await ajouterBonusManuel(label, montant, categorie);
        setBonusManuels(await getBonusManuels());
    }

    async function handleSupprimerBonus(id: string) {
        await supprimerBonusManuel(id);
        setBonusManuels(await getBonusManuels());
    }

    const ventesAvecPresence = useMemo(
        () => ({ ...ventes, taux_presence: Math.max(0, Math.min(100, tauxPresencePct)) / 100 }),
        [ventes, tauxPresencePct]
    );

    const detail = useMemo(
        () => calculerVariableConseiller(ventesAvecPresence, boost, bareme, bonusManuels, bonusVolumes),
        [ventesAvecPresence, boost, bareme, bonusManuels, bonusVolumes]
    );

    if (loading) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center text-slate-400 font-semibold">
                Chargement...
            </main>
        );
    }

    return (
        <main className="space-y-7">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_64px_rgba(15,23,42,.40)]">
                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

                <div className="relative p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-400">KPILOTE Manager</p>
                            <h1 className="mt-2 text-4xl font-black text-white">Simulateur de variable</h1>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOngletBareme(false)}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                                    !ongletBareme ? "bg-white text-slate-900" : "bg-white/8 text-white/60 hover:bg-white/15"
                                }`}
                            >
                                Simulation
                            </button>
                            <button
                                onClick={() => setOngletBareme(true)}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                                    ongletBareme ? "bg-white text-slate-900" : "bg-white/8 text-white/60 hover:bg-white/15"
                                }`}
                            >
                                Barème du mois
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {ongletBareme ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={reinitialiserBareme}
                            className="rounded-2xl bg-white/8 px-4 py-2 text-xs font-bold text-white/60 hover:bg-white/15"
                        >
                            Réinitialiser aux valeurs officielles
                        </button>
                    </div>
                    {CATEGORIES_BAREME.map((cat) => {
                        const masques = bareme.champsMasques ?? [];
                        const champsVisibles = cat.champs.filter((c) => !masques.includes(c.key));
                        const champsCaches = cat.champs.filter((c) => masques.includes(c.key));
                        return (
                        <CardShell key={cat.titre}>
                            <p className={`mb-4 text-xs font-black uppercase tracking-widest ${cat.accent}`}>
                                {cat.titre}
                            </p>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {champsVisibles.map((c) => (
                                    <NumberField
                                        key={c.key}
                                        label={c.label}
                                        value={bareme[c.key]}
                                        step={0.5}
                                        onChange={(v) => updateBareme(c.key, v)}
                                        onRemove={() => toggleChampMasque(c.key)}
                                    />
                                ))}
                            </div>
                            {champsCaches.length > 0 && (
                                <details className="mt-3">
                                    <summary className="cursor-pointer text-xs font-bold text-white/40 hover:text-white/60">
                                        Retirés de la vente ({champsCaches.length})
                                    </summary>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {champsCaches.map((c) => (
                                            <button
                                                key={c.key}
                                                onClick={() => toggleChampMasque(c.key)}
                                                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-emerald-500/20 hover:text-emerald-300"
                                            >
                                                + Remettre en vente : {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </details>
                            )}
                            <div className="mt-4 border-t border-white/10 pt-4">
                                <BonusManuelsInline
                                    items={bonusManuels.filter((b) => b.categorie === cat.categorieKey)}
                                    mode="gestion"
                                    onAdd={(label, montant) => handleAjouterBonus(label, montant, cat.categorieKey)}
                                    onRemove={handleSupprimerBonus}
                                />
                            </div>
                        </CardShell>
                        );
                    })}

                    <BonusManuelsCard
                        items={bonusManuels.filter((b) => !b.categorie || b.categorie === "destockage")}
                        mode="gestion"
                        onAdd={(label, montant) => handleAjouterBonus(label, montant, "destockage")}
                        onRemove={handleSupprimerBonus}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.3fr_1fr]">
                    {/* ── Formulaire ─────────────────────────────────────────────── */}
                    <div className="space-y-6">
                        {CATEGORIES_VENTES.map((cat) => (
                            <CardShell key={cat.titre}>
                                <p className={`mb-4 text-xs font-black uppercase tracking-widest ${cat.accent}`}>
                                    {cat.titre}
                                </p>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {cat.champs.map((c) => (
                                        <NumberField
                                            key={c.key}
                                            label={c.label}
                                            value={ventes[c.key]}
                                            onChange={(v) => updateVente(c.key, v)}
                                        />
                                    ))}
                                </div>
                                {bonusManuels.some((b) => b.categorie === cat.categorieKey) && (
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                        <BonusManuelsInline
                                            items={bonusManuels.filter((b) => b.categorie === cat.categorieKey)}
                                            mode="declaration"
                                            volumes={bonusVolumes}
                                            onVolumeChange={(id, v) => setBonusVolumes((prev) => ({ ...prev, [id]: v }))}
                                        />
                                    </div>
                                )}
                            </CardShell>
                        ))}

                        {/* Satisfaction & présence */}
                        <CardShell>
                            <p className="mb-4 text-xs font-black uppercase tracking-widest text-rose-400">
                                Satisfaction & présence
                            </p>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <NumberField
                                    label="Note SatisFD individuelle (%)"
                                    value={ventes.note_satisfd_individuelle}
                                    onChange={(v) => updateVente("note_satisfd_individuelle", v)}
                                />
                                <NumberField
                                    label="Note SatisFD AST individuelle (%)"
                                    value={ventes.note_satisfd_ast_individuelle}
                                    onChange={(v) => updateVente("note_satisfd_ast_individuelle", v)}
                                />
                                <NumberField
                                    label="Note SatisFD collective (%)"
                                    value={ventes.note_satisfd_collective}
                                    onChange={(v) => updateVente("note_satisfd_collective", v)}
                                />
                                <NumberField
                                    label="Note SatisFD AST collective (%)"
                                    value={ventes.note_satisfd_ast_collective}
                                    onChange={(v) => updateVente("note_satisfd_ast_collective", v)}
                                />
                                <NumberField
                                    label="Taux de présence (%)"
                                    value={tauxPresencePct}
                                    onChange={setTauxPresencePct}
                                />
                            </div>
                            {bonusManuels.some((b) => b.categorie === "satisfd") && (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <BonusManuelsInline
                                        items={bonusManuels.filter((b) => b.categorie === "satisfd")}
                                        mode="declaration"
                                        volumes={bonusVolumes}
                                        onVolumeChange={(id, v) => setBonusVolumes((prev) => ({ ...prev, [id]: v }))}
                                    />
                                </div>
                            )}
                        </CardShell>

                        {/* Contexte boutique */}
                        <CardShell>
                            <p className="mb-4 text-xs font-black uppercase tracking-widest text-cyan-400">
                                Contexte boutique (R/O du mois)
                            </p>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <NumberField
                                    label={`R/O box boutique — ${nomMois(moisM2Actuel())} (%)`}
                                    value={boost.ro_box_boutique}
                                    onChange={(v) => updateBoost("ro_box_boutique", v)}
                                />
                                <NumberField label="R/O forfait boutique (%)" value={boost.ro_forfait_boutique} onChange={(v) => updateBoost("ro_forfait_boutique", v)} />
                                <NumberField label="R/O smartphone boutique (%)" value={boost.ro_smartphone_boutique} onChange={(v) => updateBoost("ro_smartphone_boutique", v)} />
                            </div>
                            <p className="mt-2 text-[11px] text-white/30">
                                Box payée à M+2 : le boost collectif box se base sur le R/O du mois de vente ({nomMois(moisM2Actuel())}), pas sur le R/O du mois affiché.
                            </p>
                        </CardShell>

                        <BonusManuelsCard
                            items={bonusManuels.filter((b) => !b.categorie || b.categorie === "destockage")}
                            mode="declaration"
                            volumes={bonusVolumes}
                            onVolumeChange={(id, v) => setBonusVolumes((prev) => ({ ...prev, [id]: v }))}
                        />
                    </div>

                    {/* ── Résultats ──────────────────────────────────────────────── */}
                    <div className="lg:sticky lg:top-7 lg:self-start">
                        <DetailResultatsCard detail={detail} />
                    </div>
                </div>
            )}
        </main>
    );
}
