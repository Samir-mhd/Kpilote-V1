"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

/** Menu compact (test, ?menu=v2) : petit panneau flottant ancré sous le bouton,
 *  au lieu du tiroir pleine hauteur. */

export type ItemMenuCompact = { label: string; href: string; icon: React.ReactNode; active: boolean };

const CLE = "kpilote-menu";

/** Lit ?menu=v2 / ?menu=v1 et le mémorise pour la session (les liens du menu ne portent pas le paramètre). */
export function lireMenuCompact(): boolean {
    try {
        const p = new URLSearchParams(window.location.search).get("menu");
        if (p === "v2" || p === "v1") sessionStorage.setItem(CLE, p);
        return sessionStorage.getItem(CLE) === "v2";
    } catch {
        return new URLSearchParams(window.location.search).get("menu") === "v2";
    }
}

type Props = {
    items: ItemMenuCompact[];
    ouvert: boolean;
    setOuvert: (v: boolean) => void;
    pied?: React.ReactNode;
};

export default function MenuCompact({ items, ouvert, setOuvert, pied }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ouvert) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
        const onClic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false); };
        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onClic);
        return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClic); };
    }, [ouvert, setOuvert]);

    return (
        <div ref={ref} className="fixed left-4 top-4 z-50">
            <button
                onClick={() => setOuvert(!ouvert)}
                aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={ouvert}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,.35)] transition-transform hover:scale-105 active:scale-95"
            >
                {ouvert ? <X size={18} /> : <Menu size={20} />}
            </button>

            <div
                className={`absolute left-0 top-[52px] w-56 origin-top-left rounded-2xl bg-slate-950/95 p-1.5 text-white shadow-[0_16px_40px_rgba(15,23,42,.35)] ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 ${
                    ouvert ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
                }`}
                aria-hidden={!ouvert}
            >
                <nav className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto">
                    {items.map((it) => (
                        <Link
                            key={it.href}
                            href={it.href}
                            tabIndex={ouvert ? 0 : -1}
                            onClick={() => setOuvert(false)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                                it.active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">{it.icon}</span>
                            {it.label}
                            {it.active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}
                        </Link>
                    ))}
                </nav>
                {pied && <div className="mt-1.5 border-t border-white/10 px-1.5 pt-1.5">{pied}</div>}
            </div>
        </div>
    );
}
