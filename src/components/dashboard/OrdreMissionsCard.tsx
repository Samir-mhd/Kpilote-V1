"use client";

import { useEffect, useState } from "react";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { getOrdreMissions, saveOrdreMissions } from "@/services/ordreMissionsService";

const ORDRE_DEFAUT = PRODUITS_ORDRE.map((p) => p.code) as string[];

function infosProduit(code: string) {
    return PRODUITS_ORDRE.find((p) => p.code === code) ?? { code, label: code, emoji: "•" };
}

export default function OrdreMissionsCard({ conseillerId }: { conseillerId: string }) {
    const [ordre, setOrdre] = useState<string[]>(ORDRE_DEFAUT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modifie, setModifie] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!conseillerId) return;
        getOrdreMissions(conseillerId)
            .then((custom) => setOrdre(custom ?? ORDRE_DEFAUT))
            .finally(() => setLoading(false));
    }, [conseillerId]);

    function deplacer(index: number, direction: -1 | 1) {
        const cible = index + direction;
        if (cible < 0 || cible >= ordre.length) return;
        const copie = [...ordre];
        [copie[index], copie[cible]] = [copie[cible], copie[index]];
        setOrdre(copie);
        setModifie(true);
        setMessage(null);
    }

    async function handleEnregistrer() {
        setSaving(true);
        try {
            await saveOrdreMissions(conseillerId, ordre);
            setModifie(false);
            setMessage("✅ Ordre enregistré !");
        } catch {
            setMessage("⚠️ Erreur lors de l'enregistrement.");
        } finally {
            setSaving(false);
        }
    }

    async function handleReinitialiser() {
        setSaving(true);
        try {
            await saveOrdreMissions(conseillerId, []);
            setOrdre(ORDRE_DEFAUT);
            setModifie(false);
            setMessage("↺ Ordre par défaut restauré.");
        } catch {
            setMessage("⚠️ Erreur lors de la réinitialisation.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex h-20 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">🎯 Ordre de mes objectifs</p>
            <p className="mb-5 text-sm text-slate-400">Choisis l'ordre d'affichage de tes cartes sur l'Accueil.</p>

            <div className="space-y-2">
                {ordre.map((code, i) => {
                    const p = infosProduit(code);
                    return (
                        <div key={code} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                            <span className="w-5 text-center text-xs font-black text-slate-300">{i + 1}</span>
                            <span className="text-lg">{p.emoji}</span>
                            <span className="flex-1 text-sm font-bold text-slate-700">{p.label}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => deplacer(i, -1)}
                                    disabled={i === 0}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition-all hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Monter"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => deplacer(i, 1)}
                                    disabled={i === ordre.length - 1}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition-all hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Descendre"
                                >
                                    ↓
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                    {message && <p className="text-sm font-semibold text-slate-500">{message}</p>}
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={handleReinitialiser}
                        disabled={saving}
                        className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-slate-200 disabled:opacity-40"
                    >
                        Réinitialiser
                    </button>
                    <button
                        onClick={handleEnregistrer}
                        disabled={!modifie || saving}
                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
