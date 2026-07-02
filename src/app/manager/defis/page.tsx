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

// ─── Badges résultat ────────────────────────────────────────────────────────────

function BadgeDefi({ vainqueur, participants, statut }: Pick<DefiRow, "vainqueur" | "participants" | "statut">) {
    if (statut === "en cours") {
        return (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                ⚔️ En cours
            </span>
        );
    }
    if (!vainqueur) {
        return (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                🤝 Égalité
            </span>
        );
    }
    return (
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            🏆 {vainqueur}
        </span>
    );
}

function BadgeChallenge({ resultat }: { resultat: ChallengeRow["resultat"] }) {
    if (resultat === "en cours") {
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">⏳ En cours</span>;
    }
    if (resultat === "réussi") {
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">✅ Réussi</span>;
    }
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">❌ Échoué</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DefisPage() {
    const [defis, setDefis] = useState<DefiRow[]>([]);
    const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
    const [classement, setClassement] = useState<StatsConseiller[]>([]);
    const [loading, setLoading] = useState(true);
    const [onglet, setOnglet] = useState<"boutique" | "classement">("boutique");

    async function charger() {
        try {
            // Clôture d'abord les défis expirés avant d'afficher
            await cloturerChallengesExpires().catch(() => {});
            const [d, c, cl] = await Promise.all([
                chargerDefis(),
                chargerChallenges(),
                chargerClassementDefisEtChallenges(),
            ]);
            setDefis(d);
            setChallenges(c);
            setClassement(cl);
        } catch {
            // Erreur réseau ou table absente — on affiche des listes vides
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        charger();
        // Refresh toutes les 60s pour détecter les clôtures
        const interval = setInterval(charger, 60_000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <main>

            {/* Header */}
            <h1 className="text-4xl font-black text-slate-900">Défis & Challenges</h1>
            <p className="mt-2 text-slate-400">
                Défis entre conseillers · Challenges individuels proposés par KPILOTE
            </p>

            {/* Onglets */}
            <div className="mt-6 flex gap-3">
                <button
                    onClick={() => setOnglet("boutique")}
                    className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                        onglet === "boutique"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                    ⚔️ Boutique
                </button>
                <button
                    onClick={() => setOnglet("classement")}
                    className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                        onglet === "classement"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                    📊 Classement
                </button>
            </div>

            {/* ── Vue Boutique ── */}
            {onglet === "boutique" && (
                <div className="mt-6 grid gap-6 xl:grid-cols-2">

                    {/* Bloc Défis */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-sm">⚔️</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Défis</p>
                                <p className="text-xs text-slate-400">Entre conseillers</p>
                            </div>
                            <span className="ml-auto rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">
                                {defis.length}
                            </span>
                        </div>

                        {defis.length === 0 ? (
                            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
                                <p className="text-2xl">⚔️</p>
                                <p className="mt-2 text-sm font-semibold text-slate-400">
                                    Aucun défi pour le moment
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                    KPILOTE propose des défis à partir de 10h30, une fois les premières ventes enregistrées.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-3">
                                {defis.map((defi) => (
                                    <div
                                        key={defi.id}
                                        className="rounded-2xl bg-slate-50 p-5 transition-all hover:bg-slate-100"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                {/* Participants */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {defi.participants.map((p, i) => (
                                                        <span key={i} className="flex items-center gap-1">
                                                            {i > 0 && <span className="text-xs text-slate-300">vs</span>}
                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                                                                {p}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Produit + score */}
                                                <p className="mt-2 text-sm font-semibold text-slate-700">
                                                    {defi.produit}
                                                </p>
                                                {defi.statut === "terminé" && (
                                                    <p className="mt-1 text-xl font-black text-slate-800">
                                                        {defi.scoreCreateur}
                                                        <span className="mx-2 text-sm font-normal text-slate-300">–</span>
                                                        {defi.scoreAdversaire}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <BadgeDefi
                                                    vainqueur={defi.vainqueur}
                                                    participants={defi.participants}
                                                    statut={defi.statut}
                                                />
                                                <p className="text-xs text-slate-300">{defi.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bloc Challenges */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm">🎯</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Challenges</p>
                                <p className="text-xs text-slate-400">KPILOTE → conseiller individuel</p>
                            </div>
                            <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                                {challenges.length}
                            </span>
                        </div>

                        {challenges.length === 0 ? (
                            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
                                <p className="text-2xl">🎯</p>
                                <p className="mt-2 text-sm font-semibold text-slate-400">
                                    Aucun challenge individuel
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                    KPILOTE cible un conseiller sur un produit précis pour l'aider à progresser.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-3">
                                {challenges.map((ch) => (
                                    <div
                                        key={ch.id}
                                        className="rounded-2xl bg-slate-50 p-5 transition-all hover:bg-slate-100"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                                                    {ch.conseiller}
                                                </span>

                                                <p className="mt-2 text-sm font-semibold text-slate-700">
                                                    {ch.produit}
                                                </p>

                                                {ch.objectif > 0 && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{
                                                                        width: `${Math.min(
                                                                            Math.round((ch.realise / ch.objectif) * 100),
                                                                            100
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-slate-400">
                                                                {ch.realise}/{ch.objectif}
                                                            </span>
                                                        </div>
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

            {/* ── Vue Classement ── */}
            {onglet === "classement" && (
                <div className="mt-6 rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                        Classement global
                    </p>
                    <h2 className="mt-1 mb-6 text-2xl font-black text-slate-900">
                        Défis & Challenges par conseiller
                    </h2>

                    {classement.length === 0 ? (
                        <p className="text-slate-400">Aucune donnée disponible.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-300">
                                        <th className="px-4 pb-3">#</th>
                                        <th className="px-4 pb-3">Conseiller</th>
                                        <th className="px-4 pb-3 text-center">⚔️ Défis gagnés</th>
                                        <th className="px-4 pb-3 text-center">Perdus</th>
                                        <th className="px-4 pb-3 text-center">Égalités</th>
                                        <th className="px-4 pb-3 text-center">🎯 Challenges réussis</th>
                                        <th className="px-4 pb-3 text-center">Échoués</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classement.map((c, idx) => {
                                        const totalDefis = c.defis.gagne + c.defis.perdu + c.defis.egalite;
                                        const totalCh = c.challenges.reussi + c.challenges.echoue;
                                        const tauxDefi = totalDefis > 0
                                            ? Math.round((c.defis.gagne / totalDefis) * 100)
                                            : null;
                                        const tauxChallenge = totalCh > 0
                                            ? Math.round((c.challenges.reussi / totalCh) * 100)
                                            : null;

                                        return (
                                            <tr
                                                key={c.id}
                                                className="bg-slate-50 transition-all hover:bg-slate-100"
                                            >
                                                {/* Rang */}
                                                <td className="rounded-l-2xl px-4 py-4">
                                                    <span className="text-sm font-black text-slate-300">
                                                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                                                    </span>
                                                </td>

                                                {/* Nom */}
                                                <td className="px-4 py-4">
                                                    <p className="font-black text-slate-800">{c.nom}</p>
                                                </td>

                                                {/* Défis : gagné */}
                                                <td className="px-4 py-4 text-center">
                                                    <p className="text-lg font-black text-violet-600">{c.defis.gagne}</p>
                                                    {tauxDefi !== null && (
                                                        <p className="text-xs text-slate-300">{tauxDefi}%</p>
                                                    )}
                                                </td>

                                                {/* Défis : perdu */}
                                                <td className="px-4 py-4 text-center">
                                                    <p className="text-base font-semibold text-slate-400">{c.defis.perdu}</p>
                                                </td>

                                                {/* Défis : égalité */}
                                                <td className="px-4 py-4 text-center">
                                                    <p className="text-base font-semibold text-slate-400">{c.defis.egalite}</p>
                                                </td>

                                                {/* Challenges : réussi */}
                                                <td className="px-4 py-4 text-center">
                                                    <p className="text-lg font-black text-emerald-600">{c.challenges.reussi}</p>
                                                    {tauxChallenge !== null && (
                                                        <p className="text-xs text-slate-300">{tauxChallenge}%</p>
                                                    )}
                                                    {c.challenges.enCours > 0 && (
                                                        <p className="text-xs text-amber-500">+{c.challenges.enCours} en cours</p>
                                                    )}
                                                </td>

                                                {/* Challenges : échoué */}
                                                <td className="rounded-r-2xl px-4 py-4 text-center">
                                                    <p className="text-base font-semibold text-slate-400">{c.challenges.echoue}</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Légende */}
                    <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-violet-600">⚔️ Défi</span>
                            <span className="text-xs text-slate-400">= opposition entre conseillers — résultat : gagné / perdu / égalité</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-emerald-600">🎯 Challenge</span>
                            <span className="text-xs text-slate-400">= mission individuelle proposée par KPILOTE — résultat : réussi / échoué</span>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}
