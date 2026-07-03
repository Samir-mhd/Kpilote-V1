"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
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

    async function chargerDefis() {
        if (!conseillerId) return;
        try {
            const [invits, actif] = await Promise.all([
                getInvitationsPendantes(conseillerId),
                chargerChallenge(conseillerId),
            ]);
            setInvitations(invits);
            setDefiActif(actif);
            if (invits.length > 0) setInvitAnim(true);
        } catch { /* silencieux */ }
    }

    async function handleAccepter(id: string) {
        await accepterChallenge(id);
        await chargerDefis();
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
    }

    return (
        <div className="space-y-8">

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

            {/* ── Défi actif (une fois accepté) ───────────────────────── */}
            {defisActif && (
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-7 text-white shadow-[0_12px_40px_rgba(109,40,217,.35)]">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">⚔️ Défi en cours</p>
                            <div className="rounded-2xl bg-white/10 px-4 py-2 text-center">
                                <p className="text-xs text-white/50">Temps restant</p>
                                <p className="text-xl font-black tabular-nums">
                                    {formatTempsRestant(defisActif.expiresAt)}
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
