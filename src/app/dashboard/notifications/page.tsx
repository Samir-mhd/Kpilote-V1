"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { construireNotifications, NotificationKPILOTE } from "@/services/notificationService";
import { chargerFelicitations } from "@/services/congratulationSupabase";
import { getMissionsCompletes } from "@/services/missionsReelles";
import { chargerChallenge } from "@/services/challengeService";
import { getVentesAujourdhui } from "@/services/missionsReelles";

type Categorie = "tout" | "alertes" | "bravo" | "defis" | "performances";

const catConfig: Record<Categorie, { label: string; icon: string; color: string }> = {
    tout:          { label: "Tout",        icon: "🔔", color: "text-slate-600" },
    alertes:       { label: "Alertes",     icon: "⚠️", color: "text-orange-600" },
    bravo:         { label: "Bravo",       icon: "🎉", color: "text-green-600" },
    defis:         { label: "Défis",       icon: "⚔️", color: "text-violet-600" },
    performances:  { label: "Perfs",       icon: "📊", color: "text-blue-600" },
};

const niveauStyles: Record<string, string> = {
    success: "bg-green-50 border-green-300",
    warning: "bg-orange-50 border-orange-300",
    info:    "bg-blue-50 border-blue-300",
};

type NotifExtended = NotificationKPILOTE & { categorie: Categorie; date?: string };

function NotificationsInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";

    const [notifs, setNotifs] = useState<NotifExtended[]>([]);
    const [categorie, setCategorie] = useState<Categorie>("tout");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        async function charger() {
            setLoading(true);
            try {
                const [missions, challenge, felicitations, ventesJour] = await Promise.all([
                    getMissionsCompletes(conseillerId),
                    chargerChallenge(conseillerId),
                    chargerFelicitations(),
                    getVentesAujourdhui(conseillerId),
                ]);

                const resteTotal = missions.reduce((t, m) => t + m.resteAFaire, 0);
                const classementProxy = 5; // placeholder (serait calculé depuis le classement)

                // Notifications KPILOTE
                const kpiloteNotifs = construireNotifications({
                    ventesJour,
                    objectifRestant: resteTotal,
                    classement: classementProxy,
                    challenge: !!challenge,
                });

                const all: NotifExtended[] = [
                    ...kpiloteNotifs.map((n): NotifExtended => ({
                        ...n,
                        categorie: n.id === "serie" || n.id === "classement" ? "bravo"
                            : n.id === "challenge" ? "defis"
                            : n.id === "objectif" ? "alertes"
                            : "performances",
                    })),
                ];

                // Alertes produits en retard
                missions.filter((m) => m.etat === "retard").forEach((m) => {
                    all.push({
                        id: `retard-${m.produit}`,
                        emoji: "⚠️",
                        titre: `${m.produit} en retard`,
                        message: `Progression : ${m.progression}%. Il reste ${m.resteAFaire} ventes à faire.`,
                        niveau: "warning",
                        categorie: "alertes",
                    });
                });

                // Bravo produits terminés
                missions.filter((m) => m.etat === "termine").forEach((m) => {
                    all.push({
                        id: `termine-${m.produit}`,
                        emoji: "🏆",
                        titre: `${m.produit} — objectif atteint !`,
                        message: `Tu as atteint ton objectif mensuel sur ${m.produit}. Continue sur ta lancée !`,
                        niveau: "success",
                        categorie: "bravo",
                    });
                });

                // Félicitations du manager
                const miesFelicitations = felicitations.filter((f: any) => f.conseiller === searchParams.get("nom"));
                miesFelicitations.forEach((f: any) => {
                    all.push({
                        id: `felicitation-${f.id}`,
                        emoji: "🎉",
                        titre: "Félicitation du manager",
                        message: f.message,
                        niveau: "success",
                        categorie: "bravo",
                        date: f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : undefined,
                    });
                });

                setNotifs(all);
            } catch { /* silencieux */ }
            finally { setLoading(false); }
        }
        charger();
    }, [conseillerId]);

    const filtrees = categorie === "tout" ? notifs : notifs.filter((n) => n.categorie === categorie);
    const counts: Record<Categorie, number> = { tout: notifs.length, alertes: 0, bravo: 0, defis: 0, performances: 0 };
    notifs.forEach((n) => { counts[n.categorie]++; });

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Centre de</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Notifications</h1>
            </div>

            {/* Catégories */}
            <div className="flex flex-wrap gap-2">
                {(Object.entries(catConfig) as [Categorie, typeof catConfig[Categorie]][]).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => setCategorie(key)}
                        className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold transition-all ${
                            categorie === key ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}
                    >
                        {cfg.icon} {cfg.label}
                        {counts[key] > 0 && (
                            <span className={`ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs ${categorie === key ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {counts[key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-400 border-t-transparent" />
                </div>
            ) : filtrees.length === 0 ? (
                <div className="rounded-[24px] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-4xl">🔕</p>
                    <p className="mt-4 text-lg font-black text-slate-400">Tout est calme</p>
                    <p className="mt-1 text-sm text-slate-300">Aucune notification dans cette catégorie.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtrees.map((n) => (
                        <div
                            key={n.id}
                            className={`flex items-start gap-4 rounded-2xl border-l-4 p-5 ${niveauStyles[n.niveau]}`}
                        >
                            <span className="mt-0.5 text-2xl">{n.emoji}</span>
                            <div className="flex-1">
                                <p className="font-black text-slate-800">{n.titre}</p>
                                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                                {n.date && <p className="mt-2 text-xs text-slate-400">{n.date}</p>}
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${catConfig[n.categorie].color} bg-white/60`}>
                                {catConfig[n.categorie].icon}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function NotificationsPage() {
    return <Suspense><NotificationsInner /></Suspense>;
}
