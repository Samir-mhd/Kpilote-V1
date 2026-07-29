"use client";

import { useEffect, useState, useCallback } from "react";
import {
    creerDefiEquipe, getDefisEquipe, getScoreDefiEquipe,
    cloturerDefiEquipe, supprimerDefiEquipe,
    DefiEquipe, ModeScoreEquipe, ScoreDefiEquipe,
} from "@/services/defisEquipeService";
import { getConseillers } from "@/services/conseillers";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { formatTempsRestant } from "@/services/challengeService";
import InitialesAvatar from "@/components/avatar/InitialesAvatar";

const PRODUITS_DEFI = [
    { code: "tous", label: "Tous produits" },
    ...PRODUITS_ORDRE.filter((p) => p.code !== "spiderhome").map((p) => ({ code: p.code, label: p.label })),
];

const CRENEAUX = [
    { code: "jour", label: "Aujourd'hui" },
    { code: 15, label: "15 min" },
    { code: 30, label: "30 min" },
    { code: 45, label: "45 min" },
    { code: 60, label: "60 min" },
] as const;
type Creneau = typeof CRENEAUX[number]["code"];

function calculerPeriode(creneau: Creneau): { debut: string; fin: string } {
    const now = new Date();
    if (creneau === "jour") {
        const debut = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const fin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return { debut: debut.toISOString(), fin: fin.toISOString() };
    }
    const fin = new Date(now.getTime() + creneau * 60_000);
    return { debut: now.toISOString(), fin: fin.toISOString() };
}

type ConseillerLite = { id: string; nom: string };
type EquipeMap = Record<string, 0 | 1 | 2>;

// ─── Chrono live (défi flash) ───────────────────────────────────────────────────

function ChronoDefiEquipe({ expiresAt, onExpire }: { expiresAt: number; onExpire: () => void }) {
    const [label, setLabel] = useState(formatTempsRestant(expiresAt));

    useEffect(() => {
        const t = setInterval(() => {
            const r = expiresAt - Date.now();
            setLabel(r <= 0 ? "0:00" : formatTempsRestant(expiresAt));
            if (r <= 0) { clearInterval(t); onExpire(); }
        }, 1000);
        return () => clearInterval(t);
    }, [expiresAt]);

    const mins = parseInt(label.split(":")[0]);
    return (
        <span className={`text-lg font-black tabular-nums ${mins <= 1 ? "text-red-300 animate-pulse" : mins <= 5 ? "text-amber-300" : "text-white/80"}`}>
            ⏱ {label}
        </span>
    );
}

// ─── Barre de score façon "tir à la corde" ─────────────────────────────────────

function BarreCourse({ score1, score2, mode }: { score1: number; score2: number; mode: ModeScoreEquipe }) {
    const total = score1 + score2;
    const pct1 = total > 0 ? (score1 / total) * 100 : 50;
    const fmt = (n: number) => (mode === "moyenne" ? n.toFixed(1) : String(Math.round(n)));

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl font-black tabular-nums text-violet-300">{fmt(score1)}</span>
                <span className="text-2xl font-black tabular-nums text-fuchsia-300">{fmt(score2)}</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
                <div className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500" style={{ width: `${pct1}%` }} />
                <div className="bg-gradient-to-l from-fuchsia-500 to-fuchsia-400 transition-all duration-500" style={{ width: `${100 - pct1}%` }} />
            </div>
        </div>
    );
}

// ─── Carte défi actif ───────────────────────────────────────────────────────────

