"use client";

import { Suspense } from "react";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { chargerHistoriqueChallenges, HistoriqueItem } from "@/services/challengeHistoryService";
import { chargerChallenge, formatTempsRestant } from "@/services/challengeService";
import { cloturerChallenge } from "@/services/challengeRepository";
import { creerChallenge } from "@/services/challengeSupabase";
import { getConseillers, getChallengeSuggestion } from "@/services/conseillers";
import { chargerClassementDefisEtChallenges, StatsConseiller } from "@/services/defisService";
import { getPhotosByIds } from "@/services/photoService";
import InitialesAvatar from "@/components/avatar/InitialesAvatar";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

const PRODUITS = ["Box", "Forfaits", "Téléphones", "McAfee", "Assurance"];
const DUREES = [15, 30, 45, 60];

// ─── Joueur VS ────────────────────────────────────────────────────────────────

function JoueurVS({
    nom,
    score,
    estMoi,
    isWinner,
    isLoser,
}: {
    nom: string;
    score: number;
    estMoi?: boolean;
    isWinner?: boolean;
    isLoser?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-3 flex-1">
            <div className={`relative rounded-full ${isWinner ? "ring-4 ring-green-400" : isLoser ? "ring-4 ring-red-400/40" : "ring-2 ring-white/20"}`}>
                <InitialesAvatar nom={nom} size={64} />
                {isWinner && (
                    <span className="absolute -top-2 -right-2 text-xl">👑</span>
                )}
            </div>
            <div className="text-center">
                <p className="font-black text-white text-lg leading-tight">{nom}</p>
                {estMoi && (
                    <p className="text-xs text-white/50 font-semibold">Toi</p>
                )}
            </div>
            <p className={`text-6xl font-black tabular-nums ${
                isWinner ? "text-green-300" : isLoser ? "text-white/40" : "text-white"
            }`}>
                {score}
            </p>
        </div>
    );
}

// ─── Carte historique ────────────────────────────────────────────────────────

