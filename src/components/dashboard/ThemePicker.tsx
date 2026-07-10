"use client";

import { useState } from "react";

export type Theme = "violet" | "emerald" | "rose" | "amber" | "ocean" | "gold";

export const PALETTES: { id: Theme; label: string; from: string; to: string }[] = [
    { id: "violet",  label: "Violet",    from: "#7c3aed", to: "#a855f7" },
    { id: "emerald", label: "Émeraude",  from: "#059669", to: "#0d9488" },
    { id: "rose",    label: "Rose",      from: "#e11d48", to: "#db2777" },
    { id: "amber",   label: "Ambre",     from: "#d97706", to: "#ea580c" },
    { id: "ocean",   label: "Océan",     from: "#0284c7", to: "#0891b2" },
    { id: "gold",    label: "Or",        from: "#ca8a04", to: "#d97706" },
];

function themeKey(conseillerId: string) {
    return conseillerId ? `kpilote-theme-${conseillerId}` : "kpilote-theme";
}

export function applyTheme(theme: Theme, conseillerId = "") {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey(conseillerId), theme);
    window.dispatchEvent(new CustomEvent("kpilote-theme", { detail: theme }));
}

export function readTheme(conseillerId = ""): Theme {
    if (typeof window === "undefined") return "violet";
    return (localStorage.getItem(themeKey(conseillerId)) as Theme) ?? "violet";
}

export default function ThemePicker({ conseillerId = "" }: { conseillerId?: string }) {
    const [selected, setSelected] = useState<Theme>(() => readTheme(conseillerId));

    function select(id: Theme) {
        setSelected(id);
        applyTheme(id, conseillerId);
    }

    return (
        <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Palette de couleurs
            </p>
            <p className="mb-5 text-sm text-slate-400">Personnalise les couleurs de ton KPILOTE.</p>

            <div className="flex flex-wrap gap-4">
                {PALETTES.map(p => (
                    <button
                        key={p.id}
                        onClick={() => select(p.id)}
                        title={p.label}
                        className="flex flex-col items-center gap-2 transition-all"
                    >
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all ${
                                selected === p.id ? "scale-110 shadow-lg ring-2 ring-offset-2 ring-slate-400" : "hover:scale-105"
                            }`}
                            style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                        >
                            {selected === p.id && (
                                <svg className="text-white" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                        <span className={`text-xs font-bold ${selected === p.id ? "text-slate-900" : "text-slate-400"}`}>
                            {p.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