function CarteDefiEquipe({ defi, onChange }: { defi: DefiEquipe; onChange: () => void }) {
    const [score, setScore] = useState<ScoreDefiEquipe | null>(null);

    const charger = useCallback(() => { getScoreDefiEquipe(defi).then(setScore).catch(() => {}); }, [defi]);

    useEffect(() => {
        charger();
        const interval = setInterval(charger, 30_000);
        return () => clearInterval(interval);
    }, [charger]);

    const equipe1 = defi.membres.filter((m) => m.equipe === 1);
    const equipe2 = defi.membres.filter((m) => m.equipe === 2);
    const produitLabel = PRODUITS_DEFI.find((p) => p.code === defi.produit)?.label ?? defi.produit;
    const gagnant1 = score && score.score1 > score.score2;
    const gagnant2 = score && score.score2 > score.score1;

    const debutMs = new Date(defi.dateDebut).getTime();
    const finMs = new Date(defi.dateFin).getTime();
    const estFlash = finMs - debutMs <= 60 * 60 * 1000;
    const dureeLabel = estFlash
        ? `${Math.round((finMs - debutMs) / 60_000)} min`
        : new Date(defi.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

    return (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-[0_8px_32px_rgba(15,23,42,.40)]">
            <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl" />

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="font-black text-white">{defi.nom}</p>
                        <p className="text-xs text-white/40">
                            {produitLabel} · {defi.mode === "moyenne" ? "score moyen" : "score total"} · {dureeLabel}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {defi.statut === "en_cours" && estFlash && finMs > Date.now() && (
                            <ChronoDefiEquipe expiresAt={finMs} onExpire={async () => { await cloturerDefiEquipe(defi.id); onChange(); }} />
                        )}
                        {defi.statut === "en_cours" ? (
                            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">⚔️ En cours</span>
                        ) : (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/50">Terminé</span>
                        )}
                        {defi.statut === "en_cours" && (
                            <button
                                onClick={async () => { await cloturerDefiEquipe(defi.id); onChange(); }}
                                className="rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-black text-white/60 transition-all hover:bg-red-500/20 hover:text-red-300"
                            >
                                Clôturer
                            </button>
                        )}
                        <button
                            onClick={async () => { await supprimerDefiEquipe(defi.id); onChange(); }}
                            className="rounded-xl border border-white/15 bg-white/8 px-2.5 py-1.5 text-xs font-black text-white/40 transition-all hover:bg-red-500/20 hover:text-red-300"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                    <div className="flex -space-x-2">
                        {equipe1.map((m) => (
                            <div key={m.conseillerId} className={`rounded-full ${gagnant1 ? "ring-2 ring-violet-300" : "ring-2 ring-white/10"}`}>
                                <InitialesAvatar nom={m.nom} size={34} />
                            </div>
                        ))}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/25">VS</span>
                    <div className="flex -space-x-2 flex-row-reverse">
                        {equipe2.map((m) => (
                            <div key={m.conseillerId} className={`rounded-full ${gagnant2 ? "ring-2 ring-fuchsia-300" : "ring-2 ring-white/10"}`}>
                                <InitialesAvatar nom={m.nom} size={34} />
                            </div>
                        ))}
                    </div>
                </div>

                {score ? <BarreCourse score1={score.score1} score2={score.score2} mode={defi.mode} /> : (
                    <div className="h-4 rounded-full bg-white/10 animate-pulse" />
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/30">
                    <span>{equipe1.map((m) => m.nom.split(" ")[0]).join(", ")}</span>
                    <span>{equipe2.map((m) => m.nom.split(" ")[0]).join(", ")}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Compositeur d'équipes ──────────────────────────────────────────────────────

function ChipConseiller({ c, equipe, onClick }: { c: ConseillerLite; equipe: 0 | 1 | 2; onClick: () => void }) {
    const styleParEquipe = {
        0: "bg-slate-100 text-slate-600 hover:bg-slate-200",
        1: "bg-violet-600 text-white shadow-md scale-105",
        2: "bg-fuchsia-600 text-white shadow-md scale-105",
    } as const;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black transition-all ${styleParEquipe[equipe]}`}
        >
            <InitialesAvatar nom={c.nom} size={22} />
            {c.nom.split(" ")[0]}
            {equipe === 1 && <span className="text-white/80 text-xs">É1</span>}
            {equipe === 2 && <span className="text-white/80 text-xs">É2</span>}
        </button>
    );
}

// ─── Section principale ─────────────────────────────────────────────────────────

export default function DefiEquipeSection({ conseillerId, creePar }: { conseillerId?: string; creePar?: string | null }) {
    const [defis, setDefis] = useState<DefiEquipe[]>([]);
    const [conseillers, setConseillers] = useState<ConseillerLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOuvert, setFormOuvert] = useState(false);

    const [nom, setNom] = useState("");
    const [produit, setProduit] = useState("tous");
    const [mode, setMode] = useState<ModeScoreEquipe>("moyenne");
    const [creneau, setCreneau] = useState<Creneau>(30);
    const [equipes, setEquipes] = useState<EquipeMap>({});
    const [envoi, setEnvoi] = useState(false);
    const [succes, setSucces] = useState<string | null>(null);

    async function charger() {
        try {
            const [d, c] = await Promise.all([getDefisEquipe(), getConseillers()]);
            setDefis(d);
            setConseillers(c.map((x: any) => ({ id: x.id, nom: x.nom ?? x.prenom ?? "?" })));
        } catch { /* silencieux */ }
        finally { setLoading(false); }
    }

    useEffect(() => { charger(); }, []);

    function toggleConseiller(id: string) {
        setEquipes((e) => {
            const actuel = e[id] ?? 0;
            const suivant = ((actuel + 1) % 3) as 0 | 1 | 2;
            return { ...e, [id]: suivant };
        });
    }

    const equipe1Ids = Object.entries(equipes).filter(([, v]) => v === 1).map(([k]) => k);
    const equipe2Ids = Object.entries(equipes).filter(([, v]) => v === 2).map(([k]) => k);

    async function handleCreer() {
        if (equipe1Ids.length === 0 || equipe2Ids.length === 0 || !nom.trim()) return;
        setEnvoi(true);
        setSucces(null);
        try {
            const { debut, fin } = calculerPeriode(creneau);
            await creerDefiEquipe({
                nom: nom.trim(),
                produit,
                mode,
                dateDebut: debut,
                dateFin: fin,
                creePar: creePar ?? conseillerId ?? null,
                equipe1: equipe1Ids,
                equipe2: equipe2Ids,
            });
            setSucces("Défi d'équipe lancé ! ⚔️");
            setNom("");
            setEquipes({});
            setFormOuvert(false);
            charger();
        } finally { setEnvoi(false); }
    }

    if (loading) {
        return <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" /></div>;
    }

    const enCours = defis.filter((d) => d.statut === "en_cours");
    const historique = defis.filter((d) => d.statut === "termine");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">Défis d'équipe</p>
                    <p className="text-xs text-slate-400">Compose deux équipes (tailles libres, ex. 2 vs 1) et suis le score en direct</p>
                </div>
                <button
                    onClick={() => setFormOuvert((v) => !v)}
                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02]"
                >
                    {formOuvert ? "Annuler" : "+ Nouveau défi d'équipe"}
                </button>
            </div>

            {formOuvert && (
                <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.08)] space-y-5">

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Nom du défi</label>
                        <input
                            value={nom}
                            onChange={(e) => setNom(e.target.value)}
                            placeholder="Ex : Box Blitz du vendredi"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Compose les équipes — clique un conseiller pour le faire tourner : neutre → Équipe 1 → Équipe 2
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {conseillers.map((c) => (
                                <ChipConseiller key={c.id} c={c} equipe={equipes[c.id] ?? 0} onClick={() => toggleConseiller(c.id)} />
                            ))}
                        </div>
                        <div className="mt-3 flex gap-4 text-xs font-bold">
                            <span className="text-violet-600">Équipe 1 : {equipe1Ids.length}</span>
                            <span className="text-fuchsia-600">Équipe 2 : {equipe2Ids.length}</span>
                            {equipe1Ids.length !== equipe2Ids.length && equipe1Ids.length > 0 && equipe2Ids.length > 0 && (
                                <span className="text-slate-400">→ effectifs inégaux, pense au mode "score moyen"</span>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Produit</label>
                            <div className="flex flex-wrap gap-2">
                                {PRODUITS_DEFI.map((p) => (
                                    <button key={p.code} onClick={() => setProduit(p.code)}
                                        className={`rounded-2xl px-3 py-2 text-xs font-bold transition-all ${produit === p.code ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Mode de score</label>
                            <div className="flex gap-2">
                                {([["total", "Total"], ["moyenne", "Moyenne / conseiller"]] as const).map(([v, label]) => (
                                    <button key={v} onClick={() => setMode(v)}
                                        className={`flex-1 rounded-2xl py-2 text-xs font-bold transition-all ${mode === v ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Durée</label>
                        <div className="flex flex-wrap gap-2">
                            {CRENEAUX.map((c) => (
                                <button key={c.code} onClick={() => setCreneau(c.code)}
                                    className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${creneau === c.code ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleCreer}
                        disabled={equipe1Ids.length === 0 || equipe2Ids.length === 0 || !nom.trim() || envoi}
                        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 font-black text-white shadow-lg transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {envoi ? "Lancement…" : "⚔️ Lancer le défi d'équipe"}
                    </button>
                </div>
            )}

            {succes && !formOuvert && (
                <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">✅ {succes}</div>
            )}

            {enCours.length > 0 && (
                <div className="space-y-4">
                    {enCours.map((d) => <CarteDefiEquipe key={d.id} defi={d} onChange={charger} />)}
                </div>
            )}

            {enCours.length === 0 && !formOuvert && (
                <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(15,23,42,.06)]">
                    <p className="text-3xl">⚔️</p>
                    <p className="mt-3 font-black text-slate-500">Aucun défi d'équipe en cours</p>
                    <p className="mt-1 text-sm text-slate-400">Lance-en un pour affronter une autre équipe en direct.</p>
                </div>
            )}

            {historique.length > 0 && (
                <details className="rounded-[20px] bg-slate-50 p-5">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Historique ({historique.length})
                    </summary>
                    <div className="mt-4 space-y-3">
                        {historique.map((d) => (
                            <div key={d.id} className="rounded-2xl bg-white p-4 text-sm">
                                <p className="font-black text-slate-700">{d.nom}</p>
                                <p className="text-xs text-slate-400">
                                    {d.membres.filter((m) => m.equipe === 1).map((m) => m.nom.split(" ")[0]).join(", ")}
                                    {" vs "}
                                    {d.membres.filter((m) => m.equipe === 2).map((m) => m.nom.split(" ")[0]).join(", ")}
                                    {" · "}{new Date(d.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                                </p>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
