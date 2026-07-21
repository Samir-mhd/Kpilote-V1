"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
    getBonusManuels,
    getVentesConseillerMois,
    sauvegarderVentesConseillerMois,
    moisCourant,
    BonusVolumes,
} from "@/services/variableConseiller";
import { CATEGORIES_VENTES, NumberField, CardShell, BonusManuelsCard, DetailResultatsCard } from "@/components/variable/variableUi";

function VariableInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";

    const [ventes, setVentes] = useState<VenteConseiller>(VENTES_VIDES);
    const [boost, setBoost] = useState<BoostData>(BOOST_VIDE);
    const [tauxPresencePct, setTauxPresencePct] = useState(100);
    const [bonusVolumes, setBonusVolumes] = useState<BonusVolumes>({});
    const [bareme, setBareme] = useState<BaremeVariable>(BAREME_DEFAUT);
    const [bonusManuels, setBonusManuels] = useState<BonusManuel[]>([]);
    const [loading, setLoading] = useState(true);
    const [enregistre, setEnregistre] = useState(true);
    const [variableActivee, setVariableActivee] = useState(true);

    const mois = useMemo(() => moisCourant(), []);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chargeInitiale = useRef(true);

    useEffect(() => {
        if (!conseillerId) return;
        (async () => {
            try {
                const { data } = await supabase.from("conseillers").select("variable_activee").eq("id", conseillerId).maybeSingle();
                setVariableActivee(data?.variable_activee !== false);
            } catch { /* défaut : variable activée */ }
        })();
    }, [conseillerId]);

    // Chargement initial : barème courant, bonus manuels, volumes déjà saisis ce mois-ci
    useEffect(() => {
        if (!conseillerId) return;
        Promise.all([getBareme(), getBonusManuels(), getVentesConseillerMois(conseillerId, mois)]).then(
            ([b, m, v]) => {
                setBareme(b);
                setBonusManuels(m);
                setVentes(v.ventes);
                setBoost(v.boost);
                setTauxPresencePct(v.tauxPresencePct);
                setBonusVolumes(v.bonusVolumes);
                setLoading(false);
                chargeInitiale.current = false;
            }
        );
    }, [conseillerId, mois]);

    // Live : les boosts constructeur/déstockage ajoutés par le manager apparaissent sans recharger la page
    useEffect(() => {
        const channel = supabase
            .channel("variable-bonus-conseiller")
            .on("postgres_changes", { event: "*", schema: "public", table: "variable_bonus_manuels" }, () => {
                getBonusManuels().then(setBonusManuels);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "variable_bareme" }, () => {
                getBareme().then(setBareme);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Sauvegarde auto (debounce) : les volumes saisis restent d'un jour sur l'autre
    useEffect(() => {
        if (chargeInitiale.current || !conseillerId) return;
        setEnregistre(false);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            await sauvegarderVentesConseillerMois(conseillerId, mois, { ventes, boost, tauxPresencePct, bonusVolumes });
            setEnregistre(true);
        }, 800);
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ventes, boost, tauxPresencePct, bonusVolumes]);

    function updateVente(key: keyof VenteConseiller, value: number) {
        setVentes((prev) => ({ ...prev, [key]: value }));
    }

    function updateBoost(key: keyof BoostData, value: number) {
        setBoost((prev) => ({ ...prev, [key]: value }));
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

    if (!variableActivee) {
        return (
            <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center text-slate-400">
                <p className="text-4xl">🚫</p>
                <p className="font-semibold">La variable n'est pas activée pour toi.</p>
                <p className="text-sm text-slate-300">Contacte ton manager si tu penses que c'est une erreur.</p>
            </main>
        );
    }

    return (
        <main className="space-y-7">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_64px_rgba(15,23,42,.40)]">
                <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4 p-8">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-400">Ma cagnotte</p>
                        <h1 className="mt-2 text-4xl font-black text-white">Ma variable du mois</h1>
                        <p className="mt-1 text-sm font-medium text-white/40">
                            Saisis tes actes au fil du mois, le montant se met à jour tout seul.
                        </p>
                    </div>
                    <span className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black ${enregistre ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-white/40"}`}>
                        {enregistre ? "Enregistré ✓" : "Enregistrement…"}
                    </span>
                </div>
            </div>

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
                    </CardShell>

                    {/* Contexte boutique */}
                    <CardShell>
                        <p className="mb-4 text-xs font-black uppercase tracking-widest text-cyan-400">
                            Contexte boutique (R/O du mois)
                        </p>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                            <NumberField label="R/O box boutique (%)" value={boost.ro_box_boutique} onChange={(v) => updateBoost("ro_box_boutique", v)} />
                            <NumberField label="R/O forfait boutique (%)" value={boost.ro_forfait_boutique} onChange={(v) => updateBoost("ro_forfait_boutique", v)} />
                            <NumberField label="R/O smartphone boutique (%)" value={boost.ro_smartphone_boutique} onChange={(v) => updateBoost("ro_smartphone_boutique", v)} />
                        </div>
                    </CardShell>

                    <BonusManuelsCard
                        items={bonusManuels}
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
        </main>
    );
}

export default function VariableConseillerPage() {
    return <Suspense><VariableInner /></Suspense>;
}