const RESULTAT_CONFIG = {
    victory: { label: "Victoire",  bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  icon: "🏆" },
    defeat:  { label: "Défaite",   bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",      icon: "💪" },
    draw:    { label: "Égalité",   bg: "bg-slate-50",  border: "border-slate-200",  badge: "bg-slate-100 text-slate-600",  icon: "🤝" },
    en_cours:{ label: "En cours",  bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  icon: "⚔️" },
};

function CarteHistorique({ item, nom }: { item: HistoriqueItem; nom: string }) {
    const cfg = RESULTAT_CONFIG[item.resultat] ?? RESULTAT_CONFIG.draw;

    return (
        <div className={`rounded-[20px] border ${cfg.bg} ${cfg.border} p-5 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${cfg.badge}`}>
                    {cfg.icon} {cfg.label}
                </span>
                <span className="text-xs text-slate-400">{item.date}</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                    <InitialesAvatar nom={item.nomMoi} size={40} />
                    <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm truncate">{item.nomMoi}</p>
                        <p className="text-xs text-slate-400">Toi</p>
                    </div>
                </div>

                <div className="flex-shrink-0 text-center px-3">
                    <p className="text-2xl font-black tabular-nums text-slate-800 leading-none">
                        <span className={item.resultat === "victory" ? "text-green-600" : ""}>{item.scoreMoi}</span>
                        <span className="mx-1.5 text-slate-300 text-lg">–</span>
                        <span className={item.resultat === "defeat" ? "text-red-500" : ""}>{item.scoreAdversaire}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400 font-semibold">{item.produit}</p>
                    <p className="text-xs text-slate-300">{item.duree}</p>
                </div>

                <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
                    <div className="min-w-0 text-right">
                        <p className="font-black text-slate-800 text-sm truncate">{item.nomAdversaire}</p>
                        <p className="text-xs text-slate-400">Adversaire</p>
                    </div>
                    <InitialesAvatar nom={item.nomAdversaire} size={40} />
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

function ChallengesInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const nom = searchParams.get("nom") ?? "Conseiller";

    const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
    const [actif, setActif] = useState<any>(null);
    const [countdown, setCountdown] = useState<string>("");
    const [termine, setTermine] = useState(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [conseillers, setConseillers] = useState<any[]>([]);
    const [suggestion, setSuggestion] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({ adversaires: [] as string[], produit: "Box", duree: 30, objectif: 5 });
    const [envoi, setEnvoi] = useState(false);
    const [succes, setSucces] = useState<string | null>(null);
    const [onglet, setOnglet] = useState<"historique" | "classement" | "envoyer">("historique");
    const [classement, setClassement] = useState<StatsConseiller[]>([]);
    const [photos, setPhotos] = useState<Record<string, string | null>>({});

    // Re-check toutes les 30s : si le défi n'est plus actif en DB → efface le bloc
    useEffect(() => {
        if (!actif || !conseillerId) return;
        const interval = setInterval(async () => {
            try {
                const enCours = await chargerChallenge(conseillerId);
                if (!enCours) {
                    setActif(null);
                    const hist = await chargerHistoriqueChallenges(conseillerId, nom).catch(() => []);
                    setHistorique(hist);
                    setOnglet("historique");
                }
            } catch {}
        }, 30_000);
        return () => clearInterval(interval);
    }, [actif?.id]);

    // Countdown live + clôture automatique
    useEffect(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (!actif?.id || actif.status !== "running") return;

        // Si expiresAt est déjà passé, on considère le challenge terminé — pas de relance à 0
        const targetExpiry = actif.expiresAt > Date.now() ? actif.expiresAt : 0;

        setCountdown(formatTempsRestant(targetExpiry));
        setTermine(false);

        countdownRef.current = setInterval(async () => {
            const remaining = targetExpiry - Date.now();
            if (remaining <= 0) {
                clearInterval(countdownRef.current!);
                setCountdown("0:00");
                setTermine(true);
                try {
                    await cloturerChallenge({
                        id: actif.id,
                        createur: actif.createurId,
                        adversaire: actif.adversaireId,
                        score_createur: actif.scoreConseiller,
                        score_adversaire: actif.scoreAdversaire,
                    });
                } catch {}
                setTimeout(async () => {
                    const hist = await chargerHistoriqueChallenges(conseillerId, nom).catch(() => []);
                    setHistorique(hist);
                    setActif(null);
                    setTermine(false);
                    setOnglet("historique");
                }, 2000);
            } else {
                setCountdown(formatTempsRestant(targetExpiry));
            }
        }, 1000);

        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [actif?.id]);

    useEffect(() => {
        if (!conseillerId) return;
        async function charger() {
            setLoading(true);
            try {
                const [hist, actifData, consData, suggData, cl] = await Promise.all([
                    chargerHistoriqueChallenges(conseillerId, nom),
                    chargerChallenge(conseillerId),
                    getConseillers(),
                    getChallengeSuggestion(conseillerId),
                    chargerClassementDefisEtChallenges(),
                ]);
                setHistorique(hist);
                setActif(actifData);
                setConseillers(consData.filter((c: any) => c.id !== conseillerId));
                setSuggestion(suggData);
                setClassement(cl);
                const ids = cl.map((c: StatsConseiller) => c.id).filter(Boolean);
                if (ids.length) getPhotosByIds(ids).then(setPhotos).catch(() => {});
                if (suggData?.adversaire && consData.length > 0) {
                    const adv = consData.find((c: any) => c.nom === suggData.adversaire || c.prenom === suggData.adversaire);
                    if (adv) setForm((f) => ({ ...f, adversaires: [adv.id], produit: suggData.produit ?? "Box" }));
                }
            } catch { /* silencieux */ }
            finally { setLoading(false); }
        }
        charger();
    }, [conseillerId]);

    function toggleAdversaire(id: string) {
        setForm((f) => ({
            ...f,
            adversaires: f.adversaires.includes(id)
                ? f.adversaires.filter((a) => a !== id)
                : [...f.adversaires, id],
        }));
        setSucces(null);
    }

    async function handleEnvoyer() {
        if (form.adversaires.length === 0 || !conseillerId) return;
        setEnvoi(true);
        setSucces(null);
        try {
            await Promise.all(
                form.adversaires.map((adversaire) =>
                    creerChallenge({
                        createur: conseillerId,
                        adversaire,
                        produit: form.produit,
                        duree: form.duree,
                        objectif: form.objectif,
                        raison: `${nom} t'a lancé un défi sur ${form.produit} — objectif : ${form.objectif} vente${form.objectif > 1 ? "s" : ""} !`,
                    })
                )
            );
            const noms = form.adversaires
                .map((id) => conseillers.find((c: any) => c.id === id)?.nom ?? "?")
                .join(", ");
            setSucces(`Défi${form.adversaires.length > 1 ? "s" : ""} envoyé${form.adversaires.length > 1 ? "s" : ""} à ${noms} ! ⚔️`);
            setForm((f) => ({ ...f, adversaires: [] }));
        } finally {
            setEnvoi(false);
        }
    }

    const minutesRestantes = countdown ? parseInt(countdown.split(":")[0]) : 99;

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" /></div>;
    }

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">Challenges</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Défis & Challenges</h1>
            </div>

            {/* ── Défi actif ──────────────────────────────────────────────────── */}
            {actif && (
                <div className={`relative overflow-hidden rounded-[28px] p-8 text-white shadow-[0_12px_48px_rgba(109,40,217,.35)] transition-all ${
                    termine ? "bg-gradient-to-br from-slate-700 to-slate-800" : "bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700"
                }`}>
                    <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">
                                {termine ? "⏱ Défi terminé — résultat en cours…" : "⚔️ Défi en cours"}
                            </p>
                            <div className={`rounded-2xl px-5 py-2.5 text-center ${
                                minutesRestantes <= 1 ? "bg-red-500/40" : minutesRestantes <= 5 ? "bg-orange-500/30" : "bg-white/10"
                            }`}>
                                <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">Temps</p>
                                <p className={`text-3xl font-black tabular-nums tracking-tight ${
                                    minutesRestantes <= 5 ? "text-red-200 animate-pulse" : "text-white"
                                }`}>
                                    {countdown || actif.tempsRestant}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <JoueurVS
                                nom={nom}
                                score={actif.scoreConseiller}
                                estMoi
                                isWinner={actif.scoreConseiller > actif.scoreAdversaire}
                                isLoser={actif.scoreConseiller < actif.scoreAdversaire}
                            />
                            <div className="flex flex-col items-center justify-center pt-4 flex-shrink-0">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-3xl">⚔️</div>
                                <p className="mt-2 text-xs font-black uppercase tracking-widest text-white/40">VS</p>
                                <p className="mt-3 text-xs text-white/50 font-semibold">{actif.produit}</p>
                                <p className="text-xs text-white/30">{actif.duree} min</p>
                            </div>
                            <JoueurVS
                                nom={actif.adversaire}
                                score={actif.scoreAdversaire}
                                isWinner={actif.scoreAdversaire > actif.scoreConseiller}
                                isLoser={actif.scoreAdversaire < actif.scoreConseiller}
                            />
                        </div>

                        <div className="mt-6 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                            <p className="text-sm leading-6 text-white/80">{actif.message}</p>
                        </div>

                        {(termine || countdown === "0:00") && (
                            <button
                                onClick={async () => {
                                    const enCours = await chargerChallenge(conseillerId).catch(() => null);
                                    if (!enCours) {
                                        setActif(null);
                                        const hist = await chargerHistoriqueChallenges(conseillerId, nom).catch(() => []);
                                        setHistorique(hist);
                                        setOnglet("historique");
                                    }
                                }}
                                className="mt-4 w-full rounded-2xl bg-white/15 py-3 text-sm font-black text-white transition-all hover:bg-white/25"
                            >
                                🔄 Voir les résultats
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Onglets ─────────────────────────────────────────────────────── */}
            <div className="flex gap-2">
                {([["historique", "Historique"], ["classement", "Classement"], ["envoyer", "Lancer un défi"]] as const).map(([v, label]) => (
                    <button
                        key={v}
                        onClick={() => setOnglet(v)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            onglet === v ? "bg-violet-600 text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Historique ──────────────────────────────────────────────────── */}
            {onglet === "historique" && (
                <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Mes {historique.length > 0 ? historique.length : ""} derniers défis
                    </p>

                    {historique.length === 0 ? (
                        <div className="rounded-[24px] bg-white p-10 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="text-4xl">⚔️</p>
                            <p className="mt-4 font-black text-slate-600">Aucun défi pour l'instant</p>
                            <p className="mt-2 text-sm text-slate-400">Lance ton premier défi depuis l'onglet ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historique.map((item) => (
                                <CarteHistorique key={item.id} item={item} nom={nom} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Classement ──────────────────────────────────────────────────── */}
            {onglet === "classement" && (
                <div className="space-y-3">
                    {classement.length === 0 ? (
                        <div className="rounded-[24px] bg-white p-10 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                            <p className="text-4xl">⚔️</p>
                            <p className="mt-4 font-black text-slate-600">Pas encore de classement</p>
                            <p className="mt-2 text-sm text-slate-400">Lance un défi pour figurer ici !</p>
                        </div>
                    ) : classement.map((c, idx) => {
                        const estMoi  = c.id === conseillerId;
                        const totalD  = c.defis.gagne + c.defis.perdu + c.defis.egalite;
                        const totalCh = c.challenges.reussi + c.challenges.echoue;
                        const tauxD   = totalD  > 0 ? Math.round((c.defis.gagne  / totalD)  * 100) : 0;
                        const tauxCh  = totalCh > 0 ? Math.round((c.challenges.reussi / totalCh) * 100) : 0;
                        const score   = c.defis.gagne * 3 + c.defis.egalite + c.challenges.reussi * 2;
                        const medals  = ["🥇", "🥈", "🥉"];

                        return (
                            <div key={c.id} className={`relative overflow-hidden rounded-[22px] bg-white shadow-[0_2px_16px_rgba(15,23,42,.06)] transition-all ${
                                estMoi
                                    ? "ring-2 ring-violet-400/60 shadow-[0_4px_24px_rgba(109,40,217,.12)]"
                                    : idx === 0
                                    ? "ring-2 ring-amber-300/60"
                                    : ""
                            }`}>
                                {estMoi && (
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-50/70 via-transparent to-transparent" />
                                )}
                                {!estMoi && idx === 0 && (
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-50/60 via-transparent to-transparent" />
                                )}

                                <div className="relative flex items-stretch">

                                    {/* Rang + identité */}
                                    <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0 w-48">
                                        <span className="w-7 text-center flex-shrink-0">
                                            {idx < 3
                                                ? <span className="text-lg">{medals[idx]}</span>
                                                : <span className="text-sm font-black text-slate-300">{idx + 1}</span>
                                            }
                                        </span>
                                        <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={38} />
                                        <div className="min-w-0">
                                            <p className={`font-black truncate text-sm ${estMoi ? "text-violet-700" : "text-slate-900"}`}>
                                                {c.nom.split(" ")[0]}
                                            </p>
                                            {estMoi && <p className="text-[10px] font-bold text-violet-400">Toi</p>}
                                            {c.challenges.enCours > 0 && !estMoi && (
                                                <p className="text-[10px] text-amber-500 font-bold">⏳ en cours</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-px bg-slate-100 my-3 flex-shrink-0" />

                                    {/* Défis */}
                                    <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">⚔️ Défis</span>
                                            {totalD > 0 && <span className="text-xs font-black text-violet-600">{tauxD}%</span>}
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {c.defis.gagne > 0 && (
                                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-700">🏆{c.defis.gagne}</span>
                                            )}
                                            {c.defis.egalite > 0 && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">🤝{c.defis.egalite}</span>
                                            )}
                                            {c.defis.perdu > 0 && (
                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-400">💪{c.defis.perdu}</span>
                                            )}
                                            {totalD === 0 && <span className="text-[10px] text-slate-300">—</span>}
                                        </div>
                                        {totalD > 0 && (
                                            <div className="flex h-1 overflow-hidden rounded-full bg-slate-100">
                                                <div className="bg-violet-500" style={{ width: `${(c.defis.gagne / totalD) * 100}%` }} />
                                                <div className="bg-slate-300" style={{ width: `${(c.defis.egalite / totalD) * 100}%` }} />
                                                <div className="bg-red-200" style={{ width: `${(c.defis.perdu / totalD) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px bg-slate-100 my-3 flex-shrink-0" />

                                    {/* Challenges */}
                                    <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">🎯 Challenges</span>
                                            {totalCh > 0 && <span className="text-xs font-black text-emerald-600">{tauxCh}%</span>}
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {c.challenges.reussi > 0 && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">✅{c.challenges.reussi}</span>
                                            )}
                                            {c.challenges.echoue > 0 && (
                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-400">❌{c.challenges.echoue}</span>
                                            )}
                                            {c.challenges.enCours > 0 && (
                                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-500">⏳{c.challenges.enCours}</span>
                                            )}
                                            {totalCh === 0 && c.challenges.enCours === 0 && <span className="text-[10px] text-slate-300">—</span>}
                                        </div>
                                        {totalCh > 0 && (
                                            <div className="flex h-1 overflow-hidden rounded-full bg-slate-100">
                                                <div className="bg-emerald-500" style={{ width: `${(c.challenges.reussi / totalCh) * 100}%` }} />
                                                <div className="bg-red-200" style={{ width: `${(c.challenges.echoue / totalCh) * 100}%` }} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px bg-slate-100 my-3 flex-shrink-0" />

                                    {/* Score */}
                                    <div className="flex flex-col items-center justify-center px-5 flex-shrink-0 w-20">
                                        <p className={`text-2xl font-black tabular-nums ${estMoi ? "text-violet-600" : idx === 0 ? "text-amber-500" : "text-slate-800"}`}>
                                            {score}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">pts</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Formulaire défi ─────────────────────────────────────────────── */}
            {onglet === "envoyer" && (
                <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Lancer un défi</p>

                    {suggestion && (
                        <div className="mb-6 rounded-2xl bg-violet-50 p-4">
                            <p className="text-xs font-bold text-violet-600">💡 Suggestion KPILOTE</p>
                            <p className="mt-1 text-sm text-slate-700">
                                <strong>{suggestion.adversaire}</strong> sur <strong>{suggestion.produit}</strong> — {suggestion.raison}
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">

                        {/* Adversaires */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                    Adversaire{form.adversaires.length > 1 ? "s" : ""}
                                </label>
                                {form.adversaires.length > 0 && (
                                    <span className="text-xs font-semibold text-violet-600">
                                        {form.adversaires.length} sélectionné{form.adversaires.length > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {conseillers.map((c: any) => {
                                    const selected = form.adversaires.includes(c.id);
                                    const prenom = c.nom ?? c.prenom ?? "?";
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => toggleAdversaire(c.id)}
                                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition-all ${
                                                selected
                                                    ? "bg-violet-600 text-white shadow-md scale-105"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            <InitialesAvatar nom={prenom} size={24} />
                                            {prenom}
                                            {selected && <span className="text-white/80">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {form.adversaires.length === 0 && (
                                <p className="mt-2 text-xs text-slate-300">Sélectionne un ou plusieurs adversaires.</p>
                            )}
                        </div>

                        {/* Produit + Volume */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Produit</label>
                            <div className="flex flex-wrap gap-2">
                                {PRODUITS.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setForm((f) => ({ ...f, produit: p }))}
                                        className={`rounded-2xl px-4 py-2 text-sm font-bold transition-all ${
                                            form.produit === p ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Volume</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, objectif: v }))}
                                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-all ${
                                                form.objectif === v
                                                    ? "bg-violet-600 text-white shadow-md scale-110"
                                                    : "bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600"
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <span className="text-xs text-slate-400">
                                    {form.objectif === 1 ? "vente à réaliser" : "ventes à réaliser"}
                                </span>
                            </div>
                        </div>

                        {/* Durée */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Durée</label>
                            <div className="flex gap-2">
                                {DUREES.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setForm((f) => ({ ...f, duree: d }))}
                                        className={`flex-1 rounded-2xl py-2.5 text-sm font-bold transition-all ${
                                            form.duree === d ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {succes && (
                            <div className="rounded-2xl bg-green-50 p-4 text-sm font-semibold text-green-700">✅ {succes}</div>
                        )}

                        <button
                            onClick={handleEnvoyer}
                            disabled={form.adversaires.length === 0 || envoi}
                            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 font-black text-white shadow-lg transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {envoi
                                ? "Envoi en cours..."
                                : form.adversaires.length === 0
                                ? "⚔️ Choisir un adversaire d'abord"
                                : `⚔️ Lancer le défi${form.adversaires.length > 1 ? ` (×${form.adversaires.length})` : ""}`}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function ChallengesPage() {
    return <Suspense><ChallengesInner /></Suspense>;
}
