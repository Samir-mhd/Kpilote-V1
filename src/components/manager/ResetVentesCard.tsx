"use client";

import { useState } from "react";
import { resetVentesDuMois, forcerCerebroCheck } from "@/services/resetService";

type Conseiller = { id: string; nom: string };

type Props = { conseillers: Conseiller[] };

const PRODUITS = [
    { code: "box",        label: "Box",       emoji: "📦" },
    { code: "forfaits",   label: "Forfaits",  emoji: "📱" },
    { code: "telephones", label: "Téléphones",emoji: "📲" },
    { code: "mcafee",     label: "McAfee",    emoji: "🛡️" },
    { code: "assurance",  label: "Assurance", emoji: "✅" },
];

type Etape = "formulaire" | "confirmation" | "succes";

export default function ResetVentesCard({ conseillers }: Props) {
    const [conseillerId, setConseillerId] = useState(conseillers[0]?.id ?? "");
    const [selProduits, setSelProduits]   = useState<string[]>(PRODUITS.map(p => p.code)); // tout sélectionné
    const [avecCheck, setAvecCheck]       = useState(true);
    const [etape, setEtape]               = useState<Etape>("formulaire");
    const [loading, setLoading]           = useState(false);
    const [erreur, setErreur]             = useState<string | null>(null);

    const conseiller = conseillers.find(c => c.id === conseillerId);
    const tousSelec  = selProduits.length === PRODUITS.length;

    function toggleProduit(code: string) {
        setSelProduits(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    }

    function toggleTous() {
        setSelProduits(tousSelec ? [] : PRODUITS.map(p => p.code));
    }

    async function handleConfirmer() {
        if (!conseillerId || selProduits.length === 0) return;
        setLoading(true);
        setErreur(null);
        try {
            await resetVentesDuMois(
                conseillerId,
                tousSelec ? null : selProduits
            );
            if (avecCheck) {
                await forcerCerebroCheck(conseillerId);
            }
            setEtape("succes");
        } catch (e: any) {
            setErreur(e?.message ?? "Erreur lors de la réinitialisation");
            setEtape("formulaire");
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setEtape("formulaire");
        setErreur(null);
        setSelProduits(PRODUITS.map(p => p.code));
        setAvecCheck(true);
    }

    return (
        <div className="relative overflow-hidden rounded-[24px] border border-red-200 bg-white shadow-[0_4px_24px_rgba(239,68,68,.08)]">

            {/* Bandeau rouge top */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-400" />

            <div className="p-7">

                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl">
                        🔄
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Réinitialiser les ventes</h3>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Supprime toutes les ventes du mois en cours. Le conseiller re-saisit ses chiffres via le Cerebro Check.
                        </p>
                    </div>
                </div>

                {/* ── Étape formulaire ───────────────────────────────── */}
                {etape === "formulaire" && (
                    <div className="space-y-5">

                        {/* Sélecteur conseiller */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                Conseiller
                            </label>
                            <select
                                value={conseillerId}
                                onChange={e => setConseillerId(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-400"
                            >
                                {conseillers.map(c => (
                                    <option key={c.id} value={c.id}>{c.nom}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sélection produits */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                    Produits à remettre à zéro
                                </label>
                                <button
                                    onClick={toggleTous}
                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                                >
                                    {tousSelec ? "Désélectionner tout" : "Sélectionner tout"}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {PRODUITS.map(p => {
                                    const sel = selProduits.includes(p.code);
                                    return (
                                        <button
                                            key={p.code}
                                            onClick={() => toggleProduit(p.code)}
                                            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition-all ${
                                                sel
                                                    ? "bg-red-500 text-white shadow-md scale-[1.02]"
                                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                            }`}
                                        >
                                            <span>{p.emoji}</span>
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {selProduits.length === 0 && (
                                <p className="mt-2 text-xs text-red-400">Sélectionne au moins un produit.</p>
                            )}
                        </div>

                        {/* Option Cerebro check */}
                        <div
                            onClick={() => setAvecCheck(!avecCheck)}
                            className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all ${
                                avecCheck
                                    ? "border-violet-200 bg-violet-50"
                                    : "border-slate-200 bg-slate-50 opacity-60"
                            }`}
                        >
                            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${avecCheck ? "bg-violet-500" : "bg-slate-200"} transition-colors`}>
                                {avecCheck
                                    ? <svg className="text-white" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    : <span className="text-slate-400 text-xs font-black">✕</span>
                                }
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800">
                                    Forcer le Cerebro Check 🤖
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Au prochain accès, {conseiller?.nom ?? "le conseiller"} devra valider le check Cerebro.
                                </p>
                            </div>
                        </div>

                        {erreur && (
                            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                ⚠️ {erreur}
                            </p>
                        )}

                        {/* Bouton */}
                        <button
                            onClick={() => selProduits.length > 0 && setEtape("confirmation")}
                            disabled={selProduits.length === 0}
                            className="w-full rounded-2xl border-2 border-red-500 bg-white py-3.5 text-sm font-black text-red-600 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Réinitialiser les ventes →
                        </button>
                    </div>
                )}

                {/* ── Étape confirmation ─────────────────────────────── */}
                {etape === "confirmation" && (
                    <div className="space-y-5">

                        <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
                            <p className="text-sm font-black text-red-800 mb-3">⚠️ Confirmer la réinitialisation</p>
                            <ul className="space-y-1.5 text-sm text-red-700">
                                <li>• Conseiller : <strong>{conseiller?.nom}</strong></li>
                                <li>• Produits : <strong>
                                    {tousSelec
                                        ? "Tous les produits"
                                        : PRODUITS.filter(p => selProduits.includes(p.code)).map(p => p.label).join(", ")
                                    }
                                </strong></li>
                                <li>• Période : <strong>mois en cours complet</strong></li>
                                {avecCheck && <li>• 🤖 Cerebro Check forcé au prochain accès</li>}
                            </ul>
                            <p className="mt-3 text-xs text-red-500 font-semibold">
                                Cette action est irréversible.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEtape("formulaire")}
                                disabled={loading}
                                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-black text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirmer}
                                disabled={loading}
                                className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-black text-white shadow-lg transition-all hover:bg-red-600 hover:scale-[1.01] disabled:opacity-60"
                            >
                                {loading ? "Réinitialisation…" : "Confirmer"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Étape succès ───────────────────────────────────── */}
                {etape === "succes" && (
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                            <p className="text-4xl mb-3">✅</p>
                            <p className="font-black text-emerald-800">Ventes réinitialisées</p>
                            <p className="mt-1 text-sm text-emerald-600">
                                {PRODUITS.filter(p => tousSelec || selProduits.includes(p.code)).map(p => p.emoji).join(" ")}
                                {" "}remis à zéro pour <strong>{conseiller?.nom}</strong> aujourd'hui.
                            </p>
                            {avecCheck && (
                                <p className="mt-2 text-xs text-violet-600 font-semibold">
                                    🤖 Le Cerebro Check sera demandé au prochain accès.
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleReset}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-all"
                        >
                            Nouvelle réinitialisation
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
