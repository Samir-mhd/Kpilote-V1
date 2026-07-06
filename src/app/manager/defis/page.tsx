"use client";

import { useEffect, useState } from "react";
import {
    chargerDefis,
    chargerChallenges,
    chargerClassementDefisEtChallenges,
    DefiRow,
    ChallengeRow,
    StatsConseiller,
    cloturerChallengesExpires,
} from "@/services/defisService";
import {
    chargerDefisActifsManager,
    DefiActifManager,
    cloturerChallenge,
} from "@/services/challengeRepository";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatTempsRestant } from "@/services/challengeService";
import InitialesAvatar from "@/components/avatar/InitialesAvatar";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";
import LancerDefiCard from "@/components/manager/LancerDefiCard";

// ─── Chrono live ──────────────────────────────────────────────────────────────

function Chrono({ expiresAt, duree }: { expiresAt: number; duree: number }) {
    // useRef pour stabiliser la valeur cible — ne redémarre PAS l'intervalle
    // quand le parent re-rend (polling 30s), contrairement à useEffect([targetExpiry])
    const targetRef = useRef(
        expiresAt > Date.now()
            ? expiresAt
            : Date.now() + (duree ?? 30) * 60 * 1000
    );

    const [label, setLabel] = useState(formatTempsRestant(targetRef.current));

    useEffect(() => {
        // Lance une seule fois, l'intervalle utilise la ref stable
        const t = setInterval(() => {
            const r = targetRef.current - Date.now();
            setLabel(r <= 0 ? "0:00" : formatTempsRestant(targetRef.current));
            if (r <= 0) clearInterval(t);
        }, 1000);
        return () => clearInterval(t);
    }, []); // Dépendances vides = run once

    const mins = parseInt(label.split(":")[0]);
    return (
        <span className={`text-2xl font-black tabular-nums ${
            mins <= 1 ? "text-red-300 animate-pulse" : mins <= 5 ? "text-amber-300" : "text-white"
        }`}>
            {label}
        </span>
    );
}

// ─── Carte défi actif (manager) ───────────────────────────────────────────────

