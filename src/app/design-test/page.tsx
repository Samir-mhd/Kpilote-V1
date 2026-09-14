"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Trophy,
    Flame,
    Target,
    TrendingUp,
    TrendingDown,
    Zap,
    Package,
    Euro,
    Check,
    AlertTriangle,
    Info,
    Sparkles,
    Bell,
} from "lucide-react";

type Theme = "violet" | "emerald" | "rose" | "amber" | "ocean" | "gold";

const PALETTES: { id: Theme; label: string; from: string; to: string }[] = [
    { id: "violet", label: "Violet", from: "#7c3aed", to: "#a855f7" },
    { id: "emerald", label: "Émeraude", from: "#059669", to: "#0d9488" },
    { id: "rose", label: "Rose", from: "#e11d48", to: "#db2777" },
    { id: "amber", label: "Ambre", from: "#d97706", to: "#ea580c" },
    { id: "ocean", label: "Océan", from: "#0284c7", to: "#0891b2" },
    { id: "gold", label: "Or", from: "#ca8a04", to: "#d97706" },
];

const CLASSEMENT = [
    { rang: 1, nom: "Léa M.", ventes: 42, ca: "5 210 €" },
    { rang: 2, nom: "Karim B.", ventes: 38, ca: "4 780 €" },
    { rang: 3, nom: "Sofia T.", ventes: 35, ca: "4 320 €" },
    { rang: 4, nom: "Yanis R.", ventes: 29, ca: "3 640 €" },
];

const RANK_STYLES = [
    "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30",
    "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md",
    "bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md",
    "bg-slate-100 text-slate-500",
];

