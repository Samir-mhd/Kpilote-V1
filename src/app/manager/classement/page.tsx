"use client";

import { Fragment, useEffect, useState } from "react";
import { PRODUITS_ORDRE } from "@/utils/produits";
import { Periode, PERIODE_LABELS } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import type { ProduitCode } from "@/utils/produits";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import FelicitationCard from "@/components/manager/FelicitationCard";
import { feliciterConseiller } from "@/services/congratulationService";

const MANAGER_ID = "manager";
const medals = ["🥇", "🥈", "🥉"];

// Jours restants dans le mois (aujourd'hui inclus, dimanches exclus)
function workingDaysRemaining(): number {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let count = 0;
    for (const d = new Date(now); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) count++;
    }
    return Math.max(count, 1);
}

export default function ClassementPage() {
    const [periode, setPeriode]                   = useState<Periode>("jour");
    const [classement, setClassement]             = useState<ConseillerStats[]>([]);
    const [moisMap, setMoisMap]                   = useState(new Map<string, ConseillerStats>());
    const [photos, setPhotos]                     = useState<Record<string, string | null>>({});
    const [loading, setLoading]                   = useState(true);
    const [heure, setHeure]                       = useState("");
    const [conseillerOuvert, setConseillerOuvert] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours]         = useState(false);
    const [confirmation, setConfirmation]         = useState<string | null>(null);

    useEffect(() => {
        setHeure(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    }, []);

    useEffect(() => {
        setLoading(true);
        setConseillerOuvert(null);

        const fetches = periode === "mois"
            ? [construireClassementPeriode("mois"), Promise.resolve([] as ConseillerStats[])]
            : [construireClassementPeriode(periode), construireClassementPeriode("mois")];

        Promise.all(fetches)
            .then(async ([data, moisData]) => {
                setClassement(data);
                const map = new Map((periode === "mois" ? data : moisData).map(c => [c.id, c]));
                setMoisMap(map);
                const ids = data.map(c => c.id);
                const avs = await getPhotosByIds(ids).catch(() => ({}));
                setPhotos(avs);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [periode]);

    // Objectif dynamique par conseiller × produit
    function getObjDynamic(c: ConseillerStats, key: ProduitCode): number {
        const objMois   = c.objectifs[key] ?? 0;
        if (periode === "mois") return objMois;
        const moisStats = moisMap.get(c.id);
        const monthVal  = moisStats?.produits[key] ?? 0;
        const periodVal = c.produits[key] ?? 0;
        const doneBeforePeriod = Math.max(monthVal - periodVal, 0);
        const remaining        = Math.max(objMois - doneBeforePeriod, 0);
        const daysLeft         = workingDaysRemaining();
        if (periode === "jour") return Math.ceil(remaining / daysLeft);
        // semaine : taux journalier × 6 jours ouvrés par semaine
        return Math.ceil(remaining / daysLeft * 6);
    }

    async function handleFeliciter(prenom: string, conseillerNom: string, message: string) {
        setEnvoiEnCours(true);
        try {
            await feliciterConseiller(MANAGER_ID, conseillerNom, message);
            setConfirmation(`Félicitation envoyée à ${prenom}.`);
            setConseillerOuvert(null);
            setTimeout(() => setConfirmation(null), 4000);
        } finally {
            setEnvoiEnCours(false);
        }
    }

    const [premier, deuxieme, troisieme] = classement;

    return (
        <main className="space-y-8">

            {/* Hero */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-9 shadow-[0_20px_60px_rgba(15,23,42,.30)]">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-400">KPILOTE Manager</p>
                        <h1 className="mt-2 text-4xl font-black text-white">Classement équipe</h1>
                        {heure && (
                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
                                Temps réel · {heure}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Effectif</p>
                        <p className="mt-1 text-5xl font-black text-white">{classement.length}</p>
                        <p className="text-xs text-slate-500">conseillers</p>
                    </div>
                </div>
            </div>

            {/* Toggle période */}
            <div className="flex gap-2">
                {(["jour", "semaine", "mois"] as Periode[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriode(p)}
                        className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                            periode === p
                                ? "bg-slate-900 text-white shadow-lg"
                                : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        }`}
                    >
                        {PERIODE_LABELS[p]}
                    </button>
                ))}
            </div>

            {/* Confirmation félicitation */}
            {confirmation && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                    {confirmation}
                </div>
            )}

            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            ) : classement.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="font-black text-slate-700">Aucune vente sur cette période</p>
                    <p className="mt-1 text-sm text-slate-400">Changez la période ou revenez plus tard.</p>
                </div>
            ) : (
                <>
                    {/* Podium top 3 */}
                    {classement.length >= 2 && (
                        <div className="rounded-[24px] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">
                                🏆 Podium — {PERIODE_LABELS[periode]}
                            </p>

                            <div className="mt-8 flex items-end justify-center gap-4">

                                {/* 2e place */}
                                {deuxieme && (
                                    <div className="flex flex-col items-center gap-3">
                                        <PhotoAvatar nom={deuxieme.nom} photoUrl={photos[deuxieme.id]} size={48} />
                                        <p className="text-sm font-black text-slate-700">{deuxieme.nom.split(" ")[0]}</p>
                                        <div className="flex h-20 w-28 flex-col items-center justify-center rounded-t-2xl bg-slate-200">
                                            <span className="text-2xl">🥈</span>
                                            <p className="mt-1 text-xl font-black text-slate-700">{deuxieme.total}</p>
                                            <p className="text-xs text-slate-400">ventes</p>
                                        </div>
                                    </div>
                                )}

                                {/* 1re place */}
                                {premier && (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <PhotoAvatar nom={premier.nom} photoUrl={photos[premier.id]} size={72} />
                                            <span className="absolute -right-2 -top-2 text-2xl">👑</span>
                                        </div>
                                        <p className="font-black text-slate-900">{premier.nom.split(" ")[0]}</p>
                                        <div className="flex h-28 w-32 flex-col items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                                            <span className="text-2xl">🥇</span>
                                            <p className="mt-1 text-2xl font-black text-white">{premier.total}</p>
                                            <p className="text-xs text-amber-100">ventes</p>
                                        </div>
                                    </div>
                                )}

                                {/* 3e place */}
                                {troisieme && (
                                    <div className="flex flex-col items-center gap-3">
                                        <PhotoAvatar nom={troisieme.nom} photoUrl={photos[troisieme.id]} size={48} />
                                        <p className="text-sm font-black text-slate-700">{troisieme.nom.split(" ")[0]}</p>
                                        <div className="flex h-16 w-28 flex-col items-center justify-center rounded-t-2xl bg-amber-900/20">
                                            <span className="text-2xl">🥉</span>
                                            <p className="mt-1 text-xl font-black text-slate-600">{troisieme.total}</p>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Tableau détaillé */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                            Détail par produit — {PERIODE_LABELS[periode]}
                        </p>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-300">
                                        <th className="w-8 px-3 pb-2">#</th>
                                        <th className="px-3 pb-2">Conseiller</th>
                                        {PRODUITS_ORDRE.map((p) => (
                                            <th key={p.key} className="px-3 pb-2 text-center">
                                                {p.emoji} {p.label}
                                            </th>
                                        ))}
                                        <th className="px-3 pb-2 text-right">Total</th>
                                        <th className="px-3 pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {classement.map((c, idx) => {
                                        const ouvert  = conseillerOuvert === c.id;
                                        const prenom  = c.nom.split(" ")[0];
                                        const position = idx + 1;

                                        return (
                                            <Fragment key={c.id}>
                                                <tr className={`transition-all hover:bg-slate-100 ${idx === 0 ? "bg-amber-50" : "bg-slate-50"}`}>

                                                    {/* Rang */}
                                                    <td className="rounded-l-2xl px-3 py-3">
                                                        {position <= 3
                                                            ? <span className="text-lg">{medals[position - 1]}</span>
                                                            : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-500">{position}</span>
                                                        }
                                                    </td>

                                                    {/* Conseiller */}
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <PhotoAvatar nom={c.nom} photoUrl={photos[c.id]} size={36} />
                                                            <p className="text-sm font-black text-slate-800">{prenom}</p>
                                                        </div>
                                                    </td>

                                                    {/* Par produit */}
                                                    {PRODUITS_ORDRE.map((p) => {
                                                        const realise  = c.produits[p.key] ?? 0;
                                                        const objectif = getObjDynamic(c, p.key);
                                                        const taux     = objectif > 0
                                                            ? Math.round((realise / objectif) * 100)
                                                            : realise > 0 ? 100 : 0;
                                                        const barColor = taux >= 100
                                                            ? "bg-emerald-500"
                                                            : taux >= 50 ? "bg-amber-400" : "bg-red-400";

                                                        return (
                                                            <td key={p.key} className="px-3 py-3 text-center">
                                                                <p className="text-sm font-black text-slate-800">
                                                                    {realise}
                                                                    {objectif > 0 && (
                                                                        <span className="text-xs font-normal text-slate-300"> /{objectif}</span>
                                                                    )}
                                                                </p>
                                                                <div className="mx-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                                                                    <div
                                                                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                                                        style={{ width: `${Math.min(taux, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <p className="mt-0.5 text-[10px] text-slate-400">{taux}%</p>
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Total */}
                                                    <td className="px-3 py-3 text-right">
                                                        <p className="text-lg font-black text-slate-800">{c.total}</p>
                                                    </td>

                                                    {/* Action */}
                                                    <td className="rounded-r-2xl px-3 py-3">
                                                        <button
                                                            onClick={() => setConseillerOuvert(ouvert ? null : c.id)}
                                                            className="rounded-xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-600 transition-all hover:bg-violet-100"
                                                        >
                                                            {ouvert ? "Fermer" : "Féliciter"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Félicitation inline */}
                                                {ouvert && (
                                                    <tr>
                                                        <td colSpan={PRODUITS_ORDRE.length + 4} className="px-3 pb-3">
                                                            <FelicitationCard
                                                                conseillerId={c.id}
                                                                conseiller={prenom}
                                                                managerId={MANAGER_ID}
                                                                onSend={(msg) => handleFeliciter(prenom, c.nom, msg)}
                                                            />
                                                            {envoiEnCours && (
                                                                <p className="mt-2 text-xs text-slate-400">Envoi en cours...</p>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}
