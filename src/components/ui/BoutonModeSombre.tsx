"use client";

import { Moon, Sun } from "lucide-react";

/** Petit bouton rond, discret, sous le bouton menu : bascule mode clair / sombre. */
export default function BoutonModeSombre({ sombre, basculer }: { sombre: boolean; basculer: () => void }) {
    return (
        <button
            onClick={basculer}
            aria-label={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
            title={sombre ? "Mode clair" : "Mode sombre"}
            className={`fixed left-5 top-[4.5rem] z-40 flex h-8 w-8 items-center justify-center rounded-full opacity-60 shadow-sm ring-1 transition-all hover:scale-105 hover:opacity-100 active:scale-95 print:hidden ${
                sombre ? "bg-slate-800 text-amber-300 ring-white/10" : "bg-white text-slate-500 ring-slate-200"
            }`}
        >
            {sombre ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
}