function initials(nom: string) {
    return nom
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default function DesignTestPage() {
    const [theme, setTheme] = useState<Theme>("violet");

    return (
        <div data-theme={theme} className="min-h-dvh pb-24">
            {/* Barre supérieure */}
            <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                    >
                        <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
                        Retour au dashboard
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                        <Sparkles size={13} aria-hidden="true" />
                        Page de test
                    </span>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
                {/* Hero */}
                <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-600">
                            KPILOTE · Design Lab
                        </p>
                        <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                            Un cran au-dessus,{" "}
                            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
                                sans rien casser.
                            </span>
                        </h1>
                        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                            Cette page n&apos;est reliée à aucune autre route de l&apos;app :
                            elle sert uniquement à essayer des variantes de composants
                            (cartes, boutons, badges, classement) avant de les intégrer
                            au vrai dashboard.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                className="btn-premium inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl px-6 text-sm font-bold shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            >
                                <Zap size={17} aria-hidden="true" />
                                Action principale
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            >
                                Action secondaire
                            </button>
                        </div>
                    </div>

                    {/* Carte flottante hero */}
                    <div className="motion-safe:float card-premium relative rounded-[32px] p-7">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                                CA du jour
                            </p>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg">
                                <Euro size={20} aria-hidden="true" />
                            </div>
                        </div>
                        <p className="mt-4 text-5xl font-black tabular-nums text-slate-900">
                            2 480 €
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            <TrendingUp size={14} aria-hidden="true" />
                            +18 % vs hier
                        </div>
                    </div>
                </section>

                {/* Sélecteur de thème (portée locale à cette page) */}
                <section className="mt-14 rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Palette (aperçu local, n&apos;affecte pas ton thème réel)
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4">
                        {PALETTES.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setTheme(p.id)}
                                aria-pressed={theme === p.id}
                                aria-label={`Thème ${p.label}`}
                                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            >
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-transform ${
                                        theme === p.id
                                            ? "scale-110 ring-2 ring-slate-400 ring-offset-2"
                                            : "hover:scale-105"
                                    }`}
                                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                                >
                                    {theme === p.id && (
                                        <Check size={16} className="text-white" aria-hidden="true" />
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-bold ${
                                        theme === p.id ? "text-slate-900" : "text-slate-400"
                                    }`}
                                >
                                    {p.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* KPI tiles */}
                <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { icon: Euro, label: "CA jour", value: "2 480 €", delta: "+18 %", up: true },
                        { icon: Package, label: "Ventes", value: "24", delta: "+3", up: true },
                        { icon: Target, label: "Objectif", value: "82 %", delta: "-4 %", up: false },
                        { icon: Flame, label: "Série", value: "6 j", delta: "record", up: true },
                    ].map(({ icon: Icon, label, value, delta, up }) => (
                        <div
                            key={label}
                            className="group rounded-[24px] border border-white/40 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,.12)]"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                            </div>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {label}
                            </p>
                            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                                {value}
                            </p>
                            <div
                                className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${
                                    up ? "text-emerald-600" : "text-rose-600"
                                }`}
                            >
                                {up ? (
                                    <TrendingUp size={13} aria-hidden="true" />
                                ) : (
                                    <TrendingDown size={13} aria-hidden="true" />
                                )}
                                {delta}
                            </div>
                        </div>
                    ))}
                </section>

                {/* Classement + Badges */}
                <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="card-premium rounded-[32px] p-7">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                                <Trophy size={19} aria-hidden="true" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800">Classement de la semaine</h2>
                        </div>

                        <ul className="space-y-2">
                            {CLASSEMENT.map((c, i) => (
                                <li
                                    key={c.nom}
                                    className="flex items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                                >
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${RANK_STYLES[i]}`}
                                    >
                                        {c.rang}
                                    </span>
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                                        {initials(c.nom)}
                                    </span>
                                    <span className="flex-1 truncate text-sm font-semibold text-slate-700">
                                        {c.nom}
                                    </span>
                                    <span className="text-sm font-bold tabular-nums text-slate-900">
                                        {c.ca}
                                    </span>
                                    <span className="hidden text-xs text-slate-400 tabular-nums sm:inline">
                                        {c.ventes} ventes
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Objectif */}
                        <div className="card-premium rounded-[32px] p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                    Objectif du mois
                                </h2>
                                <span className="text-sm font-black tabular-nums text-violet-600">82 %</span>
                            </div>
                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-700"
                                    style={{ width: "82%" }}
                                />
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                                18 200 € / 22 000 € — il reste 6 jours ouvrés.
                            </p>
                        </div>

                        {/* Badges de statut */}
                        <div className="card-premium rounded-[32px] p-7">
                            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                                Badges de statut
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    <Check size={13} aria-hidden="true" />
                                    Objectif atteint
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                    <AlertTriangle size={13} aria-hidden="true" />
                                    À surveiller
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                                    <TrendingDown size={13} aria-hidden="true" />
                                    En retard
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                                    <Info size={13} aria-hidden="true" />
                                    Info
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Boutons & contrôles */}
                <section className="mt-10 card-premium rounded-[32px] p-7">
                    <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-slate-500">
                        Boutons &amp; contrôles
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            className="btn-premium h-11 cursor-pointer rounded-xl px-5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        >
                            Primaire
                        </button>
                        <button
                            type="button"
                            className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        >
                            Secondaire
                        </button>
                        <button
                            type="button"
                            className="h-11 cursor-pointer rounded-xl px-5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        >
                            Discret
                        </button>
                        <button
                            type="button"
                            className="h-11 cursor-pointer rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                        >
                            Destructif
                        </button>
                        <button
                            type="button"
                            disabled
                            className="h-11 cursor-not-allowed rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-400"
                        >
                            Désactivé
                        </button>
                        <button
                            type="button"
                            aria-label="Notifications"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        >
                            <Bell size={18} aria-hidden="true" />
                        </button>
                    </div>
                </section>

                {/* Échelle typographique */}
                <section className="mt-10 card-premium rounded-[32px] p-7">
                    <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-slate-500">
                        Échelle typographique
                    </h2>
                    <div className="space-y-4">
                        {[
                            { cls: "text-4xl font-black", label: "text-4xl / black", sample: "Titre d'écran" },
                            { cls: "text-2xl font-black", label: "text-2xl / black", sample: "Titre de section" },
                            { cls: "text-lg font-bold", label: "text-lg / bold", sample: "Titre de carte" },
                            { cls: "text-base font-medium", label: "text-base / medium", sample: "Texte courant" },
                            { cls: "text-sm text-slate-400", label: "text-sm / muted", sample: "Légende / aide" },
                        ].map((t) => (
                            <div
                                key={t.label}
                                className="flex flex-col gap-1 border-b border-slate-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between"
                            >
                                <span className={`${t.cls} text-slate-900`}>{t.sample}</span>
                                <code className="text-xs text-slate-400">{t.label}</code>
                            </div>
                        ))}
                    </div>
                </section>

                <p className="mt-10 text-center text-xs text-slate-400">
                    /design-test — isolée du reste de l&apos;app, supprimable sans impact.
                </p>
            </main>
        </div>
    );
}
