"use client";

import { useState, ChangeEvent, ReactNode } from "react";
import { VenteConseiller, BonusManuel, DetailVariable } from "@/services/variableConseiller";

type ChampVente = { key: keyof VenteConseiller; label: string };

// ── Formulaire des actes — partagé simulateur manager / vue conseiller ─────
export const CATEGORIES_VENTES: { titre: string; accent: string; champs: ChampVente[] }[] = [
    {
        titre: "Box",
        accent: "text-emerald-400",
        champs: [
            { key: "box_ultra", label: "Ultra / Ultra Essentiel" },
            { key: "box_pop", label: "POP" },
            { key: "box_pop_s_revolution_5g", label: "POP S / Révolution / Box 5G" },
        ],
    },
    {
        titre: "Forfaits 5G",
        accent: "text-blue-400",
        champs: [
            { key: "forfait_free_serie", label: "Forfait Free / Série Free" },
            { key: "forfait_free_max", label: "Forfait Free Max" },
            { key: "migration_2e_vers_free_serie", label: "Migration 2€ → Free/Série Free" },
            { key: "migration_vers_free_max", label: "Migration → Free Max" },
        ],
    },
    {
        titre: "Smartphones & cross-sell",
        accent: "text-violet-400",
        champs: [
            { key: "smartphones", label: "Smartphones vendus" },
            { key: "cross_sell_4p", label: "Cross-sell / vente rebond 4P" },
            { key: "migration_adsl_fibre", label: "Migration ADSL → Fibre" },
        ],
    },
    {
        titre: "Autres actes",
        accent: "text-amber-400",
        champs: [
            { key: "actes_ast_box", label: "Nb actes AST box (Siebel)" },
            { key: "assurance_nouveau_mobile", label: "Assurance Nouveau Mobile" },
            { key: "assurance_essentielle", label: "Assurance Essentielle" },
            { key: "mcafee_499", label: "McAfee 4,99€" },
            { key: "mcafee_699", label: "McAfee 6,99€" },
            { key: "canal_option1", label: "Canal+ Option 1" },
            { key: "canal_option2", label: "Canal+ Option 2" },
            { key: "canal_option3", label: "Canal+ Option 3" },
            { key: "lead_box", label: "Lead Free Pro — box" },
            { key: "lead_forfait", label: "Lead Free Pro — forfait" },
            { key: "lead_coms_pro", label: "Lead Free Pro — Coms' Pro" },
        ],
    },
];

export const LIGNES_DETAIL: { key: keyof DetailVariable; label: string }[] = [
    { key: "prime_box", label: "Prime box" },
    { key: "boost_individuel_box", label: "Boost individuel box" },
    { key: "boost_collectif_box", label: "Boost collectif box" },
    { key: "prime_forfait", label: "Prime forfait" },
    { key: "boost_individuel_forfait", label: "Boost individuel forfait" },
    { key: "boost_collectif_forfait", label: "Boost collectif forfait" },
    { key: "prime_migration_forfait", label: "Up-sell forfait (migration)" },
    { key: "prime_smartphone", label: "Prime smartphone" },
    { key: "boost_individuel_smartphone", label: "Boost individuel smartphone" },
    { key: "boost_collectif_smartphone", label: "Boost collectif smartphone" },
    { key: "prime_cross_sell", label: "Cross-sell 4P" },
    { key: "prime_migration_adsl", label: "Migration ADSL → Fibre" },
    { key: "prime_actes_ast", label: "Actes AST box" },
    { key: "prime_satisfd_individuelle", label: "SatisFD vente individuelle" },
    { key: "prime_collective", label: "Rémunération collective" },
    { key: "prime_assurance", label: "Assurance" },
    { key: "prime_mcafee", label: "McAfee" },
    { key: "prime_canal", label: "Canal+" },
    { key: "prime_lead_free_pro", label: "Lead Free Pro" },
    { key: "prime_bonus_manuel", label: "Boost constructeur / déstockage" },
];

export function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function NumberField({
    label,
    value,
    onChange,
    step = 1,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white/80">{label}</p>
            <input
                type="number"
                min={0}
                step={step}
                value={value === 0 ? "" : value}
                onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="h-10 w-20 shrink-0 rounded-xl border border-white/10 bg-slate-950 text-center text-sm font-black text-white outline-none focus:border-violet-400"
            />
        </div>
    );
}

