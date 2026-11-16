"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProduits } from "@/services/objectifs";
import { getObjectifsEquipeMois } from "@/services/objectifsEquipe";
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

                const [produits, objectifByCode, ventesRes] = await Promise.all([
                    getProduits(),
                    getObjectifsEquipeMois(),
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

                // produit_id → code
                const produitIdToCode: Record<string, string> = {};
                for (const p of produits) produitIdToCode[p.id] = p.code;

                const totalByCode: Record<string, number> = {};
                for (const [pid, qty] of Object.entries(totalByProduitId)) {
                    const code = produitIdToCode[pid];
                    if (code) totalByCode[code] = (totalByCode[code] ?? 0) + qty;
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
    const modifies   = items.filter(it => it.ventes !== (originalVentes[it.code] ?? 0)).length;
    const nbEnAvance = items.filter(it => it.objectif > 0 && it.ventes / it.objectif >= avanceMois / 100).length;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#060612" }}>
            <div className="pointer-events-none fixed -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div
                className="relative mx-auto w-full max-w-3xl px-5 py-8 transition-all duration-700 sm:py-10"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)" }}
            >
                {/* ── En-tête (même structure que le check conseiller) ── */}
                <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black text-white shadow-[0_10px_30px_rgba(139,92,246,.45)] sm:h-24 sm:w-24">K</div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Cerebro Check boutique</p>
                        <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                            Bonjour <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{NOM_MANAGER}</span> 👋
                        </h1>
                        <p className="mt-1 text-sm font-semibold text-white/45">{dateLabel} · {heure}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    </div>
                ) : (
                    <>
                        {/* ── Briefing ── */}
                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Avancement du mois</p>
                                <p className="mt-1 text-white">
                                    <span className="text-3xl font-black tabular-nums">{avanceMois}%</span>
                                    <span className="ml-1 text-sm font-bold text-white/50">jour {jourActuel}/{totalJours}</span>
                                </p>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${avanceMois}%` }} />
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Produits dans le rythme</p>
                                <p className="mt-1 text-white">
                                    <span className="text-3xl font-black tabular-nums">{nbEnAvance}</span>
                                    <span className="ml-1 text-sm font-bold text-white/50">sur {items.length}</span>
                                </p>
                                <p className="mt-1 text-xs text-white/40">Par rapport à l&apos;avancement du mois.</p>
                            </div>
                        </div>

                        {/* ── Vérification des chiffres ── */}
                        <div className="mt-7 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-black text-white">Les totaux boutique du mois sont-ils justes ?</p>
                                <p className="text-xs text-white/40">Corrige seulement si besoin.</p>
                            </div>
                            {items.length === 0 ? (
                                <p className="mt-3 text-sm text-white/50">Aucun objectif boutique configuré (Manager → Matrice objectifs).</p>
                            ) : (
                                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                    {items.map((it) => {
                                        const ecart    = it.ventes - (originalVentes[it.code] ?? 0);
                                        const enAvance = it.objectif > 0 && it.ventes / it.objectif >= avanceMois / 100;
                                        return (
                                            <li key={it.code} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${ecart !== 0 ? "bg-amber-400/10 ring-1 ring-amber-300/30" : "bg-white/[0.03]"}`}>
                                                <span className="w-5 text-center" aria-hidden="true">{it.emoji}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-white/80">{it.label}</span>
                                                    <span className={`block text-[11px] font-bold ${enAvance ? "text-emerald-300/80" : "text-rose-300/80"}`}>
                                                        {enAvance ? "✓ Dans le rythme" : "⚠ En retard"} · obj. {it.objectif}
                                                    </span>
                                                </span>
                                                {ecart !== 0 && <span className="text-[11px] font-black text-amber-300">{ecart > 0 ? `+${ecart}` : ecart}</span>}
                                                <button onClick={() => adjust(it.code, -1)} aria-label={`Retirer 1 ${it.label}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">−</button>
                                                <span className="w-9 text-center text-lg font-black tabular-nums text-white">{it.ventes}</span>
                                                <button onClick={() => adjust(it.code, +1)} aria-label={`Ajouter 1 ${it.label}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-base font-black text-white/60 ring-1 ring-white/10 active:scale-90">+</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* ── Démarrer ── */}
                        <button
                            onClick={handleValider}
                            disabled={saving}
                            className="group mt-6 flex w-full items-center justify-between rounded-[20px] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-left shadow-[0_12px_40px_rgba(124,58,237,.45)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                        >
                            <span>
                                <span className="block text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                                    {modifies > 0 ? `${modifies} correction${modifies > 1 ? "s" : ""} à enregistrer` : "Tout est bon"}
                                </span>
                                <span className="mt-0.5 block text-xl font-black text-white">
                                    {saving ? "Enregistrement…" : modifies > 0 ? "Enregistrer et démarrer" : "Démarrer la journée"}
                                </span>
                            </span>
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover:translate-x-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