function CarteDefiActif({ defi, onCloture }: { defi: DefiActifManager; onCloture: () => void }) {
    const [cloturing, setCloturing] = useState(false);

    async function handleCloture() {
        setCloturing(true);
        try {
            await cloturerChallenge({ id: defi.id });
            onCloture();
        } finally { setCloturing(false); }
    }

    const estExpire = defi.expiresAt <= Date.now() && defi.expiresAt > 0;
    const estPending = defi.status === "pending";

    return (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-[0_8px_32px_rgba(15,23,42,.40)]">
            {/* Halo */}
            <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            estPending
                                ? "bg-amber-500/20 text-amber-300"
                                : estExpire
                                ? "bg-red-500/20 text-red-300"
                                : "bg-green-500/20 text-green-300"
                        }`}>
                            {estPending ? "⏳ En attente d'acceptation" : estExpire ? "⏱ Expiré" : "⚔️ En cours"}
                        </span>
                        <span className="text-xs text-white/30">{defi.produit}</span>
                        {defi.objectif > 0 && (
                            <span className="text-xs text-white/30">· {defi.objectif} vente{defi.objectif > 1 ? "s" : ""}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!estPending && (
                            <div className="text-center">
                                <p className="text-xs text-white/30">Temps</p>
                                <Chrono key={defi.id} expiresAt={defi.expiresAt} duree={defi.duree} />
                            </div>
                        )}
                        <button
                            onClick={handleCloture}
                            disabled={cloturing}
                            className="rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-black text-white/60 transition-all hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                        >
                            {cloturing ? "…" : "Clôturer"}
                        </button>
                    </div>
                </div>

                {/* VS */}
                <div className="flex items-center gap-4">
                    {/* Créateur */}
                    <div className="flex flex-1 items-center gap-3">
                        <InitialesAvatar nom={defi.createurNom} size={44} />
                        <div>
                            <p className="font-black text-white">{defi.createurNom}</p>
                            <p className="text-xs text-white/40">Créateur</p>
                        </div>
                        <p className="ml-auto text-4xl font-black text-white">{defi.scoreCreateur}</p>
                    </div>

                    {/* Centre */}
                    <div className="flex flex-col items-center px-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-xl">⚔️</div>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/25">VS</p>
                        <p className="mt-1 text-xs text-white/30">{defi.duree} min</p>
                    </div>

                    {/* Adversaire */}
                    <div className="flex flex-1 items-center justify-end gap-3">
                        <p className="mr-auto text-4xl font-black text-white">{defi.scoreAdversaire}</p>
                        <div className="text-right">
                            <p className="font-black text-white">{defi.adversaireNom}</p>
                            <p className="text-xs text-white/40">Adversaire</p>
                        </div>
                        <InitialesAvatar nom={defi.adversaireNom} size={44} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Badges résultat ──────────────────────────────────────────────────────────

function BadgeDefi({ vainqueur, statut }: Pick<DefiRow, "vainqueur" | "participants" | "statut">) {
    if (statut === "en cours") return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">⚔️ En cours</span>;
    if (!vainqueur) return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">🤝 Égalité</span>;
    return <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">🏆 {vainqueur}</span>;
}

function BadgeChallenge({ resultat }: { resultat: ChallengeRow["resultat"] }) {
    if (resultat === "en cours") return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">⏳ En cours</span>;
    if (resultat === "réussi")   return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">✅ Réussi</span>;
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">❌ Échoué</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DefisPage() {
    const [defisActifs, setDefisActifs]   = useState<DefiActifManager[]>([]);
    const [defis, setDefis]               = useState<DefiRow[]>([]);
    const [challenges, setChallenges]     = useState<ChallengeRow[]>([]);
    const [classement, setClassement]     = useState<StatsConseiller[]>([]);
    const [photos, setPhotos]             = useState<Record<string, string | null>>({});
    const [conseillers, setConseillers]   = useState<{ id: string; prenom: string }[]>([]);
    const [loading, setLoading]           = useState(true);
    const [onglet, setOnglet]             = useState<"boutique" | "classement">("boutique");

    async function charger() {
        try {
            await cloturerChallengesExpires().catch(() => {});
            const [actifs, d, c, cl, resC] = await Promise.all([
                chargerDefisActifsManager(),
                chargerDefis(),
                chargerChallenges(),
                chargerClassementDefisEtChallenges(),
                supabase.from("conseillers").select("id, nom"),
            ]);
            setDefisActifs(actifs);
            setDefis(d);
            setChallenges(c);
            setClassement(cl);
            setConseillers(
                (resC.data ?? []).map((c: any) => ({ id: c.id, prenom: c.nom.split(" ")[0] }))
            );
            const ids = cl.map(c => c.id).filter(Boolean);
            if (ids.length) getPhotosByIds(ids).then(setPhotos).catch(() => {});
        } catch { /* silencieux */ }
        finally { setLoading(false); }
    }

    useEffect(() => {
        charger();

        // Realtime : toute modification sur challenges → recharge immédiatement
        const channel = supabase
            .channel("manager-defis-rt")
            .on("postgres_changes", {
                event: "*", schema: "public", table: "challenges",
            }, () => { charger(); })
            .subscribe();

        // Polling de sécurité toutes les 30s
        const poll = setInterval(charger, 30_000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(poll);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <main className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900">Défis & Challenges</h1>
                    <p className="mt-2 text-slate-400">Défis entre conseillers · Challenges individuels</p>
                </div>
                {defisActifs.length > 0 && (
                    <div className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-2.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-sm font-black text-violet-700">
                            {defisActifs.length} défi{defisActifs.length > 1 ? "s" : ""} actif{defisActifs.length > 1 ? "s" : ""}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Lancer un défi / challenge ───────────────────────────── */}
            {conseillers.length >= 2 && (
                <LancerDefiCard conseillers={conseillers} />
            )}

            {/* ── Défis actifs en haut ──────────────────────────────────── */}
            {defisActifs.length > 0 && (
                <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                        ⚔️ En cours maintenant
                    </p>
                    {defisActifs.map((d) => (
                        <CarteDefiActif key={d.id} defi={d} onCloture={charger} />
                    ))}
                </div>
            )}

            {/* ── Onglets ────────────────────────────────────────────────── */}
            <div className="flex gap-3">
                {(["boutique", "classement"] as const).map((v) => (
                    <button key={v} onClick={() => setOnglet(v)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                            onglet === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}>
                        {v === "boutique" ? "⚔️ Boutique" : "📊 Classement"}
                    </button>
                ))}
            </div>

            {/* ── Vue Boutique ───────────────────────────────────────────── */}
            {onglet === "boutique" && (
                <div className="grid gap-6 xl:grid-cols-2">

                    {/* Défis */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-sm">⚔️</div>
                            <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Défis</p>
                                <p className="text-xs text-slate-400">Entre conseillers</p>
                            </div>
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">{defis.length}</span>
                        </div>

                        {defis.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-6 text-center">
                                <p className="text-2xl">⚔️</p>
                                <p className="mt-2 text-sm font-semibold text-slate-400">Aucun défi pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {defis.map((defi) => (
                                    <div key={defi.id} className="rounded-2xl bg-slate-50 p-5 hover:bg-slate-100 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {defi.participants.map((p, i) => (
                                                        <span key={i} className="flex items-center gap-1">
                                                            {i > 0 && <span className="text-xs text-slate-300">vs</span>}
                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{p}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="mt-2 text-sm font-semibold text-slate-700">{defi.produit}</p>
                                                {defi.statut === "terminé" && (
                                                    <p className="mt-1 text-xl font-black text-slate-800">
                                                        {defi.scoreCreateur}
                                                        <span className="mx-2 text-sm font-normal text-slate-300">–</span>
                                                        {defi.scoreAdversaire}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <BadgeDefi vainqueur={defi.vainqueur} participants={defi.participants} statut={defi.statut} />
                                                <p className="text-xs text-slate-300">{defi.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Challenges */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm">🎯</div>
                            <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Challenges</p>
                                <p className="text-xs text-slate-400">KPILOTE → conseiller individuel</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">{challenges.length}</span>
                        </div>

                        {challenges.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-6 text-center">
                                <p className="text-2xl">🎯</p>
                                <p className="mt-2 text-sm font-semibold text-slate-400">Aucun challenge individuel</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {challenges.map((ch) => (
                                    <div key={ch.id} className="rounded-2xl bg-slate-50 p-5 hover:bg-slate-100 transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{ch.conseiller}</span>
                                                <p className="mt-2 text-sm font-semibold text-slate-700">{ch.produit}</p>
                                                {ch.objectif > 0 && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                                            <div className="h-full rounded-full bg-emerald-500"
                                                                style={{ width: `${Math.min(Math.round((ch.realise / ch.objectif) * 100), 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-slate-400">{ch.realise}/{ch.objectif}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <BadgeChallenge resultat={ch.resultat} />
                                                <p className="text-xs text-slate-300">{ch.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Vue Classement détaillé ────────────────────────────────── */}
            {onglet === "classement" && (
                <div className="space-y-3">
                    {classement.length === 0 ? (
                        <div className="rounded-[24px] bg-white p-10 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="text-3xl">⚔️</p>
                            <p className="mt-3 font-black text-slate-400">Aucune donnée disponible</p>
                        </div>
                    ) : classement.map((c, idx) => {
                        const totalD  = c.defis.gagne + c.defis.perdu + c.defis.egalite;
                        const totalCh = c.challenges.reussi + c.challenges.echoue;
                        const tauxD   = totalD  > 0 ? Math.round((c.defis.gagne  / totalD)  * 100) : 0;
                        const tauxCh  = totalCh > 0 ? Math.round((c.challenges.reussi / totalCh) * 100) : 0;
                        const score   = c.defis.gagne * 3 + c.defis.egalite + c.challenges.reussi * 2;
                        const medals  = ["🥇", "🥈", "🥉"];

                        return (
                            <div key={c.id} className={`relative overflow-hidden rounded-[22px] bg-white shadow-[0_2px_16px_rgba(15,23,42,.06)] transition-all hover:shadow-[0_6px_28px_rgba(15,23,42,.10)] ${
                                idx === 0 ? "ring-2 ring-amber-300/60" : ""
                            }`}>
                                {idx === 0 && (
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-50/60 via-transparent to-transparent" />
                                )}

                                <div className="relative flex items-stretch">

                                    {/* Rang + identité */}
                                    <div className="flex items-center gap-4 px-5 py-5 flex-shrink-0 w-52">
                                        <span className="w-7 text-center flex-shrink-0">
                                            {idx < 3
                                                ? <span className="text-xl">{medals[idx]}</span>
                                                : <span className="text-sm font-black text-slate-300">{idx + 1}</span>
                                            }
                                        </span>
                                        <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={42} />
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 truncate text-sm">{c.nom}</p>
                                            {c.challenges.enCours > 0 && (
                                                <p className="text-[10px] text-amber-500 font-bold">⏳ {c.challenges.enCours} en cours</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Séparateur vertical */}
                                    <div className="w-px bg-slate-100 my-4 flex-shrink-0" />

                                    {/* Défis */}
                                    <div className="flex-1 px-5 py-4 flex flex-col justify-center gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400">⚔️ Défis</span>
                                            {totalD > 0
                                                ? <span className="text-xs font-black text-violet-600">{tauxD}% victoire</span>
                                                : <span className="text-[10px] text-slate-300">Aucun défi</span>
                                            }
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {c.defis.gagne > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-black text-violet-700">
                                                    🏆 {c.defis.gagne} gagné{c.defis.gagne > 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {c.defis.egalite > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                                                    🤝 {c.defis.egalite} égalité{c.defis.egalite > 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {c.defis.perdu > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-400">
                                                    💪 {c.defis.perdu} perdu{c.defis.perdu > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>
                                        {totalD > 0 && (
                                            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div className="bg-violet-500 transition-all" style={{ width: `${(c.defis.gagne / totalD) * 100}%` }} />
                                                <div className="bg-slate-300 transition-all" style={{ width: `${(c.defis.egalite / totalD) * 100}%` }} />
                                                <div className="bg-red-200 transition-all" style={{ width: `${(c.defis.perdu / totalD) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Séparateur vertical */}
                                    <div className="w-px bg-slate-100 my-4 flex-shrink-0" />

                                    {/* Challenges */}
                                    <div className="flex-1 px-5 py-4 flex flex-col justify-center gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">🎯 Challenges</span>
                                            {totalCh > 0
                                                ? <span className="text-xs font-black text-emerald-600">{tauxCh}% réussis</span>
                                                : <span className="text-[10px] text-slate-300">Aucun challenge</span>
                                            }
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {c.challenges.reussi > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                                                    ✅ {c.challenges.reussi} réussi{c.challenges.reussi > 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {c.challenges.echoue > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-400">
                                                    ❌ {c.challenges.echoue} échoué{c.challenges.echoue > 1 ? "s" : ""}
                                                </span>
                                            )}
                                            {c.challenges.enCours > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-500">
                                                    ⏳ {c.challenges.enCours} en cours
                                                </span>
                                            )}
                                        </div>
                                        {totalCh > 0 && (
                                            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div className="bg-emerald-500 transition-all" style={{ width: `${(c.challenges.reussi / totalCh) * 100}%` }} />
                                                <div className="bg-red-200 transition-all" style={{ width: `${(c.challenges.echoue / totalCh) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Séparateur vertical */}
                                    <div className="w-px bg-slate-100 my-4 flex-shrink-0" />

                                    {/* Score total */}
                                    <div className="flex flex-col items-center justify-center px-6 py-4 flex-shrink-0 w-24">
                                        <p className={`text-3xl font-black tabular-nums ${idx === 0 ? "text-amber-500" : "text-slate-800"}`}>{score}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">pts</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

        </main>
    );
}
