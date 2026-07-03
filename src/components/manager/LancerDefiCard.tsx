"use client";

import { useState } from "react";
import { creerChallenge } from "@/services/challengeSupabase";

type Conseiller = { id: string; prenom: string };

type Props = { conseillers: Conseiller[] };

const PRODUITS = ["Box", "Forfaits", "Téléphones", "McAfee", "Assurance"];
const DUREES   = [15, 30, 45, 60];
const VOLUMES  = [1, 2, 3, 4, 5];

type Mode = "defi" | "challenge";

export default function LancerDefiCard({ conseillers }: Props) {
    const [mode, setMode] = useState<Mode>("defi");

    // Champs communs
    const [produit, setProduit]   = useState("Box");
    const [duree, setDuree]       = useState(30);
    const [volume, setVolume]     = useState(3);

    // Défi : deux conseillers
    const [c1, setC1] = useState(conseillers[0]?.id ?? "");
    const [c2, setC2] = useState(conseillers[1]?.id ?? "");

    // Challenge individuel : un conseiller
    const [cible, setCible] = useState(conseillers[0]?.id ?? "");

    const [envoi, setEnvoi]   = useState(false);
    const [succes, setSucces] = useState<string | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    function nomDe(id: string) {
        return conseillers.find(c => c.id === id)?.prenom ?? "?";
    }

    async function handleLancer() {
        if (envoi) return;
        setEnvoi(true);
        setSucces(null);
        setErreur(null);

        try {
            if (mode === "defi") {
                if (!c1 || !c2 || c1 === c2) {
                    setErreur("Sélectionne deux conseillers différents.");
                    return;
                }
                await creerChallenge({
                    createur:  c1,
                    adversaire: c2,
                    produit,
                    duree,
                    objectif:  volume,
                    raison:    `Défi lancé par votre manager entre ${nomDe(c1)} et ${nomDe(c2)} — ${volume} ${produit} en ${duree} min !`,
                    statusInitial: "pending",
                });
                setSucces(`⚔️ Défi lancé ! ${nomDe(c1)} vs ${nomDe(c2)} — ${produit} · ${volume} ventes · ${duree} min`);
            } else {
                if (!cible) {
                    setErreur("Sélectionne un conseiller.");
                    return;
                }
                await creerChallenge({
                    createur:  "manager",
                    adversaire: cible,
                    produit,
                    duree,
                    objectif:  volume,
                    raison:    `🎯 Challenge KPILOTE : ${volume} ${produit} en ${duree} min — Go ${nomDe(cible)} !`,
                    statusInitial: "running",
                });
                setSucces(`🎯 Challenge lancé pour ${nomDe(cible)} — ${volume} ${produit} en ${duree} min`);
            }
        } catch (e: any) {
            setErreur(e?.message ?? "Erreur lors du lancement.");
        } finally {
            setEnvoi(false);
        }
    }

    return (
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_12px_40px_rgba(15,23,42,.35)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />

            <div className="relative p-8">

                {/* Header */}
                <div className="mb-7">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-violet-400">
                        Action manager
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">
                        Lancer un défi ou un challenge
                    </h3>
                    <p className="mt-1 text-sm text-white/40">
                        Crée une dynamique dans ton équipe depuis le brief.
                    </p>
                </div>

                {/* Tabs mode */}
                <div className="mb-7 flex gap-2 rounded-2xl bg-white/6 p-1.5">
                    <button
                        onClick={() => { setMode("defi"); setSucces(null); setErreur(null); }}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all ${
                            mode === "defi" ? "bg-white text-slate-900 shadow" : "text-white/50 hover:text-white/80"
                        }`}
                    >
                        ⚔️ Défi entre conseillers
                    </button>
                    <button
                        onClick={() => { setMode("challenge"); setSucces(null); setErreur(null); }}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all ${
                            mode === "challenge" ? "bg-white text-slate-900 shadow" : "text-white/50 hover:text-white/80"
                        }`}
                    >
                        🎯 Challenge individuel
                    </button>
                </div>

                <div className="space-y-5">

                    {/* Sélection participants */}
                    {mode === "defi" ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                    Conseiller 1
                                </label>
                                <select value={c1} onChange={e => setC1(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-violet-400">
                                    {conseillers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.prenom}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                    Conseiller 2
                                </label>
                                <select value={c2} onChange={e => setC2(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-violet-400">
                                    {conseillers.filter(c => c.id !== c1).map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.prenom}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                Conseiller ciblé
                            </label>
                            <select value={cible} onChange={e => setCible(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-violet-400">
                                {conseillers.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.prenom}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Produit */}
                    <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">Produit</label>
                        <div className="flex flex-wrap gap-2">
                            {PRODUITS.map(p => (
                                <button key={p} onClick={() => setProduit(p)}
                                    className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
                                        produit === p ? "bg-violet-500 text-white shadow-md" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
                                    }`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Volume + Durée */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                Volume (ventes)
                            </label>
                            <div className="flex gap-2">
                                {VOLUMES.map(v => (
                                    <button key={v} onClick={() => setVolume(v)}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all ${
                                            volume === v ? "bg-violet-500 text-white shadow-md scale-110" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
                                        }`}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                Durée
                            </label>
                            <div className="flex gap-2">
                                {DUREES.map(d => (
                                    <button key={d} onClick={() => setDuree(d)}
                                        className={`flex-1 rounded-2xl py-2 text-xs font-black transition-all ${
                                            duree === d ? "bg-violet-500 text-white shadow-md" : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
                                        }`}>
                                        {d}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Résumé */}
                    <div className="rounded-2xl bg-white/6 px-5 py-4">
                        <p className="text-sm text-white/60">
                            {mode === "defi"
                                ? <>⚔️ <strong className="text-white">{nomDe(c1)}</strong> vs <strong className="text-white">{nomDe(c2)}</strong> — {volume} {produit} en {duree} min</>
                                : <>🎯 Challenge pour <strong className="text-white">{nomDe(cible)}</strong> — {volume} {produit} en {duree} min, lancé immédiatement</>
                            }
                        </p>
                    </div>

                    {/* Feedback */}
                    {succes && (
                        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/30 px-5 py-4">
                            <p className="text-sm font-black text-emerald-300">{succes}</p>
                        </div>
                    )}
                    {erreur && (
                        <div className="rounded-2xl bg-red-500/15 border border-red-400/30 px-5 py-4">
                            <p className="text-sm font-black text-red-300">⚠️ {erreur}</p>
                        </div>
                    )}

                    {/* Bouton */}
                    <button
                        onClick={handleLancer}
                        disabled={envoi}
                        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 font-black text-white shadow-[0_6px_28px_rgba(124,58,237,.4)] transition-all hover:scale-[1.01] hover:shadow-[0_8px_36px_rgba(124,58,237,.6)] active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative">
                            {envoi ? "Lancement…" : mode === "defi" ? "⚔️ Lancer le défi" : "🎯 Lancer le challenge"}
                        </span>
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>

                </div>
            </div>
        </div>
    );
}
