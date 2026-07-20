"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import type { AvatarEtat } from "@/components/avatar/CartoonAvatar";

/* ─── Types ──────────────────────────────────────────────── */
type AlerteType = "danger" | "warning" | "success";

type Alerte = {
    id: string;
    type: AlerteType;
    conseillerId: string;
    prenom: string;
    nom: string;
    message: string;
    emoji: string;
};

type ConseilllerData = {
    id: string;
    nom: string;
    etat: AvatarEtat;
    ventesAuj: number;
};

/* ─── Avatar state (même logique que MeteoEquipe) ───────── */
function computeEtat(timestamps: number[]): AvatarEtat {
    const now     = Date.now();
    const il30min = now - 30 * 60 * 1000;
    const il1h    = now - 60 * 60 * 1000;
    const il2h    = now - 2 * 60 * 60 * 1000;
    const s8h     = new Date().setHours(8, 0, 0, 0);

    if (timestamps.length === 0) {
        if (s8h >= il1h) return "souriant_main";
        if (s8h < il2h)  return "endormi";
        return "glacon";
    }
    const last = Math.max(...timestamps);
    if (timestamps.filter(t => t >= il30min).length >= 2) return "en_feu";
    if (last < il2h) return "endormi";
    if (last < il1h) return "glacon";
    return "souriant_actif";
}

/* ─── Construction des alertes ──────────────────────────── */
function buildAlertes(conseillers: ConseilllerData[]): Alerte[] {
    const heure = new Date().getHours();
    const alertes: Alerte[] = [];

    for (const c of conseillers) {
        const prenom = c.nom.split(" ")[0];

        // Aucune vente depuis l'ouverture (après 10h)
        if (c.ventesAuj === 0 && heure >= 10) {
            alertes.push({
                id: `no-sales-${c.id}`,
                type: "danger",
                conseillerId: c.id,
                prenom,
                nom: c.nom,
                message: "Aucune vente depuis l'ouverture",
                emoji: "😴",
            });
        // Inactif depuis +2h mais a des ventes
        } else if (c.etat === "endormi" && c.ventesAuj > 0) {
            alertes.push({
                id: `inactive-${c.id}`,
                type: "warning",
                conseillerId: c.id,
                prenom,
                nom: c.nom,
                message: `N'a pas vendu depuis plus de 2h`,
                emoji: "⏰",
            });
        // Ralenti depuis +1h
        } else if (c.etat === "glacon" && c.ventesAuj > 0) {
            alertes.push({
                id: `slow-${c.id}`,
                type: "warning",
                conseillerId: c.id,
                prenom,
                nom: c.nom,
                message: "Ralenti — pas de vente depuis 1h",
                emoji: "🧊",
            });
        }

        // Streak exceptionnel (5+ ventes)
        if (c.ventesAuj >= 5) {
            alertes.push({
                id: `fire-${c.id}-${c.ventesAuj}`,
                type: "success",
                conseillerId: c.id,
                prenom,
                nom: c.nom,
                message: `${c.ventesAuj} ventes aujourd'hui — exceptionnel !`,
                emoji: "🔥",
            });
        }
    }

    // Trier : danger d'abord, puis warning, puis success
    const order: Record<AlerteType, number> = { danger: 0, warning: 1, success: 2 };
    return alertes.sort((a, b) => order[a.type] - order[b.type]);
}

/* ─── Styles par type ───────────────────────────────────── */
const CARD_STYLE: Record<AlerteType, string> = {
    danger:  "border-red-100 bg-red-50",
    warning: "border-amber-100 bg-amber-50",
    success: "border-green-100 bg-green-50",
};
const TEXT_STYLE: Record<AlerteType, string> = {
    danger:  "text-red-800",
    warning: "text-amber-800",
    success: "text-green-800",
};
const SUB_STYLE: Record<AlerteType, string> = {
    danger:  "text-red-500",
    warning: "text-amber-600",
    success: "text-green-600",
};
const TOAST_STYLE: Record<AlerteType, string> = {
    danger:  "bg-red-600 text-white",
    warning: "bg-amber-500 text-white",
    success: "bg-green-600 text-white",
};