export function CardShell({ children }: { children: ReactNode }) {
    return (
        <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-[0_20px_64px_rgba(15,23,42,.40)]">
            {children}
        </div>
    );
}

/** Carte "Boost constructeur / déstockage" — éditable côté manager, lecture seule côté conseiller. */
type BonusManuelsCardProps =
    | {
          items: BonusManuel[];
          mode: "gestion";
          onAdd: (label: string, montant: number) => void;
          onRemove: (id: string) => void;
      }
    | {
          items: BonusManuel[];
          mode: "declaration";
          volumes: Record<string, number>;
          onVolumeChange: (id: string, volume: number) => void;
      };

/**
 * "gestion" (manager, onglet Barème) : nommer / fixer le montant unitaire / supprimer.
 * "declaration" (conseiller + simulateur manager) : montant unitaire figé, saisie du volume par boost.
 */
export function BonusManuelsCard(props: BonusManuelsCardProps) {
    const { items } = props;
    const [nouveauLabel, setNouveauLabel] = useState("");
    const [nouveauMontant, setNouveauMontant] = useState("");

    function ajouter() {
        if (props.mode !== "gestion") return;
        const montant = Number(nouveauMontant);
        if (!nouveauLabel.trim() || !montant) return;
        props.onAdd(nouveauLabel.trim(), montant);
        setNouveauLabel("");
        setNouveauMontant("");
    }

    return (
        <CardShell>
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-orange-400">
                Boost constructeur / déstockage
            </p>
            <div className="space-y-2">
                {items.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-white/80">{b.label}</p>
                            <p className="text-xs font-black text-white/30">{fmtEuro(b.montant)} / unité</p>
                        </div>
                        {props.mode === "gestion" ? (
                            <button
                                onClick={() => props.onRemove(b.id)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/50 hover:bg-red-500/20 hover:text-red-300"
                                title="Supprimer"
                            >
                                ×
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-emerald-300 tabular-nums">
                                    {fmtEuro(b.montant * (props.volumes[b.id] ?? 0))}
                                </span>
                                <input
                                    type="number"
                                    min={0}
                                    value={props.volumes[b.id] || ""}
                                    onChange={(e) => props.onVolumeChange(b.id, Math.max(0, Number(e.target.value) || 0))}
                                    placeholder="0"
                                    className="h-10 w-16 shrink-0 rounded-xl border border-white/10 bg-slate-950 text-center text-sm font-black text-white outline-none focus:border-violet-400"
                                />
                            </div>
                        )}
                    </div>
                ))}
                {items.length === 0 && <p className="py-2 text-sm text-white/30">Aucun bonus en cours.</p>}
            </div>
            {props.mode === "gestion" && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                        value={nouveauLabel}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNouveauLabel(e.target.value)}
                        placeholder="Nom du bonus (ex: Déstockage iPhone 13)"
                        className="h-10 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-400"
                    />
                    <input
                        type="number"
                        value={nouveauMontant}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNouveauMontant(e.target.value)}
                        placeholder="Montant € / unité"
                        className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-400 sm:w-36"
                    />
                    <button
                        onClick={ajouter}
                        className="h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 text-sm font-bold text-white hover:opacity-90"
                    >
                        Ajouter
                    </button>
                </div>
            )}
        </CardShell>
    );
}

export function DetailResultatsCard({ detail }: { detail: DetailVariable }) {
    return (
        <CardShell>
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-violet-400">Détail de la variable</p>
            <div className="space-y-1">
                {LIGNES_DETAIL.map((l) => {
                    const val = detail[l.key] as number;
                    if (val === 0) return null;
                    return (
                        <div key={l.key} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-white/60">{l.label}</span>
                            <span className="font-black text-white tabular-nums">{fmtEuro(val)}</span>
                        </div>
                    );
                })}
                {LIGNES_DETAIL.every((l) => (detail[l.key] as number) === 0) && (
                    <p className="py-4 text-center text-sm text-white/30">Saisir des actes pour voir le détail.</p>
                )}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-center shadow-[0_12px_32px_rgba(139,92,246,.35)]">
                <p className="text-xs font-black uppercase tracking-widest text-white/70">Total variable</p>
                <p className="mt-1 text-4xl font-black text-white tabular-nums">{fmtEuro(detail.total)}</p>
            </div>
        </CardShell>
    );
}
