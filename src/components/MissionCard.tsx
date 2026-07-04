"use client";

import { useState } from "react";

type Props = {
    titre: string;
    realise: number;
    objectif: number;
    couleur: string; // ex. "bg-green-500"
    onSale: (produit: string) => void;
};

// Mapping couleur Tailwind → hex (pour le SVG arc) + gradient (pour la barre/bouton)
const PALETTE: Record<string, { hex: string; arcStroke: string; gradient: string; glow: string }> = {
    "bg-green-500":  { hex: "#10b981", arcStroke: "#34d399", gradient: "from-green-500 to-emerald-400",  glow: "rgba(16,185,129,.35)" },
    "bg-blue-500":   { hex: "#3b82f6", arcStroke: "#60a5fa", gradient: "from-blue-500 to-cyan-400",      glow: "rgba(59,130,246,.35)" },
    "bg-purple-500": { hex: "#8b5cf6", arcStroke: "#a78bfa", gradient: "from-purple-500 to-violet-400",  glow: "rgba(139,92,246,.35)" },
    "bg-orange-500": { hex: "#f97316", arcStroke: "#fb923c", gradient: "from-orange-500 to-amber-400",   glow: "rgba(249,115,22,.35)" },
    "bg-red-500":    { hex: "#ef4444", arcStroke: "#f87171", gradient: "from-red-500 to-rose-400",       glow: "rgba(239,68,68,.35)"  },
};
const DEFAULT_PAL = { hex: "#8b5cf6", arcStroke: "#a78bfa", gradient: "from-violet-500 to-purple-400", glow: "rgba(139,92,246,.35)" };

const articlesMap: Record<string, string> = {
    box: "une", forfait: "un", forfaits: "un",
    "téléphone": "un", "téléphones": "un", telephone: "un", telephones: "un",
    mcafee: "un", assurance: "une",
};
function getArticle(t: string) { return articlesMap[t.toLowerCase()] ?? "un(e)"; }

const CELEBRATIONS = ["🎉", "🔥", "⚡", "🚀", "💪", "🏆"];

type StatusCfg = { icon: string; label: string; color: string };
function getStatus(pct: number): StatusCfg {
    if (pct >= 100) return { icon: "🏆", label: "Objectif atteint !", color: "#34d399" };
    if (pct >= 80)  return { icon: "🔥", label: "Excellent rythme",   color: "#fb923c" };
    if (pct >= 60)  return { icon: "⚡", label: "Très bon rythme",    color: "#fbbf24" };
    if (pct >= 40)  return { icon: "💪", label: "Continue comme ça",  color: "#60a5fa" };
    if (pct >= 20)  return { icon: "⚠️", label: "À accélérer",       color: "#f87171" };
    return           { icon: "🔴", label: "Mission en retard",        color: "#f87171" };
}

// Cercle arc SVG
function ArcProgress({ pct, stroke }: { pct: number; stroke: string }) {
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(pct, 100) / 100);
    return (
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5.5" />
            <circle
                cx="36" cy="36" r={r}
                fill="none"
                stroke={stroke}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
            />
        </svg>
    );
}

type Particle = { id: number; angle: number; dist: number; color: string; size: number; delay: number; };
const P_COLORS = ["#fbbf24","#34d399","#60a5fa","#a78bfa","#f87171","#fb923c","#f472b6","#4ade80"];
function genParticles(): Particle[] {
    return Array.from({ length: 16 }, (_, i) => ({
        id: i,
        angle: (i / 16) * 360 + (Math.random() - .5) * 18,
        dist: 55 + Math.random() * 75,
        color: P_COLORS[i % P_COLORS.length],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.08,
    }));
}