/* ─── Composant principal ───────────────────────────────── */
export default function AlertesLive() {
    const [alertes, setAlertes]   = useState<Alerte[]>([]);
    const [toasts, setToasts]     = useState<Alerte[]>([]);
    const [loading, setLoading]   = useState(true);
    const prevIdsRef              = useRef<Set<string>>(new Set());
    const firstLoadRef            = useRef(true);

    async function charger() {
        const today = new Date().toISOString().split("T")[0];
        const debut = new Date();
        debut.setHours(0, 0, 0, 0);

        const [resC, resP, resV] = await Promise.all([
            supabase.from("conseillers").select("id, nom"),
            supabase.from("planning_conseillers").select("conseiller_id, statut").eq("jour", today),
            supabase.from("ventes").select("conseiller_id, created_at, source, produits(code)").gte("created_at", debut.toISOString()),
        ]);

        const tous    = resC.data ?? [];
        const planning = resP.data ?? [];
        // Spiderhome = historisation, pas un acte commercial → exclu (comme partout ailleurs)
        const ventes  = (resV.data ?? []).filter((v: any) => {
            if (v.source === "cerebro_check") return false;
            const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
            return code !== "spiderhome";
        });

        const statutMap: Record<string, string> = {};
        planning.forEach((p: any) => { statutMap[p.conseiller_id] = p.statut; });

        const ventesMap: Record<string, number[]> = {};
        ventes.forEach((v: any) => {
            if (!ventesMap[v.conseiller_id]) ventesMap[v.conseiller_id] = [];
            ventesMap[v.conseiller_id].push(new Date(v.created_at).getTime());
        });

        const presents: ConseilllerData[] = tous
            .filter((c: any) => {
                const s = statutMap[c.id];
                return s === undefined || s === "present";
            })
            .map((c: any) => ({
                id:        c.id,
                nom:       c.nom,
                etat:      computeEtat(ventesMap[c.id] ?? []),
                ventesAuj: (ventesMap[c.id] ?? []).length,
            }));

        const nouvellesAlertes = buildAlertes(presents);
        setAlertes(nouvellesAlertes);

        // Toasts : seulement les alertes qui n'existaient pas au cycle précédent
        if (firstLoadRef.current) {
            nouvellesAlertes.forEach(a => prevIdsRef.current.add(a.id));
            firstLoadRef.current = false;
        } else {
            const nouvelles = nouvellesAlertes.filter(a => !prevIdsRef.current.has(a.id));
            prevIdsRef.current = new Set(nouvellesAlertes.map(a => a.id));
            if (nouvelles.length > 0) {
                setToasts(prev => [...prev, ...nouvelles]);
                nouvelles.forEach((a, i) => {
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== a.id));
                    }, 6000 + i * 800);
                });
            }
        }

        setLoading(false);
    }

    useEffect(() => {
        charger();
        const id = setInterval(charger, 60_000);
        return () => clearInterval(id);
    }, []);

    return (
        <>
            {/* ── Carte Alertes ────────────────────────── */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <div className="flex items-center gap-3 mb-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-base">🚨</span>
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Alertes live</p>
                    </div>
                    {alertes.filter(a => a.type === "danger").length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                            {alertes.filter(a => a.type === "danger").length}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex h-24 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-red-400 border-t-transparent" />
                    </div>
                ) : alertes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl mb-3">✅</div>
                        <p className="font-black text-emerald-700">Tout roule</p>
                        <p className="mt-1 text-xs text-slate-400">Aucune alerte pour le moment.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {alertes.map(a => (
                            <div key={a.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${CARD_STYLE[a.type]}`}>
                                <CartoonAvatar prenom={a.nom} etat={a.type === "success" ? "en_feu" : a.type === "danger" ? "endormi" : "glacon"} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-black ${TEXT_STYLE[a.type]}`}>
                                        {a.emoji} {a.prenom}
                                    </p>
                                    <p className={`text-xs ${SUB_STYLE[a.type]}`}>{a.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Toasts ───────────────────────────────── */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl pointer-events-auto ${TOAST_STYLE[t.type]}`}
                        style={{ animation: "slideUp .35s cubic-bezier(.34,1.56,.64,1)" }}
                    >
                        <CartoonAvatar
                            prenom={t.nom}
                            etat={t.type === "success" ? "en_feu" : t.type === "danger" ? "endormi" : "glacon"}
                            size={32}
                        />
                        <div>
                            <p className="text-sm font-black">{t.emoji} {t.prenom}</p>
                            <p className="text-xs opacity-80">{t.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px) scale(.95); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
