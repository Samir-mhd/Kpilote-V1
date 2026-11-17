"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import { DefiJour, getDefiJour, repondreDefi, mesurerDefi, marquerDefiReussi, changerDefi, itemsDefiPerso, definirDefiPerso, libelleDefi } from "@/services/defisJourService";
import { calculerBadgesConseiller, verifierJourParfaitAujourdhui } from "@/services/badgesService";

/* ─── Carte du Cerebro Check : accepter / refuser ─────────────────────────── */

export function DefiJourChoix({ defi, onChange }: { defi: DefiJour; onChange: (d: DefiJour) => void }) {
    const [envoi, setEnvoi] = useState(false);
    // Parcours : base → (Pas aujourd'hui) question "choisis ton défi ?" → liste des items → nombre.
    const [etape, setEtape] = useState<"base" | "question" | "liste" | "nombre">("base");
    const [items, setItems] = useState<{ code: string; nom: string; suggestion: number; minimum: number }[] | null>(null);
    const [item, setItem] = useState<{ code: string; nom: string; suggestion: number; minimum: number } | null>(null);
    const [nombre, setNombre] = useState(1);
    const [rien, setRien] = useState(false);

    async function repondre(statut: "accepte" | "refuse") {
        setEnvoi(true);
        try {
            await repondreDefi(defi.id, statut);
            onChange({ ...defi, statut });
            setEtape("base");
        } finally { setEnvoi(false); }
    }
    async function changer() {
        setEnvoi(true);
        setRien(false);
        try {
            const nouveau = await changerDefi(defi);
            if (nouveau) onChange(nouveau); else setRien(true);
        } catch { setRien(true); } finally { setEnvoi(false); }
    }
    async function ouvrirListe() {
        setEtape("liste");
        if (!items) setItems(await itemsDefiPerso(defi.conseillerId).catch(() => []));
    }
    async function validerPerso() {
        if (!item) return;
        setEnvoi(true);
        try {
            const d = await definirDefiPerso(defi, item.code, nombre);
            if (d) onChange(d);
            setEtape("base");
        } finally { setEnvoi(false); }
    }

    if (defi.statut === "reussi") {
        return (
            <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/25">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">🏆 Défi du jour remporté</p>
                <p className="mt-1 text-lg font-black text-white">{defi.libelle}</p>
            </div>
        );
    }

    // ── Choisir son propre défi ──
    if (etape === "question") {
        return (
            <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">🎯 Ton défi, ton choix</p>
                <p className="mt-1 text-lg font-black text-white">Tu veux te fixer ton propre défi du jour ?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={ouvrirListe} className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 transition-all active:scale-[0.97]">Oui, je choisis 💪</button>
                    <button onClick={() => repondre("refuse")} disabled={envoi} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white/70 hover:bg-white/15 disabled:opacity-60">Non, pas de défi aujourd&apos;hui</button>
                </div>
            </div>
        );
    }
    if (etape === "liste") {
        return (
            <div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">🎯 Choisis ton défi</p>
                    <button onClick={() => setEtape(defi.statut === "refuse" ? "base" : "question")} className="text-xs font-bold text-white/50 hover:text-white">← Retour</button>
                </div>
                {!items ? (
                    <div className="mt-3 h-24 animate-pulse rounded-xl bg-white/[0.06]" />
                ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {items.map((it) => (
                            <button
                                key={it.code}
                                onClick={() => { setItem(it); setNombre(it.suggestion); setEtape("nombre"); }}
                                className="rounded-xl bg-white/[0.07] px-3 py-3 text-left text-sm font-black text-white ring-1 ring-white/10 transition-all hover:bg-white/[0.14] active:scale-[0.97]"
                            >
                                {it.nom}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    if (etape === "nombre" && item) {
        return (
            <div className="rounded-2xl bg-gradient-to-r from-violet-600/25 to-fuchsia-600/25 p-4 ring-1 ring-violet-400/30">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">🎯 Combien aujourd&apos;hui ?</p>
                    <button onClick={() => setEtape("liste")} className="text-xs font-bold text-white/50 hover:text-white">← Autre item</button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4">
                    <button onClick={() => setNombre((n) => Math.max(item.minimum, n - 1))} disabled={nombre <= item.minimum} aria-label="Moins" className="h-12 w-12 rounded-xl bg-white/10 text-2xl font-black text-white hover:bg-white/15 disabled:opacity-30">−</button>
                    <p className="min-w-[8rem] text-center text-2xl font-black text-white">{libelleDefi(item.code, nombre)}</p>
                    <button onClick={() => setNombre((n) => Math.min(50, n + 1))} aria-label="Plus" className="h-12 w-12 rounded-xl bg-white/10 text-2xl font-black text-white hover:bg-white/15">+</button>
                </div>
                {item.minimum > 1 && <p className="mt-2 text-center text-[11px] font-bold text-white/45">Au moins ton objectif du jour : {item.minimum}</p>}
                <button onClick={validerPerso} disabled={envoi} className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 transition-all active:scale-[0.97] disabled:opacity-60">
                    Je relève ce défi 💪
                </button>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl p-4 ring-1 ${defi.statut === "refuse" ? "bg-white/[0.05] ring-white/10" : "bg-gradient-to-r from-violet-600/25 to-fuchsia-600/25 ring-violet-400/30"}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
                {defi.statut === "refuse" ? "⭐ Ta priorité du jour" : "🎯 Ton défi du jour"}
            </p>
            <p className="mt-1 text-2xl font-black text-white">{defi.libelle} <span className="text-base font-bold text-white/50">aujourd&apos;hui</span></p>
            {defi.statut === "propose" && (
                <>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => repondre("accepte")} disabled={envoi} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 transition-all active:scale-[0.97] disabled:opacity-60">
                            Je relève le défi 💪
                        </button>
                        <button onClick={changer} disabled={envoi} className="flex-1 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20 disabled:opacity-60">
                            🔄 Changer de défi
                        </button>
                        <button onClick={() => setEtape("question")} disabled={envoi} className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white/70 transition-all hover:bg-white/15 disabled:opacity-60">
                            Pas aujourd&apos;hui
                        </button>
                    </div>
                    {rien && <p className="mt-2 text-xs text-white/50">Pas d&apos;autre défi possible aujourd&apos;hui.</p>}
                </>
            )}
            {defi.statut === "accepte" && (
                <p className="mt-2 text-sm font-bold text-emerald-300">✓ Défi accepté — suis ta progression sur l&apos;Accueil.</p>
            )}
            {defi.statut === "refuse" && (
                <p className="mt-2 text-xs text-white/50">
                    Pas de défi aujourd&apos;hui, c&apos;est ta priorité.{" "}
                    <button onClick={() => repondre("accepte")} disabled={envoi} className="font-black text-violet-300 underline-offset-2 hover:underline">Finalement, je le relève</button>
                    {" · "}
                    <button onClick={ouvrirListe} disabled={envoi} className="font-black text-violet-300 underline-offset-2 hover:underline">Je choisis mon défi</button>
                </p>
            )}
        </div>
    );
}

/* ─── Bandeau Accueil : progression + pop-up de victoire ───────────────────── */

export function DefiJourBandeau({ conseillerId, nom }: { conseillerId: string; nom: string }) {
    const [defi, setDefi] = useState<DefiJour | null>(null);
    const [realise, setRealise] = useState(0);
    const [victoire, setVictoire] = useState(false);
    const defiRef = useRef<DefiJour | null>(null);
    const derniereVerifJourParfait = useRef(0);

    async function rafraichir() {
        if (Date.now() - derniereVerifJourParfait.current > 120_000) {
            derniereVerifJourParfait.current = Date.now();
            verifierJourParfaitAujourdhui(conseillerId).catch(() => {});
        }
        const d = defiRef.current ?? await getDefiJour(conseillerId).catch(() => null);
        if (!d) return;
        defiRef.current = d;
        setDefi(d);
        const n = await mesurerDefi(d).catch(() => 0);
        setRealise(n);
        if (d.statut === "accepte" && n >= d.cible) {
            const premiereFois = await marquerDefiReussi(d.id).catch(() => false);
            const maj = { ...d, statut: "reussi" as const };
            defiRef.current = maj;
            setDefi(maj);
            if (premiereFois) {
                setVictoire(true);
                calculerBadgesConseiller(conseillerId).catch(() => {}); // débloque les trophées "défis du jour"
            }
        }
    }

    useEffect(() => {
        if (!conseillerId) return;
        rafraichir();
        // Nouvelles ventes / actes / transactions du conseiller → recalcul de la progression.
        const ch = supabase.channel(`defi-jour-${conseillerId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "ventes", filter: `conseiller_id=eq.${conseillerId}` }, () => rafraichir())
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "variable_actes_jour", filter: `conseiller_id=eq.${conseillerId}` }, () => rafraichir())
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes_transactions", filter: `conseiller_id=eq.${conseillerId}` }, () => rafraichir())
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "defis_jour", filter: `conseiller_id=eq.${conseillerId}` }, (p: any) => {
                if (defiRef.current && p.new?.statut) { defiRef.current = { ...defiRef.current, statut: p.new.statut }; rafraichir(); }
            })
            .subscribe();
        const poll = setInterval(rafraichir, 60_000);
        return () => { supabase.removeChannel(ch); clearInterval(poll); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conseillerId]);

    if (!defi || defi.statut === "propose") return null;

    const pct = Math.min((realise / Math.max(defi.cible, 1)) * 100, 100);
    const reussi = defi.statut === "reussi";
    const refuse = defi.statut === "refuse";

    return (
        <>
            <section className={`relative overflow-hidden rounded-[22px] p-4 ${
                reussi ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : refuse ? "bg-white ring-1 ring-slate-200"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_30px_rgba(124,58,237,.3)]"
            }`}>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-2xl" aria-hidden="true">{reussi ? "🏆" : refuse ? "⭐" : "🎯"}</span>
                    <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${refuse ? "text-slate-400" : "text-white/75"}`}>
                            {reussi ? "Défi du jour remporté !" : refuse ? "Priorité du jour" : "Défi du jour"}
                        </p>
                        <p className={`text-lg font-black ${refuse ? "text-slate-900" : ""}`}>{defi.libelle}</p>
                    </div>
                    <div className="w-full sm:w-64">
                        <div className="flex justify-between text-xs font-black">
                            <span className={refuse ? "text-slate-500" : "text-white/80"}>Progression</span>
                            <span className="tabular-nums">{Math.min(realise, defi.cible)} / {defi.cible}</span>
                        </div>
                        <div className={`mt-1 h-2.5 overflow-hidden rounded-full ${refuse ? "bg-slate-100" : "bg-white/25"}`}>
                            <div className={`h-full rounded-full transition-[width] duration-700 ${refuse ? "bg-violet-500" : "bg-white"}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>
            </section>

            {victoire && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 px-6 backdrop-blur-md" onClick={() => setVictoire(false)}>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                        {Array.from({ length: 28 }, (_, i) => (
                            <span
                                key={i}
                                className="absolute top-[-5%] h-3 w-2 rounded-sm motion-safe:animate-[defi-confetti_2.8s_ease-in_forwards]"
                                style={{
                                    left: `${(i * 37) % 100}%`,
                                    background: ["#fbbf24", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"][i % 5],
                                    animationDelay: `${(i % 7) * 0.12}s`,
                                }}
                            />
                        ))}
                    </div>
                    <div className="relative flex flex-col items-center text-center motion-safe:animate-[defi-pop_.55s_cubic-bezier(.34,1.56,.64,1)]">
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-amber-300">Défi du jour</p>
                        <CartoonAvatar prenom={nom} etat="heureux_gagne" className="mt-2 h-56 w-56 object-contain drop-shadow-[0_20px_50px_rgba(251,191,36,.45)] motion-safe:animate-[podium-couronne_2.4s_ease-in-out_infinite] sm:h-72 sm:w-72" />
                        <p className="mt-2 text-5xl font-black text-white sm:text-6xl">Défi remporté ! 🏆</p>
                        <p className="mt-2 text-lg font-bold text-white/70">{defi.libelle} aujourd&apos;hui — bravo !</p>
                        <button onClick={() => setVictoire(false)} className="mt-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-10 py-4 text-base font-black text-white shadow-[0_10px_30px_rgba(245,158,11,.45)]">
                            Continuer →
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
