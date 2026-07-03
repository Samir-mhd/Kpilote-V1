"use client";

import { Suspense } from "react";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import HeroHeader from "@/components/dashboard/HeroHeader";
import StatsBar from "@/components/dashboard/StatsBar";
import MorningCheck from "@/components/dashboard/MorningCheck";
import MissionCard from "@/components/MissionCard";
import { detecterEvenement } from "@/engine/eventEngine";
import { genererMessageCoach } from "@/engine/coachEngine";
import { traiterVente } from "@/engine/venteEngine";
import { getMissionsReelles } from "@/services/missionsReelles";
import { analyserDashboard } from "@/engine/contextEngine";
import { supabase } from "@/lib/supabase";
import { checkForceActive, clearForceCheck } from "@/services/resetService";
import {
    getInvitationsPendantes,
    accepterChallenge,
    refuserChallenge,
} from "@/services/challengeRepository";
import { chargerChallenge, formatTempsRestant, ChallengeDashboard } from "@/services/challengeService";
import InitialesAvatar from "@/components/avatar/InitialesAvatar";

const MANAGER_UUID = "00000000-0000-0000-0000-000000000001";

type MissionDashboard = {
    produit: string;
    objectif: number;
    realise: number;
    couleur: string;
    message: string;
};

/** Date locale au format YYYY-MM-DD (pas UTC — important pour les fuseaux horaires). */
function dateLocale(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
    const searchParams = useSearchParams();
    const nom = searchParams.get("nom") || "Conseiller";
    const conseillerId = searchParams.get("id") || "";

    // Clé unique par conseiller et par jour local — calculée une seule fois
    const cleCheck = conseillerId ? `morning-check-${conseillerId}-${dateLocale()}` : null;

    const [morningCheckValidated, setMorningCheckValidated] = useState(() => {
        if (!conseillerId || !cleCheck) return true;
        try {
            return localStorage.getItem(cleCheck) === "done";
        } catch { return false; }
    });

    // checkForced = true uniquement si le manager a déclenché un reset → active la sauvegarde des valeurs
    const [checkForced, setCheckForced] = useState(false);

    useEffect(() => {
        if (!conseillerId) return;
        checkForceActive(conseillerId)
            .then((forced) => {
                if (forced) {
                    setCheckForced(true);
                    setMorningCheckValidated(false); // force l'affichage du check même si déjà fait aujourd'hui
                }
            })
            .catch(() => {});
    }, [conseillerId]);

    const [totalVentesJour, setTotalVentesJour] = useState(0);
    const [heroMessage, setHeroMessage] = useState("Chargement de ta journée...");
    const [coachMessage, setCoachMessage] = useState("🎯 Commence par ta mission prioritaire du jour.");
    const [missions, setMissions] = useState<MissionDashboard[]>([]);
    const [rang, setRang] = useState(0);

    // Défis : invitations reçues + défi actif
    const [invitations, setInvitations] = useState<any[]>([]);
    const [defisActif, setDefiActif]     = useState<ChallengeDashboard | null>(null);
    const [invitAnim, setInvitAnim]      = useState(false);
    const [defiJustAccepte, setDefiJustAccepte] = useState(false);
    const [defiJustRecu,    setDefiJustRecu]    = useState(false);

    // Countdown live pour la carte VS du défi
    const [defiCountdown, setDefiCountdown] = useState<string>("");
    const defiIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const defiExpiresAtRef  = useRef<number>(0); // valeur stable, jamais réinitialisée par les polls

    useEffect(() => {
        if (defiIntervalRef.current) clearInterval(defiIntervalRef.current);

        if (!defisActif?.id || defisActif.status !== "running") {
            setDefiCountdown("");
            defiExpiresAtRef.current = 0;
            return;
        }

        // Capture expiresAt une seule fois par challenge (pas aux polls suivants)
        // Si started_at est null, expiresAt = maintenant + duree → correct pour le 1er chargement
        defiExpiresAtRef.current = defisActif.expiresAt;

        const tick = () => {
            const r = defiExpiresAtRef.current - Date.now();
            if (r <= 0) {
                setDefiCountdown("0:00");
                clearInterval(defiIntervalRef.current!);
            } else {
                const m = Math.floor(r / 60000);
                const s = Math.floor((r % 60000) / 1000);
                setDefiCountdown(`${m}:${String(s).padStart(2, "0")}`);
            }
        };
        tick();
        defiIntervalRef.current = setInterval(tick, 1000);
        return () => { if (defiIntervalRef.current) clearInterval(defiIntervalRef.current); };

    // Dépend UNIQUEMENT de l'id — les polls qui changent expiresAt ne relancent pas le chrono
    }, [defisActif?.id, defisActif?.status]);

    // Toast popup pour notifications entrantes + félicitations
    const [toast, setToast] = useState<{
        msg: string;
        type: "defi" | "challenge" | "congrats";
        details?: { produit: string; duree: number; objectif: number; adversaire: string };
    } | null>(null);

    async function chargerMissions() {
        if (!conseillerId) return;
        const data = await getMissionsReelles(conseillerId);
        setMissions(data);
        const contexte = analyserDashboard(
            data.map((m) => ({ produit: m.produit, objectif: m.objectif, realise: m.realise }))
        );
        setHeroMessage(contexte.messageHero);
        setCoachMessage(contexte.messageCoach);
    }

    async function chargerRang() {
        if (!conseillerId) return;
        try {
            const debut = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { data } = await supabase
                .from("ventes")
                .select("conseiller_id, quantite")
                .gte("created_at", debut);
            if (!data) return;
            const totaux: Record<string, number> = {};
            data.forEach((v: any) => {
                totaux[v.conseiller_id] = (totaux[v.conseiller_id] ?? 0) + v.quantite;
            });
            const sorted = Object.entries(totaux).sort((a, b) => b[1] - a[1]);
            const pos = sorted.findIndex(([id]) => id === conseillerId) + 1;
            setRang(pos > 0 ? pos : 0);
        } catch { /* silencieux */ }
    }

    async function chargerDefis(opts?: { blink?: "accepte" | "recu" }) {
        if (!conseillerId) return;
        try {
            const invits = await getInvitationsPendantes(conseillerId).catch(() => []);
            // Essaie plusieurs fois si le premier appel retourne null (délai de consistance DB)
            let actif = await chargerChallenge(conseillerId).catch(() => null);
            if (!actif) {
                await new Promise(r => setTimeout(r, 600));
                actif = await chargerChallenge(conseillerId).catch(() => null);
            }
            setInvitations(invits);
            setDefiActif(actif);
            if (invits.length > 0) setInvitAnim(true);
            if (opts?.blink === "accepte") {
                setDefiJustAccepte(true);
                setTimeout(() => setDefiJustAccepte(false), 6000);
            }
            if (opts?.blink === "recu" && actif) {
                setDefiJustRecu(true);
                setTimeout(() => setDefiJustRecu(false), 6000);
            }
        } catch { /* silencieux */ }
    }

    async function handleAccepter(id: string) {
        await accepterChallenge(id);
        await chargerDefis({ blink: "accepte" });
    }

    async function handleRefuser(id: string) {
        await refuserChallenge(id);
        setInvitations(prev => prev.filter(i => i.id !== id));
    }

    useEffect(() => {
        chargerMissions();
        chargerRang();
        chargerDefis();
    }, [conseillerId]);

    // Realtime : toutes les modifications sur challenges impliquant ce conseiller
    useEffect(() => {
        if (!conseillerId) return;

        const channel = supabase
            .channel(`challenge-rt-${conseillerId}`)

            // INSERT : nouveau challenge reçu (je suis l'adversaire)
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "challenges",
                filter: `adversaire=eq.${conseillerId}`,
            }, async (payload: any) => {
                const row = payload.new;
                if (row.status === "running" && row.createur === MANAGER_UUID) {
                    await chargerDefis({ blink: "recu" });
                    setToast({
                        msg:     `🎯 Challenge reçu du manager !`,
                        type:    "challenge",
                        details: { produit: row.produit, duree: row.duree, objectif: row.objectif ?? 0, adversaire: "Manager" },
                    });
                } else if (row.status === "pending") {
                    await chargerDefis();
                    setToast({
                        msg:     `⚔️ Défi reçu !`,
                        type:    "defi",
                        details: { produit: row.produit, duree: row.duree, objectif: row.objectif ?? 0, adversaire: "" },
                    });
                    setInvitAnim(true);
                }
            })

            // UPDATE créateur : acceptation, score adversaire, clôture — vu par le créateur
            .on("postgres_changes", {
                event: "UPDATE", schema: "public", table: "challenges",
                filter: `createur=eq.${conseillerId}`,
            }, async () => { await chargerDefis(); })

            // UPDATE adversaire : score créateur mis à jour, clôture — vu par l'adversaire
            .on("postgres_changes", {
                event: "UPDATE", schema: "public", table: "challenges",
                filter: `adversaire=eq.${conseillerId}`,
            }, async () => { await chargerDefis(); })

            .subscribe();

        // Polling de sécurité toutes les 30s (fallback si Realtime rate un event)
        const poll = setInterval(() => { chargerDefis(); }, 30_000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(poll);
        };
    }, [conseillerId]);

    if (!morningCheckValidated) {
        return (
            <MorningCheck
                nom={nom}
                conseillerId={conseillerId}
                isReset={checkForced}
                onValidated={() => {
                    if (cleCheck) { try { localStorage.setItem(cleCheck, "done"); } catch {} }
                    if (conseillerId) clearForceCheck(conseillerId).catch(() => {});
                    setCheckForced(false);
                    setMorningCheckValidated(true);
                    // Recharge les missions après le check (les valeurs viennent d'être sauvées)
                    chargerMissions();
                    chargerRang();
                }}
            />
        );
    }

    const realiseGlobal = missions.reduce((t, m) => t + m.realise, 0);
    const objectifGlobal = missions.reduce((t, m) => t + m.objectif, 0);
    const tauxGlobal = objectifGlobal > 0 ? Math.round((realiseGlobal / objectifGlobal) * 100) : 0;

    async function handleSale(produit: string) {
        const mission = missions.find((m) => m.produit === produit);
        if (!mission) return;
        if (conseillerId) {
            await traiterVente({ conseillerId, produit });
            await chargerMissions();
            await chargerRang();
        }
        const nouveauTotal = totalVentesJour + 1;
        setTotalVentesJour(nouveauTotal);
        const event = detecterEvenement({
            score: mission.realise + 1,
            objectif: mission.objectif,
            totalVentesJour: nouveauTotal,
        });
        setCoachMessage(
            genererMessageCoach({
                event,
                produit,
                reste: Math.max(mission.objectif - mission.realise - 1, 0),
                prenom: nom,
                totalVentesJour: nouveauTotal,
            })
        );

        // ── Mise à jour du score du challenge/défi actif ──────────────
        if (defisActif && defisActif.status === "running" &&
            defisActif.produit.toLowerCase() === produit.toLowerCase()) {

            const isCreateur   = defisActif.createurId === conseillerId;
            const scoreField   = isCreateur ? "score_createur" : "score_adversaire";
            const nouveauScore = defisActif.scoreConseiller + 1;

            await supabase
                .from("challenges")
                .update({ [scoreField]: nouveauScore })
                .eq("id", defisActif.id);

            // Met à jour l'état local immédiatement (sans attendre le Realtime)
            setDefiActif(prev => prev ? { ...prev, scoreConseiller: nouveauScore } : null);

            // Auto-clôture si objectif atteint
            if (defisActif.objectif > 0 && nouveauScore >= defisActif.objectif) {
                await supabase
                    .from("challenges")
                    .update({ status: "finished" })
                    .eq("id", defisActif.id);

                setDefiActif(null);
                setToast({
                    msg:  `🏆 Challenge réussi !`,
                    type: "congrats",
                    details: {
                        produit:   defisActif.produit,
                        duree:     defisActif.duree,
                        objectif:  defisActif.objectif,
                        adversaire: defisActif.adversaire,
                    },
                });
            }
        }
    }

    return (
        <div className="space-y-8">

            {/* ── Toast popup challenge/défi/félicitations ─────────────── */}
            {toast && (
                <div
                    className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm"
                    style={{ animation: "slideDown .4s cubic-bezier(.34,1.56,.64,1)" }}
                >
                    <div className={`relative overflow-hidden rounded-[24px] p-6 shadow-[0_16px_56px_rgba(0,0,0,.45)] ${
                        toast.type === "congrats"  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                        : toast.type === "challenge" ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                        :                             "bg-gradient-to-br from-violet-600 to-indigo-700"
                    } text-white`}>

                        {/* Halo déco */}
                        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                        <div className="relative">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">
                                        {toast.type === "congrats" ? "🏆" : toast.type === "challenge" ? "🎯" : "⚔️"}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">
                                            {toast.type === "congrats" ? "Challenge réussi" : toast.type === "challenge" ? "Challenge reçu" : "Défi reçu"}
                                        </p>
                                        <p className="text-xl font-black text-white leading-tight">{toast.msg}</p>
                                    </div>
                                </div>
                                <button onClick={() => setToast(null)}
                                    className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-black hover:bg-white/25 transition-all">
                                    ✕
                                </button>
                            </div>

                            {/* Détails */}
                            {toast.details && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Produit</p>
                                        <p className="mt-0.5 text-sm font-black">{toast.details.produit}</p>
                                    </div>
                                    {toast.details.objectif > 0 && (
                                        <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Objectif</p>
                                            <p className="mt-0.5 text-sm font-black">{toast.details.objectif} vente{toast.details.objectif > 1 ? "s" : ""}</p>
                                        </div>
                                    )}
                                    <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Durée</p>
                                        <p className="mt-0.5 text-sm font-black">{toast.details.duree} min</p>
                                    </div>
                                    {toast.details.adversaire && (
                                        <div className="col-span-3 rounded-xl bg-white/15 px-3 py-2.5 text-center">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                                                {toast.type === "congrats" ? "Proposé par" : "De la part de"}
                                            </p>
                                            <p className="mt-0.5 text-sm font-black">{toast.details.adversaire}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <style>{`
                        @keyframes slideDown {
                            from { opacity: 0; transform: translateY(-24px) scale(.95); }
                            to   { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                </div>
            )}

            <HeroHeader
                nom={nom}
                message={heroMessage}
                coachMessage={coachMessage}
                progression={tauxGlobal}
                rang={rang}
            />

            {/* ── Invitations défi reçues ──────────────────────────────── */}
            {invitations.map((inv) => (
                <div
                    key={inv.id}
                    className={`relative overflow-hidden rounded-[24px] border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 p-6 shadow-[0_4px_24px_rgba(109,40,217,.15)] transition-all ${invitAnim ? "animate-pulse" : ""}`}
                    onAnimationEnd={() => setInvitAnim(false)}
                >
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                                    ⚔️
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-500 mb-1">
                                        Défi reçu
                                    </p>
                                    <p className="font-black text-slate-900">
                                        {inv.raison || `Un défi sur ${inv.produit} t'a été lancé !`}
                                    </p>
                                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                        <span>📦 {inv.produit}</span>
                                        <span>⏱ {inv.duree} min</span>
                                        {inv.objectif > 0 && <span>🎯 {inv.objectif} vente{inv.objectif > 1 ? "s" : ""}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => handleRefuser(inv.id)}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition-all hover:border-red-300 hover:text-red-500"
                                >
                                    Refuser
                                </button>
                                <button
                                    onClick={() => handleAccepter(inv.id)}
                                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    Accepter →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* ── Défi actif (une fois accepté = running) ─────────────── */}
            {defisActif && defisActif.status === "running" && (
                <div className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-7 text-white shadow-[0_12px_40px_rgba(109,40,217,.35)] transition-all ${
                    (defiJustAccepte || defiJustRecu) ? "ring-4 ring-white/60 ring-offset-2 ring-offset-slate-50 animate-pulse" : ""
                }`}>
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">⚔️ Défi en cours</p>
                            <div className={`rounded-2xl px-4 py-2 text-center ${
                                parseInt(defiCountdown) <= 5 ? "bg-red-500/30" : "bg-white/10"
                            }`}>
                                <p className="text-xs text-white/50">Temps restant</p>
                                <p className={`text-2xl font-black tabular-nums ${
                                    parseInt(defiCountdown) <= 5 ? "text-red-300 animate-pulse" : "text-white"
                                }`}>
                                    {defiCountdown || "…"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex flex-1 flex-col items-center gap-2">
                                <InitialesAvatar nom={nom} size={52} />
                                <p className="font-black text-white">{nom}</p>
                                <p className="text-xs text-white/50">Toi</p>
                                <p className="text-5xl font-black">{defisActif.scoreConseiller}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center pt-2 flex-shrink-0 px-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl">⚔️</div>
                                <p className="mt-2 text-xs font-black uppercase tracking-widest text-white/40">VS</p>
                                <p className="mt-2 text-xs text-white/50">{defisActif.produit}</p>
                            </div>
                            <div className="flex flex-1 flex-col items-center gap-2">
                                <InitialesAvatar nom={defisActif.adversaire} size={52} />
                                <p className="font-black text-white">{defisActif.adversaire}</p>
                                <p className="text-xs text-white/50">Adversaire</p>
                                <p className="text-5xl font-black">{defisActif.scoreAdversaire}</p>
                            </div>
                        </div>
                        <div className="mt-5 rounded-2xl bg-white/10 px-5 py-3">
                            <p className="text-sm text-white/70">{defisActif.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <StatsBar
                ventes={realiseGlobal}
                objectif={objectifGlobal}
                taux={tauxGlobal}
                rang={rang}
            />

            <section>
                <div className="flex items-end justify-between mb-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">
                            Mission du jour
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-slate-900">Tes objectifs</h2>
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {missions.map((mission) => (
                        <MissionCard
                            key={mission.produit}
                            titre={mission.produit}
                            realise={mission.realise}
                            objectif={mission.objectif}
                            couleur={mission.couleur}
                            onSale={handleSale}
                        />
                    ))}
                </div>
            </section>

        </div>
    );
}
