"use client";

import { useEffect, useRef, useState } from "react";
import ManagerMorningCheck from "./ManagerMorningCheck";

const NOM_MANAGER = process.env.NEXT_PUBLIC_MANAGER_NAME ?? "Manager";
const SESSION_KEY  = "kpilote_manager_auth";
const CHECK_KEY    = "kpilote_manager_check_date";

function dateLocale(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function checkFaitAujourdhui(): boolean {
    try { return localStorage.getItem(CHECK_KEY) === dateLocale(); } catch { return false; }
}

type Props = { children: React.ReactNode };

export default function ManagerAuthGate({ children }: Props) {
    const [etat, setEtat]     = useState<"loading" | "locked" | "check" | "unlocked">("loading");
    const [code, setCode]     = useState("");
    const [erreur, setErreur] = useState(false);
    const [checking, setChecking] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Déjà auth dans cette session ?
        const ok = sessionStorage.getItem(SESSION_KEY) === "ok";
        if (!ok) { setEtat("locked"); return; }
        // Auth OK : check morning fait aujourd'hui ?
        setEtat(checkFaitAujourdhui() ? "unlocked" : "check");
    }, []);

    useEffect(() => {
        if (etat === "locked") {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [etat]);

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        if (!code.trim()) return;
        setChecking(true);
        setErreur(false);

        try {
            const res = await fetch("/api/manager/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });

            if (res.ok) {
                sessionStorage.setItem(SESSION_KEY, "ok");
                setEtat(checkFaitAujourdhui() ? "unlocked" : "check");
            } else {
                setErreur(true);
                setCode("");
                setTimeout(() => inputRef.current?.focus(), 50);
            }
        } catch {
            setErreur(true);
        } finally {
            setChecking(false);
        }
    }

    if (etat === "loading") {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    if (etat === "check") {
        return <ManagerMorningCheck onValidated={() => setEtat("unlocked")} />;
    }

    if (etat === "unlocked") {
        return <>{children}</>;
    }

    // ── Écran de verrouillage ──────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background: "#060612" }}>

            {/* Halos */}
            <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div className="relative w-full max-w-md px-8 py-12">

                {/* Logo */}
                <div className="mb-12 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white">
                        K
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">KPILOTE</span>
                </div>

                {/* Espace manager badge */}
                <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-5 py-2.5">
                    <span className="text-base">🔐</span>
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">
                        Espace Manager
                    </span>
                </div>

                {/* Titre */}
                <h1 className="text-5xl font-black leading-tight text-white">
                    Bienvenue<br />
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                        {NOM_MANAGER}
                    </span>
                </h1>

                <p className="mt-5 text-lg font-medium text-white/50">
                    Entrez le code d'accès pour continuer.
                </p>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="mt-10 space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="password"
                            value={code}
                            onChange={(e) => { setCode(e.target.value); setErreur(false); }}
                            placeholder="••••••"
                            autoComplete="current-password"
                            className={`w-full rounded-2xl border px-6 py-4 text-xl font-black tracking-[0.5em] text-white outline-none placeholder:tracking-normal placeholder:text-white/20 transition-all ${
                                erreur
                                    ? "border-red-500/60 bg-red-500/10"
                                    : "border-white/10 bg-white/5 focus:border-violet-500/60 focus:bg-violet-500/5"
                            }`}
                            style={{ caretColor: "#a78bfa" }}
                        />
                        {erreur && (
                            <p className="absolute -bottom-6 left-0 text-sm font-semibold text-red-400">
                                Code incorrect — réessaie.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!code.trim() || checking}
                        className="group relative mt-4 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-5 text-lg font-black text-white shadow-[0_8px_40px_rgba(124,58,237,.4)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(124,58,237,.6)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="relative">
                            {checking ? "Vérification…" : "Accéder →"}
                        </span>
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>
                </form>

            </div>
        </div>
    );
}
