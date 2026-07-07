"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getObjectifsBoutique } from "@/services/objectifs";
import { ajusterCheckCerebroManager } from "@/services/resetService";
import { PRODUITS_ORDRE } from "@/utils/produits";

const NOM_MANAGER = process.env.NEXT_PUBLIC_MANAGER_NAME ?? "Manager";
const CHECK_KEY   = "kpilote_manager_check_date";

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS  = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function dateLocale(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Item = {
    code: string;
    label: string;
    emoji: string;
    ventes: number;
    objectif: number;
};

export default function ManagerMorningCheck({ onValidated }: { onValidated: () => void }) {
    const [visible,        setVisible]        = useState(false);
    const [dateLabel,      setDateLabel]      = useState("");
    const [heure,          setHeure]          = useState("");
    const [items,          setItems]          = useState<Item[]>([]);
    const [originalVentes, setOriginalVentes] = useState<Record<string, number>>({});
    const [loading,        setLoading]        = useState(true);
    const [saving,         setSaving]         = useState(false);

    useEffect(() => {
        const now = new Date();
        setDateLabel(`${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]}`);
        setHeure(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
        setTimeout(() => setVisible(true), 80);
    }, []);

    useEffect(() => {
        async function charger() {
            try {
                const now   = new Date();
                const debut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

                const [objRows, ventesRes] = await Promise.all([
                    getObjectifsBoutique(),
                    supabase
                        .from("ventes")
                        .select("produit_id, quantite")
                        .gte("created_at", debut)
                        .lte("created_at", fin),
                ]);

                // Total boutique par produit_id (toutes sources, tous conseillers)
                const totalByProduitId: Record<string, number> = {};
                for (const v of (ventesRes.data ?? [])) {
                    totalByProduitId[v.produit_id] = (totalByProduitId[v.produit_id] ?? 0) + (v.quantite ?? 1);
                }

                // produit_id → code via objectifs
                const produitIdToCode: Record<string, string> = {};
                for (const o of objRows) {
                    if (o.produits?.code) produitIdToCode[o.produit_id] = o.produits.code;
                }

                const totalByCode: Record<string, number> = {};
                for (const [pid, qty] of Object.entries(totalByProduitId)) {
                    const code = produitIdToCode[pid];
                    if (code) totalByCode[code] = (totalByCode[code] ?? 0) + qty;
                }

                const objectifByCode: Record<string, number> = {};
                for (const o of objRows) {
                    if (o.produits?.code) objectifByCode[o.produits.code] = o.objectif ?? 0;
                }

                const built = PRODUITS_ORDRE
                    .filter(p => objectifByCode[p.code] !== undefined)
                    .map(p => ({
                        code:     p.code,
                        label:    p.label,
                        emoji:    p.emoji,
                        ventes:   totalByCode[p.code] ?? 0,
                        objectif: objectifByCode[p.code] ?? 0,
                    }));

                setItems(built);
                const orig: Record<string, number> = {};
                built.forEach(it => { orig[it.code] = it.ventes; });
                setOriginalVentes(orig);
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        }
        charger();
    }, []);

    function adjust(code: string, delta: number) {
        setItems(prev =>
            prev.map(it => it.code === code ? { ...it, ventes: Math.max(0, it.ventes + delta) } : it)
        );
    }

    async function handleValider() {
        setSaving(true);
        try {
            const hasChanges = items.some(it => it.ventes !== (originalVentes[it.code] ?? 0));
            if (hasChanges) {
                const desiredTotals: Record<string, number> = {};
                items.forEach(it => { desiredTotals[it.code] = it.ventes; });
                await ajusterCheckCerebroManager(desiredTotals);
            }
        } catch { /* silencieux */ }
        try { localStorage.setItem(CHECK_KEY, dateLocale()); } catch {}
        setSaving(false);
        onValidated();
    }

    const now        = new Date();
    const totalJours = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const jourActuel = now.getDate();
    const avanceMois = Math.round((jourActuel / totalJours) * 100);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#060612" }}>

            <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div
                className="relative mx-auto w-full max-w-2xl px-6 py-12 transition-all duration-700"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)" }}
            >
                {/* Logo */}
                <div className="mb-10 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white">K</div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">KPILOTE MANAGER</span>
                </div>

                <h1 className="text-5xl font-black leading-tight text-white">
                    Bonjour<br />
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                        {NOM_MANAGER}
                    </span>{" "}👋
                </h1>

                <div className="mt-4 flex items-center gap-3">
                    <p className="text-sm font-semibold text-white/40">{dateLabel}</p>
                    <span className="text-white/15">·</span>
                    <p className="font-mono text-sm text-white/25">{heure}</p>
                    <span className="text-white/15">·</span>
                    <p className="text-sm text-white/25">Jour {jourActuel}/{totalJours} du mois</p>
                </div>

                {/* ── Cerebro Check ─────────────────────────────────────────── */}
                <div className="mt-10">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.3em] text-violet-400">
                        Cerebro Check Boutique
                    </p>
                    <p className="mb-6 text-xs text-white/30">
                        Vérifie les totaux équipe avant de démarrer — ajuste si les chiffres ne correspondent pas à la réalité.
                    </p>

                    {/* Avancement mois */}
                    <div className="mb-6 rounded-2xl border border-white/8 bg-white/4 px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-white/40">Avancement du mois</p>
                            <p className="text-xs font-black text-white/60">{avanceMois}%</p>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                style={{ width: `${avanceMois}%` }} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-2xl border border-white/8 bg-white/4 p-8 text-center">
                            <p className="text-white/40 text-sm">Aucun objectif boutique configuré.</p>
                            <p className="mt-1 text-xs text-white/20">Configurer dans Manager → Objectifs.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {items.map((item) => {
                                const taux     = item.objectif > 0 ? Math.min(Math.round((item.ventes / item.objectif) * 100), 100) : 0;
                                const enAvance = item.objectif > 0 && (item.ventes / item.objectif) >= (avanceMois / 100);
                                const modifie  = item.ventes !== (originalVentes[item.code] ?? 0);
                                return (
                                    <div key={item.code}
                                        className={`group rounded-[20px] border bg-white/4 p-5 transition-all ${
                                            modifie
                                                ? "border-violet-500/40 bg-violet-500/5"
                                                : "border-white/8 hover:border-violet-500/20 hover:bg-violet-500/5"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-xl">{item.emoji}</p>
                                                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/35">{item.label}</p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                                enAvance
                                                    ? "bg-emerald-500/15 text-emerald-300"
                                                    : "bg-red-500/15 text-red-300"
                                            }`}>
                                                {enAvance ? "✓ En avance" : "⚠ En retard"}
                                            </span>
                                        </div>

                                        {/* Contrôle +/- */}
                                        <div className="flex items-center justify-between gap-3">
                                            <button
                                                onClick={() => adjust(item.code, -1)}
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-white/50 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-90"
                                            >
                                                −
                                            </button>

                                            <div className="text-center">
                                                <p className="text-4xl font-black tabular-nums text-white">{item.ventes}</p>
                                                <p className="text-xs text-white/20">/ {item.objectif}</p>
                                            </div>

                                            <button
                                                onClick={() => adjust(item.code, +1)}
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-white/50 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 active:scale-90"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <div className={`h-full rounded-full transition-all ${
                                                enAvance ? "bg-emerald-500" : "bg-amber-500"
                                            }`} style={{ width: `${taux}%` }} />
                                        </div>
                                        <p className="mt-1.5 text-[10px] text-white/20">{taux}% de l'objectif mensuel</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── CTA ─────────────────────────────────────────────────── */}
                {!loading && (
                    <button
                        onClick={handleValider}
                        disabled={saving}
                        className="group relative mt-6 w-full overflow-hidden rounded-[20px] border border-violet-500/20 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-7 py-6 text-left transition-all duration-300 hover:border-violet-500/50 hover:from-violet-600/30 hover:to-fuchsia-600/30 active:scale-[0.98] disabled:opacity-50"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400/70">Base vérifiée</p>
                                <p className="mt-1 text-xl font-black text-white">
                                    {saving ? "Enregistrement…" : "Démarrer la journée"}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_20px_rgba(124,58,237,.4)] transition-transform duration-300 group-hover:scale-110">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>
                )}
            </div>
        </div>
    );
}
