"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import type { AvatarEtat } from "@/components/avatar/CartoonAvatar";

type ConseillerMeteo = {
    id: string;
    nom: string;
    etat: AvatarEtat;
    ventesAuj: number;
};

// Même logique que useAvatarEtat mais sans localStorage — session assumée à 8h
function computeEtatManager(timestamps: number[]): AvatarEtat {
    const now      = Date.now();
    const il30min  = now - 30 * 60 * 1000;
    const il1h     = now - 60 * 60 * 1000;
    const il2h     = now - 2 * 60 * 60 * 1000;
    const session8h = new Date().setHours(8, 0, 0, 0);

    if (timestamps.length === 0) {
        if (session8h >= il1h) return "souriant_main";
        if (session8h < il2h)  return "endormi";
        return "glacon";
    }

    const lastSale = Math.max(...timestamps);
    if (timestamps.filter(t => t >= il30min).length >= 2) return "en_feu";
    if (lastSale < il2h) return "endormi";
    if (lastSale < il1h) return "glacon";
    return "souriant_actif";
}

const ETAT_CFG: Record<AvatarEtat, { label: string; dot: string; ring: string }> = {
    en_feu:           { label: "En feu",   dot: "bg-orange-500", ring: "ring-orange-200" },
    souriant_actif:   { label: "Actif",    dot: "bg-green-500",  ring: "ring-green-200"  },
    souriant_main:    { label: "Présent",  dot: "bg-slate-400",  ring: "ring-slate-200"  },
    glacon:           { label: "Ralenti",  dot: "bg-blue-400",   ring: "ring-blue-200"   },
    endormi:          { label: "Calme",    dot: "bg-slate-300",  ring: "ring-slate-100"  },
    heureux_gagne:    { label: "Top !",    dot: "bg-amber-500",  ring: "ring-amber-200"  },
    malheureux_perdu: { label: "Perdu",    dot: "bg-red-400",    ring: "ring-red-200"    },
};

const ETAT_EMOJI: Record<AvatarEtat, string> = {
    en_feu: "🔥", souriant_actif: "✅", souriant_main: "👋",
    glacon: "🧊", endormi: "😴", heureux_gagne: "🏆", malheureux_perdu: "😞",
};

export default function MeteoEquipe() {
    const [liste, setListe]     = useState<ConseillerMeteo[]>([]);
    const [loading, setLoading] = useState(true);

    async function charger() {
        const today = new Date().toISOString().split("T")[0];
        const debut = new Date();
        debut.setHours(0, 0, 0, 0);

        const [resC, resP, resV] = await Promise.all([
            supabase.from("conseillers").select("id, nom"),
            supabase
                .from("planning_conseillers")
                .select("conseiller_id, statut")
                .eq("jour", today),
            supabase
                .from("ventes")
                .select("conseiller_id, created_at, source")
                .gte("created_at", debut.toISOString()),
        ]);

        const tous       = resC.data ?? [];
        const planning   = resP.data ?? [];
        const ventesRaw  = (resV.data ?? []).filter((v: any) => v.source !== "cerebro_check");

        // Map statut planning : absent = explicitement off/formation/congé/etc.
        const statutMap: Record<string, string> = {};
        planning.forEach((p: any) => { statutMap[p.conseiller_id] = p.statut; });

        // Regrouper les timestamps de ventes par conseiller
        const ventesMap: Record<string, number[]> = {};
        ventesRaw.forEach((v: any) => {
            if (!ventesMap[v.conseiller_id]) ventesMap[v.conseiller_id] = [];
            ventesMap[v.conseiller_id].push(new Date(v.created_at).getTime());
        });

        const result: ConseillerMeteo[] = tous
            .filter((c: any) => {
                const statut = statutMap[c.id];
                // Pas de ligne planning → présent par défaut
                // "present" → présent
                // Tout autre statut (off, formation, arret_maladie, conges_payes, ferie) → exclu
                return statut === undefined || statut === "present";
            })
            .map((c: any) => ({
                id:        c.id,
                nom:       c.nom,
                etat:      computeEtatManager(ventesMap[c.id] ?? []),
                ventesAuj: (ventesMap[c.id] ?? []).length,
            }))
            // Trier : en_feu d'abord, puis par nb de ventes desc
            .sort((a, b) => {
                if (a.etat === "en_feu" && b.etat !== "en_feu") return -1;
                if (b.etat === "en_feu" && a.etat !== "en_feu") return 1;
                return b.ventesAuj - a.ventesAuj;
            });

        setListe(result);
        setLoading(false);
    }

    useEffect(() => {
        charger();
        const id = setInterval(charger, 60_000);
        return () => clearInterval(id);
    }, []);

    const enFeu    = liste.filter(c => c.etat === "en_feu").length;
    const endormis = liste.filter(c => c.etat === "endormi" || c.etat === "glacon").length;

    return (
        <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Temps réel</p>
                    <p className="text-lg font-black text-slate-900">Météo équipe</p>
                </div>
                <div className="flex items-center gap-3">
                    {enFeu > 0 && (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                            🔥 {enFeu} en feu
                        </span>
                    )}
                    {endormis > 0 && (
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">
                            😴 {endormis} calme{endormis > 1 ? "s" : ""}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-slate-400">
                            {loading ? "…" : `${liste.length} en service`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grille conseillers */}
            {loading ? (
                <div className="flex h-32 items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
            ) : liste.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-300">
                    Aucun conseiller en service aujourd'hui
                </p>
            ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {liste.map(c => {
                        const cfg  = ETAT_CFG[c.etat];
                        const prenom = c.nom.split(" ")[0];
                        return (
                            <div
                                key={c.id}
                                className={`flex flex-col items-center rounded-2xl bg-slate-50 p-4 text-center ring-2 transition-all ${cfg.ring}`}
                            >
                                {/* Avatar avec dot statut */}
                                <div className="relative">
                                    <CartoonAvatar prenom={c.nom} etat={c.etat} size={60} />
                                    <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                                </div>

                                <p className="mt-2.5 w-full truncate text-sm font-black text-slate-900">
                                    {prenom}
                                </p>

                                <p className="text-xs font-bold text-violet-600">
                                    {c.ventesAuj} vente{c.ventesAuj !== 1 ? "s" : ""}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                    {ETAT_EMOJI[c.etat]} {cfg.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}