export default function MissionCard({ titre, realise, objectif, couleur, onSale }: Props) {
    const [celebrating, setCelebrating] = useState(false);
    const [celebEmoji, setCelebEmoji] = useState("🎉");
    const [particles,  setParticles]  = useState<Particle[]>([]);

    const pal   = PALETTE[couleur] ?? DEFAULT_PAL;
    const pct   = objectif > 0 ? Math.min(Math.round((realise / objectif) * 100), 100) : 0;
    const status = getStatus(pct);
    const article = getArticle(titre);

    function handleSale() {
        if (celebrating) return;
        setCelebEmoji(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]);
        setCelebrating(true);
        setParticles(genParticles());
        onSale(titre);
        setTimeout(() => setParticles([]), 750);
        setTimeout(() => setCelebrating(false), 1600);
    }

    return (
        <section
            className="relative overflow-hidden rounded-[28px] border border-white/6 bg-slate-900 transition-all duration-300 hover:-translate-y-1"
            style={{
                boxShadow: celebrating
                    ? `0 20px 60px ${pal.glow}, 0 0 0 1px ${pal.hex}40`
                    : "0 16px 48px rgba(0,0,0,.40)",
            }}
        >
            {/* Tinte couleur produit en fond */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse at 110% -10%, ${pal.hex}28 0%, transparent 60%)`,
                }}
            />

            {/* Burst célébration */}
            {celebrating && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div
                        className="absolute h-32 w-32 rounded-full animate-ping"
                        style={{ background: `${pal.hex}20` }}
                    />
                    <span className="relative text-6xl" style={{ animation: "bounceUp .35s ease" }}>
                        {celebEmoji}
                    </span>
                </div>
            )}

            {/* Confetti particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="pointer-events-none absolute z-20 rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        top: "50%",
                        left: "50%",
                        ["--tx" as any]: `${Math.cos(p.angle * Math.PI / 180) * p.dist}px`,
                        ["--ty" as any]: `${Math.sin(p.angle * Math.PI / 180) * p.dist}px`,
                        animation: `particleBurst 0.65s ease-out ${p.delay}s forwards`,
                    }}
                />
            ))}

            <div className="relative p-7">

                {/* ── Ligne haute : nom + arc ─── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                            Objectif du jour
                        </p>
                        <h2 className="mt-2 truncate text-2xl font-black text-white">
                            {titre}
                        </h2>
                    </div>

                    <div className="relative flex-shrink-0">
                        <ArcProgress pct={pct} stroke={pal.arcStroke} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-black text-white">{pct}%</span>
                        </div>
                    </div>
                </div>

                {/* ── Chiffre dominant ─── */}
                <div className="mt-7 flex items-end gap-2.5">
                    <span
                        className="text-[72px] font-black leading-none text-white tabular-nums"
                        style={{ lineHeight: 1 }}
                    >
                        {realise}
                    </span>
                    <span className="mb-2 text-lg font-semibold text-white/30">
                        / {objectif}
                    </span>
                </div>

                {/* ── Barre slim ─── */}
                <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-white/8">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${pal.gradient} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* ── Statut ─── */}
                <p
                    className="mt-3.5 text-sm font-semibold"
                    style={{ color: status.color }}
                >
                    {status.icon} {status.label}
                </p>

                {/* ── Message célébration ─── */}
                <div
                    className="overflow-hidden transition-all duration-400"
                    style={{ maxHeight: celebrating ? "56px" : "0px", opacity: celebrating ? 1 : 0, marginTop: celebrating ? "12px" : "0" }}
                >
                    <div
                        className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
                        style={{ background: `${pal.hex}22`, border: `1px solid ${pal.hex}40` }}
                    >
                        ✅ {article.charAt(0).toUpperCase() + article.slice(1)} {titre} de plus — excellent !
                    </div>
                </div>

                {/* ── Bouton ─── */}
                <button
                    onClick={handleSale}
                    disabled={celebrating}
                    className={`group mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${pal.gradient} px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50`}
                    style={{ boxShadow: `0 4px 20px ${pal.glow}` }}
                >
                    <span>J'ai vendu {article} {titre}</span>
                    <svg
                        width="16" height="16"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="opacity-70 transition-transform duration-300 group-hover:translate-x-1"
                    >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>

            </div>

            <style>{`
                @keyframes bounceUp {
                    0%   { transform: scale(.4) translateY(20px); opacity: 0; }
                    60%  { transform: scale(1.2) translateY(-4px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes particleBurst {
                    0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
                    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2); opacity: 0; }
                }
            `}</style>
        </section>
    );
}
