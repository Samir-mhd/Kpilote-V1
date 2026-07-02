"use client";

import { useEffect, useState } from "react";
import {
    getObjectifsBoutique,
    upsertObjectifBoutique,
    getProduits,
    ObjectifBoutiqueRow,
} from "@/services/objectifs";

import { PRODUITS_ORDRE } from "@/utils/produits";

const PRODUITS_LABELS: Record<string, string> = Object.fromEntries(
    PRODUITS_ORDRE.map(p => [p.code, `${p.emoji} ${p.label}`])
);

type Cellule = { id: string; produit_id: string; objectif: number; code: string; nom: string };

export default function ObjectifsBoutiqueCard() {
    const [cellules, setCellules] = useState<Cellule[]>([]);
    const [edits, setEdits]       = useState<Record<string, number>>({});
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [ok, setOk]             = useState(false);
    const [erreur, setErreur]     = useState<string | null>(null);

    async function charger() {
        setLoading(true);
        try {
            // Charge les objectifs boutique existants
            const rows = await getObjectifsBoutique();

            // Charge les produits pour avoir l'ordre canonique
            const produits = await getProduits();
            const ordre = PRODUITS_ORDRE.map(p => p.code);
            const produitsTries = [...produits].sort((a, b) => ordre.indexOf(a.code) - ordre.indexOf(b.code));

            if (rows.length > 0) {
                const rowMap = new Map(rows.map(r => [r.produit_id, r]));
                setCellules(produitsTries.map(p => {
                    const r = rowMap.get(p.id);
                    return { id: r?.id ?? "", produit_id: p.id, objectif: r?.objectif ?? 0, code: p.code, nom: p.nom };
                }));
            } else {
                setCellules(produitsTries.map(p => ({ id: "", produit_id: p.id, objectif: 0, code: p.code, nom: p.nom })));
            }
        } catch (e: any) {
            setErreur(e?.message ?? "Erreur chargement");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { charger(); }, []);

    async function handleSave() {
        if (Object.keys(edits).length === 0) return;
        setSaving(true);
        setOk(false);
        setErreur(null);
        try {
            await Promise.all(
                Object.entries(edits).map(([produit_id, objectif]) =>
                    upsertObjectifBoutique(produit_id, objectif)
                )
            );
            setEdits({});
            setOk(true);
            await charger();
            setTimeout(() => setOk(false), 3000);
        } catch (e: any) {
            setErreur(e?.message ?? "Erreur sauvegarde");
        } finally {
            setSaving(false);
        }
    }

    const totalBoutique = cellules.reduce((t, c) => t + (edits[c.produit_id] ?? c.objectif), 0);
    const aDesModifs    = Object.keys(edits).length > 0;

    return (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_8px_40px_rgba(15,23,42,.35)]">

            {/* Halo déco */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative p-7">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-7">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 mb-3">
                            <span className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">
                                🏪 Objectifs Boutique
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            Objectifs mensuels globaux
                        </h2>
                        <p className="mt-1 text-sm text-white/40">
                            Cible totale de la boutique, indépendante des conseillers
                        </p>
                    </div>

                    {totalBoutique > 0 && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">Total</p>
                            <p className="text-4xl font-black text-white">{totalBoutique}</p>
                            <p className="text-xs text-white/30">ventes/mois</p>
                        </div>
                    )}
                </div>

                {/* Tableau */}
                {loading ? (
                    <div className="flex h-24 items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr>
                                    {cellules.map((c) => (
                                        <th
                                            key={c.produit_id}
                                            className="pb-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-white/40"
                                        >
                                            {PRODUITS_LABELS[c.code] ?? c.nom}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {cellules.map((c) => (
                                        <td key={c.produit_id} className="px-2 text-center">
                                            <input
                                                type="number"
                                                min={0}
                                                value={edits[c.produit_id] ?? c.objectif}
                                                onChange={(e) => setEdits((prev) => ({
                                                    ...prev,
                                                    [c.produit_id]: Math.max(0, Number(e.target.value)),
                                                }))}
                                                className="w-full rounded-2xl border border-white/10 bg-white/8 px-3 py-3 text-center text-2xl font-black text-white outline-none transition-all focus:border-violet-400 focus:bg-violet-500/10 placeholder:text-white/20"
                                                style={{ WebkitAppearance: "none" }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Feedback + bouton */}
                <div className="mt-6 flex items-center justify-between gap-4">
                    <div>
                        {ok && (
                            <p className="text-sm font-semibold text-emerald-400">
                                ✅ Objectifs boutique sauvegardés
                            </p>
                        )}
                        {erreur && (
                            <p className="text-sm font-semibold text-red-400">⚠️ {erreur}</p>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!aDesModifs || saving}
                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-3 font-black text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {saving ? "Sauvegarde…" : aDesModifs ? "Enregistrer" : "Aucune modification"}
                    </button>
                </div>

            </div>
        </div>
    );
}
