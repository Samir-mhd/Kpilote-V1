"use client";

import { useEffect, useRef, useState } from "react";
import { DefiActifManager, cloturerChallenge } from "@/services/challengeRepository";
import { formatTempsRestant } from "@/services/challengeService";
import InitialesAvatar from "@/components/avatar/InitialesAvatar";

function Chrono({ expiresAt, duree }: { expiresAt: number; duree: number }) {
    // useRef pour stabiliser la valeur cible — ne redémarre PAS l'intervalle
    // quand le parent re-rend (polling), contrairement à useEffect([targetExpiry])
    const targetRef = useRef(
        expiresAt > Date.now()
            ? expiresAt
            : Date.now() + (duree ?? 30) * 60 * 1000
    );

    const [label, setLabel] = useState(formatTempsRestant(targetRef.current));

    useEffect(() => {
        // Lance une seule fois, l'intervalle utilise la ref stable
        const t = setInterval(() => {
            const r = targetRef.current - Date.now();
            setLabel(r <= 0 ? "0:00" : formatTempsRestant(targetRef.current));
            if (r <= 0) clearInterval(t);
        }, 1000);
        return () => clearInterval(t);
    }, []); // Dépendances vides = run once

    const mins = parseInt(label.split(":")[0]);
    return (
        <span className={`text-2xl font-black tabular-nums ${
            mins <= 1 ? "text-red-300 animate-pulse" : mins <= 5 ? "text-amber-300" : "text-white"
        }`}>
            {label}
        </span>
    );
}

export default function CarteDefiActif({ defi, onCloture }: { defi: DefiActifManager; onCloture: () => void }) {
    const [cloturing, setCloturing] = useState(false);

    async function handleCloture() {
        setCloturing(true);
        try {
            await cloturerChallenge({ id: defi.id });
            onCloture();
        } finally { setCloturing(false); }
    }

    const estExpire = defi.expiresAt <= Date.now() && defi.expiresAt > 0;
    const estPending = defi.status === "pending";

    return (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-[0_8px_32px_rgba(15,23,42,.40)]">
            {/* Halo */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            estPending
                                ? "bg-amber-500/20 text-amber-300"
                                : estExpire
                                ? "bg-red-500/20 text-red-300"
                                : "bg-green-500/20 text-green-300"
                        }`}>
                            {estPending ? "⏳ En attente d'acceptation" : estExpire ? "⏱ Expiré" : "⚔️ En cours"}
                        </span>
                        <span className="text-xs text-white/30">{defi.produit}</span>
                        {defi.objectif > 0 && (
                            <span className="text-xs text-white/30">· {defi.objectif} vente{defi.objectif > 1 ? "s" : ""}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!estPending && (
                            <div className="text-center">
                                <p className="text-xs text-white/30">Temps</p>
                                <Chrono key={defi.id} expiresAt={defi.expiresAt} duree={defi.duree} />
                            </div>
                        )}
                        <button
                            onClick={handleCloture}
                            disabled={cloturing}
                            className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-black text-white/60 transition-all hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                        >
                            {cloturing ? "…" : "Clôturer"}
                        </button>
                    </div>
                </div>

                {/* VS */}
                <div className="flex items-center gap-4">
                    {/* Créateur */}
                    <div className="flex flex-1 items-center gap-3">
                        <InitialesAvatar nom={defi.createurNom} size={44} />
                        <div>
                            <p className="font-black text-white">{defi.createurNom}</p>
                            <p className="text-xs text-white/40">Créateur</p>
                        </div>
                        <p className="ml-auto text-4xl font-black text-white">{defi.scoreCreateur}</p>
                    </div>

                    {/* Centre */}
                    <div className="flex flex-col items-center px-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-xl">⚔️</div>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/25">VS</p>
                        <p className="mt-1 text-xs text-white/30">{defi.duree} min</p>
                    </div>

                    {/* Adversaire */}
                    <div className="flex flex-1 items-center justify-end gap-3">
                        <p className="mr-auto text-4xl font-black text-white">{defi.scoreAdversaire}</p>
                        <div className="text-right">
                            <p className="font-black text-white">{defi.adversaireNom}</p>
                            <p className="text-xs text-white/40">Adversaire</p>
                        </div>
                        <InitialesAvatar nom={defi.adversaireNom} size={44} />
                    </div>
                </div>
            </div>
        </div>
    );
}
