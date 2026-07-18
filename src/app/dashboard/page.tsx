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
import { checkForceActive, clearForceCheck, getLastCheckDate, marquerCheckFait } from "@/services/resetService";
import {
    getInvitationsPendantes,
    accepterChallenge,
    refuserChallenge,
} from "@/services/challengeRepository";
import { chargerChallenge, formatTempsRestant, ChallengeDashboard } from "@/services/challengeService";
import { useAvatarEtat } from "@/hooks/useAvatarEtat";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";
import TeamFeed from "@/components/dashboard/TeamFeed";

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

    // checkLoading : true pendant la vérification DB (évite un flash du check avant la réponse)
    const [checkLoading,          setCheckLoading]          = useState(!!conseillerId);
    const [morningCheckValidated, setMorningCheckValidated] = useState(!conseillerId);
    // checkForced = true uniquement si le manager a déclenché un reset → active la sauvegarde des valeurs
    const [checkForced,           setCheckForced]           = useState(false);

    useEffect(() => {
        if (!conseillerId) return;
        // Vérifie en DB si le check a déjà été fait aujourd'hui (multi-appareils)
        Promise.all([
            checkForceActive(conseillerId),
            getLastCheckDate(conseillerId),
        ])
            .then(([forced, lastCheckDate]) => {
                if (forced) {
                    // Reset manager → check obligatoire même si déjà fait aujourd'hui
                    setCheckForced(true);
                    setMorningCheckValidated(false);
                } else {
                    // Check normal : skip si déjà validé aujourd'hui sur n'importe quel appareil
                    setMorningCheckValidated(lastCheckDate === dateLocale());
                }
            })
            .catch(() => {
                // En cas d'erreur DB, on ne bloque pas le conseiller
                setMorningCheckValidated(true);
            })
            .finally(() => setCheckLoading(false));
    }, [conseillerId]);

    const [totalVentesJour, setTotalVentesJour] = useState(0);
    const [heroMessage, setHeroMessage] = useState("Chargement de ta journée...");
    const [coachMessage, setCoachMessage] = useState("🎯 Commence par ta mission prioritaire du jour.");
    const [missions, setMissions] = useState<MissionDashboard[]>([]);
    const [rang, setRang] = useState(0);

    // Genre du conseiller — récupéré au chargement, stocké en ref pour éviter les closures
    const genreRef = useRef<"H" | "F" | null>(null);

    // Avatar cartoon — état calculé automatiquement selon les ventes du jour
    const { etat: avatarEtat, refresh: refreshAvatar } = useAvatarEtat(conseillerId);
    const [challengeResult, setChallengeResult] = useState<"gagne" | "perdu" | null>(null);
    const [reactionToast, setReactionToast] = useState<{ from: string; emoji: string } | null>(null);

    // Défis : invitations reçues + défi actif
    const [invitations, setInvitations] = useState<any[]>([]);
    const [defisActif, setDefiActif]     = useState<ChallengeDashboard | null>(null);
    const [invitAnim, setInvitAnim]      = useState(false);
    const [defiJustAccepte, setDefiJustAccepte] = useState(false);
    const [defiJustRecu,    setDefiJustRecu]    = useState(false);

    // Ref pour détecter la fin d'un défi via Realtime (victoire ou défaite)
    const prevDefiRef = useRef<typeof defisActif>(null);

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

        // Si expiresAt est déjà dans le passé (challenge ancien sans started_at),
        // on repart de maintenant + duree pour que le chrono soit toujours valide
        // Si expiresAt est déjà passé, on ne relance pas à 0 — le challenge est terminé
        defiExpiresAtRef.current = defisActif.expiresAt > Date.now() ? defisActif.expiresAt : 0;

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
        type: "defi" | "challenge";
        details?: { produit: string; duree: number; objectif: number; adversaire: string };
    } | null>(null);

    async function chargerMissions() {
        if (!conseillerId) return;
        const data = await getMissionsReelles(conseillerId);
        setMissions(data);

        // Dernière vente commerciale (hors Spiderhome) du jour — pour détecter l'inactivité
        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0);
        const { data: dernieres } = await supabase
            .from("ventes")
            .select("created_at, produits(code)")
            .eq("conseiller_id", conseillerId)
            .gte("created_at", debutJour.toISOString())
            .order("created_at", { ascending: false })
            .limit(20);

        let derniereVente: Date | null = null;
        for (const v of (dernieres ?? [])) {
            const code = (Array.isArray((v as any).produits) ? (v as any).produits[0] : (v as any).produits)?.code;
            if (code !== "spiderhome") {
                derniereVente = new Date((v as any).created_at);
                break;
            }
        }

        // Spiderhome n'est pas un acte commercial : exclure du contexte
        const missionsCommerciales = data.filter((m) => m.produit.toLowerCase() !== "spiderhome");
        const contexte = analyserDashboard(
            missionsCommerciales.map((m) => ({ produit: m.produit, objectif: m.objectif, realise: m.realise })),
            genreRef.current,
            derniereVente
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
                .select("conseiller_id, quantite, produits(code)")
                .gte("created_at", debut);
            if (!data) return;
            const totaux: Record<string, number> = {};
            data.forEach((v: any) => {
                const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
                if (code === "spiderhome") return; // historisation, pas un acte commercial
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

            // Détecter fin de challenge via Realtime (adversaire a gagné)
            if (prevDefiRef.current?.status === "running" && !actif) {
                const { data: fini } = await supabase
                    .from("challenges")
                    .select("score_createur, score_adversaire, createur, vainqueur")
                    .eq("id", prevDefiRef.current.id)
                    .eq("status", "finished")
                    .maybeSingle();
                if (fini) {
                    const jeGagne = fini.vainqueur === conseillerId ||
                        (fini.createur === conseillerId
                            ? fini.score_createur > fini.score_adversaire
                            : fini.score_adversaire > fini.score_createur);
                    setChallengeResult(jeGagne ? "gagne" : "perdu");
                }
            }

            prevDefiRef.current = actif;
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
        async function init() {
            if (!conseillerId) return;
            // Charger le genre en premier pour que chargerMissions l'ait disponible
            try {
                const { data } = await supabase
                    .from("conseillers")
                    .select("genre")
                    .eq("id", conseillerId)
                    .single();
                genreRef.current = (data?.genre as "H" | "F") ?? null;
            } catch { /* genre inconnu = défaut masculin */ }
            await Promise.all([chargerMissions(), chargerRang(), chargerDefis()]);
        }
        init();
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

    // Réactions reçues des collègues
    useEffect(() => {
        if (!conseillerId) return;
        const channel = supabase
            .channel(`reactions-${conseillerId}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "reactions",
                filter: `to_id=eq.${conseillerId}`,
            }, (payload: any) => {
                const r = payload.new;
                setReactionToast({ from: r.from_nom, emoji: r.emoji });
                setTimeout(() => setReactionToast(null), 5000);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [conseillerId]);

    if (checkLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#060612" }}>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    if (!morningCheckValidated) {
        return (
            <MorningCheck
                nom={nom}
                conseillerId={conseillerId}
                isReset={checkForced}
                onValidated={() => {
                    if (conseillerId) {
                        marquerCheckFait(conseillerId).catch(() => {});
                        clearForceCheck(conseillerId).catch(() => {});
                    }
                    setCheckForced(false);
                    setMorningCheckValidated(true);
                    // Recharge les missions après le check (les valeurs viennent d'être sauvées)
                    chargerMissions();
                    chargerRang();
                }}
            />
        );
    }

    // Spiderhome = historisation, pas un acte commercial → exclu des totaux
    const missionsCommerciales = missions.filter((m) => m.produit.toLowerCase() !== "spiderhome");
    const realiseGlobal = missionsCommerciales.reduce((t, m) => t + m.realise, 0);
    const objectifGlobal = missionsCommerciales.reduce((t, m) => t + m.objectif, 0);
    const tauxGlobal = objectifGlobal > 0 ? Math.round((realiseGlobal / objectifGlobal) * 100) : 0;

    async function handleSale(produit: string) {
        const mission = missions.find((m) => m.produit === produit);
        if (!mission) return;
        const isHistorisation = produit.toLowerCase() === "spiderhome";
        if (conseillerId) {
            await traiterVente({ conseillerId, produit });
            await chargerMissions();
            await chargerRang();
            refreshAvatar();
        }
        // Spiderhome = historisation : ne compte pas dans les actes commerciaux
        if (isHistorisation) {
            setCoachMessage("📋 Historisation enregistrée. Continue !");
            return;
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
                setChallengeResult("gagne");
            }
        }
    }

    return (
        <div className="space-y-8">

            {/* ── Overlay résultat challenge (gagné / perdu) ────────────── */}
            {challengeResult && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
                    style={{ background: "rgba(4,4,16,.95)", backdropFilter: "blur(20px)" }}
                >
                    {/* Halos de fond selon résultat */}
                    {challengeResult === "gagne" ? (
                        <>
                            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-amber-400/10 blur-3xl" />
                            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-yellow-500/15 blur-2xl" style={{ animation: "resultPulse 2s ease-in-out infinite" }} />
                        </>
                    ) : (
                        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-900/40 blur-3xl" />
                    )}

                    <div
                        className="relative flex flex-col items-center gap-8 text-center px-8"
                        style={{ animation: "resultIn .55s cubic-bezier(.34,1.56,.64,1)" }}
                    >
                        {/* Badge */}
                        <p className="text-xs font-black uppercase tracking-[0.5em] text-violet-400">
                            Résultat du challenge
                        </p>

                        {/* Avatar avec rebond */}
                        <div style={{ animation: "avatarFloat 2.4s ease-in-out infinite" }}>
                            <CartoonAvatar
                                prenom={nom}
                                etat="souriant_main"
                                size={340}
                                className="drop-shadow-[0_30px_60px_rgba(139,92,246,.5)]"
                            />
                        </div>

                        {/* Résultat */}
                        <div className="flex flex-col items-center gap-3">
                            <p className={`text-7xl font-black ${challengeResult === "gagne" ? "text-amber-300" : "text-white"}`}>
                                {challengeResult === "gagne" ? "🏆 Tu as gagné !" : "😔 Challenge perdu"}
                            </p>
                            <p className="text-white/50 text-lg max-w-md leading-8">
                                {challengeResult === "gagne"
                                    ? "Impressionnant ! Cette victoire, c'est ton énergie pour la suite."
                                    : "Pas grave — les meilleurs rebondissent. La prochaine est pour toi."}
                            </p>
                        </div>

                        <button
                            onClick={() => setChallengeResult(null)}
                            className="mt-2 rounded-3xl px-12 py-5 text-base font-black text-white shadow-[0_8px_32px_rgba(109,40,217,.5)] transition-all hover:scale-105"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                        >
                            Continuer →
                        </button>
                    </div>

                    <style>{`
                        @keyframes resultIn {
                            from { opacity:0; transform:scale(.75) translateY(60px); }
                            to   { opacity:1; transform:scale(1) translateY(0); }
                        }
                        @keyframes avatarFloat {
                            0%,100% { transform:translateY(0); }
                            50%     { transform:translateY(-18px); }
                        }
                        @keyframes resultPulse {
                            0%,100% { opacity:.15; transform:translate(-50%,-50%) scale(1); }
                            50%     { opacity:.3;  transform:translate(-50%,-50%) scale(1.15); }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Toast réaction collègue ──────────────────────────────── */}
            {reactionToast && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-[20px] bg-white px-6 py-4 shadow-[0_12px_40px_rgba(0,0,0,.18)]"
                    style={{ animation: "slideUp .4s cubic-bezier(.34,1.56,.64,1)" }}
                >
                    <span className="text-4xl" style={{ animation: "reactPop .4s ease" }}>{reactionToast.emoji}</span>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Réaction d'équipe</p>
                        <p className="text-sm font-black text-slate-900">
                            {reactionToast.from.split(" ")[0]} t'a envoyé {reactionToast.emoji}
                        </p>
                    </div>
                    <style>{`
                        @keyframes slideUp {
                            from { opacity:0; transform:translateY(20px) scale(.95); }
                            to   { opacity:1; transform:translateY(0) scale(1); }
                        }
                        @keyframes reactPop {
                            0%  { transform:scale(.4); } 70% { transform:scale(1.3); } 100% { transform:scale(1); }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Toast popup challenge/défi/félicitations ─────────────── */}
            {toast && (
                <div
                    className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm"
                    style={{ animation: "slideDown .4s cubic-bezier(.34,1.56,.64,1)" }}
                >
                    <div className={`relative overflow-hidden rounded-[24px] p-6 shadow-[0_16px_56px_rgba(0,0,0,.45)] ${
                        toast.type === "challenge" ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                        :                           "bg-gradient-to-br from-violet-600 to-indigo-700"
                    } text-white`}>

                        {/* Halo déco */}
                        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                        <div className="relative">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">
                                        {toast.type === "challenge" ? "🎯" : "⚔️"}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">
                                            {toast.type === "challenge" ? "Challenge reçu" : "Défi reçu"}
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
                                                De la part de
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
                avatarEtat={avatarEtat}
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
                <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br from-violet-700 via-indigo-700 to-purple-800 px-7 pt-6 pb-7 text-white shadow-[0_20px_60px_rgba(109,40,217,.5)] transition-all ${
                    (defiJustAccepte || defiJustRecu) ? "ring-4 ring-white/60 ring-offset-2 ring-offset-slate-50" : ""
                }`}>
                    {/* Halos déco */}
                    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
                    <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

                    <div className="relative">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">⚔️ Défi en cours</p>
                            <div className={`rounded-2xl px-5 py-2 text-center ${
                                parseInt(defiCountdown) <= 5 ? "bg-red-500/40" : "bg-white/10"
                            }`}>
                                <p className="text-[10px] text-white/50 uppercase tracking-wider">Temps restant</p>
                                <p className={`text-3xl font-black tabular-nums ${
                                    parseInt(defiCountdown) <= 5 ? "text-red-300 animate-pulse" : "text-white"
                                }`}>
                                    {defiCountdown || "…"}
                                </p>
                            </div>
                        </div>

                        {/* Avatars VS */}
                        <div className="flex items-end gap-0">
                            {/* Conseiller */}
                            <div className="flex flex-1 flex-col items-center">
                                <div style={{ animation: "defiFloat 3s ease-in-out infinite" }}>
                                    <CartoonAvatar prenom={nom} etat="souriant_main" size={130}
                                        className="drop-shadow-[0_12px_24px_rgba(0,0,0,.4)]" />
                                </div>
                                <p className="mt-2 font-black text-white text-sm">{nom.split(" ")[0]}</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider">Toi</p>
                                <p className="mt-1 text-6xl font-black tabular-nums">{defisActif.scoreConseiller}</p>
                            </div>

                            {/* Centre VS */}
                            <div className="flex flex-col items-center pb-10 flex-shrink-0 px-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-3xl shadow-inner">
                                    ⚔️
                                </div>
                                <p className="mt-2 text-sm font-black uppercase tracking-widest text-white/30">VS</p>
                                <p className="mt-1 text-[10px] text-white/40">{defisActif.produit}</p>
                            </div>

                            {/* Adversaire */}
                            <div className="flex flex-1 flex-col items-center">
                                <div style={{ animation: "defiFloat 3s ease-in-out infinite", animationDelay: "1.2s" }}>
                                    <CartoonAvatar prenom={defisActif.adversaire} etat="souriant_main" size={130}
                                        className="drop-shadow-[0_12px_24px_rgba(0,0,0,.4)]" />
                                </div>
                                <p className="mt-2 font-black text-white text-sm">{defisActif.adversaire.split(" ")[0]}</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider">Adversaire</p>
                                <p className="mt-1 text-6xl font-black tabular-nums">{defisActif.scoreAdversaire}</p>
                            </div>
                        </div>

                        {defisActif.message && (
                            <div className="mt-5 rounded-2xl bg-white/10 px-5 py-3">
                                <p className="text-sm text-white/70">{defisActif.message}</p>
                            </div>
                        )}
                    </div>

                    <style>{`
                        @keyframes defiFloat {
                            0%,100% { transform:translateY(0) rotate(-1deg); }
                            50%     { transform:translateY(-10px) rotate(1deg); }
                        }
                    `}</style>
                </div>
            )}

            <StatsBar
                ventes={realiseGlobal}
                objectif={objectifGlobal}
                taux={tauxGlobal}
                rang={rang}
            />

            <TeamFeed conseillerId={conseillerId} />

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
