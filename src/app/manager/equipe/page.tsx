"use client";

import { Fragment, useEffect, useState } from "react";

import FelicitationCard from "@/components/manager/FelicitationCard";
import ProgressionBoutique from "@/components/manager/ProgressionBoutique";
import CoachManagerCard from "@/components/manager/CoachManagerCard";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotosByIds } from "@/services/photoService";

import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { feliciterConseiller } from "@/services/congratulationService";
import { construireDecision } from "@/services/manager/ManagerCoachAI";
import { couleursProgression } from "@/utils/colors";

const MANAGER_ID = "manager";

type CleProduit = "box" | "forfaits" | "telephones" | "mcafee" | "assurance";

const colonnesProduits: { label: string; cle: CleProduit; couleur: string }[] = [
    { label: "Box", cle: "box", couleur: couleursProgression.Box },
    { label: "Forfaits", cle: "forfaits", couleur: couleursProgression.Forfaits },
    { label: "Téléphones", cle: "telephones", couleur: couleursProgression.Téléphones },
    { label: "McAfee", cle: "mcafee", couleur: couleursProgression.McAfee },
    { label: "Assurance", cle: "assurance", couleur: couleursProgression.Assurance },
];

const sizeMap = { sm: 36, md: 48, lg: 72 };

export default function EquipePage() {
    const { dashboard, loading } = useManagerDashboard();
    const [conseillerOuvert, setConseillerOuvert] = useState<string | null>(null);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [photos, setPhotos] = useState<Record<string, string | null>>({});

    useEffect(() => {
        if (!dashboard?.classement?.length) return;
        const ids = dashboard.classement.map((c) => c.id);
        getPhotosByIds(ids).then(setPhotos).catch(() => {});
    }, [dashboard?.classement]);

    if (loading || !dashboard) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const { classement, kpis, coach, realiseGlobal, objectifGlobal } = dashboard;

    if (classement.length === 0) {
        return (
            <main>
                <h1 className="text-5xl font-black text-slate-900">Équipe</h1>
                <p className="mt-4 text-lg text-slate-500">Aucun conseiller dans la boutique pour le moment.</p>
            </main>
        );
    }

    const decision = construireDecision({ kpis, classement });

    async function handleFeliciter(conseillerNom: string, message: string) {
        setEnvoiEnCours(true);
        try {
            await feliciterConseiller(MANAGER_ID, conseillerNom, message);
            setConfirmation(`Félicitation envoyée à ${conseillerNom}.`);
            setConseillerOuvert(null);
        } finally {
            setEnvoiEnCours(false);
        }
    }

    const [premier, deuxieme, troisieme] = classement;
    const reste = classement.slice(3);

    return (
        <main>
            <h1 className="text-4xl font-black text-slate-900">Équipe</h1>
            <p className="mt-2 text-slate-400">Suivi individuel et coaching du jour.</p>

            {confirmation && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
                    {confirmation}
                </div>
            )}

            <div className="mt-8 grid gap-6 xl:grid-cols-12">

                {/* Colonne gauche : Coach + Progression */}
                <div className="space-y-6 xl:col-span-4">
                    <CoachManagerCard coach={coach} decision={decision} />
                    <ProgressionBoutique realise={realiseGlobal} objectif={objectifGlobal} />
                </div>

                {/* Colonne droite : Podium + tableau */}
                <div className="space-y-6 xl:col-span-8">

                    {/* Podium top 3 */}
                    <div className="rounded-[24px] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">
                            🏆 Classement du jour
                        </p>

                        <div className="mt-8 flex items-end justify-center gap-4">

                            {/* 2e place */}
                            {deuxieme && (
                                <div className="flex flex-col items-center gap-3">
                                    <PhotoAvatar nom={deuxieme.prenom} photoUrl={photos[deuxieme.id]} size={sizeMap.md} />
                                    <p className="text-sm font-black text-slate-700">{deuxieme.prenom}</p>
                                    <div className="flex h-20 w-28 flex-col items-center justify-center rounded-t-2xl bg-slate-200">
                                        <span className="text-2xl">🥈</span>
                                        <p className="mt-1 text-xl font-black text-slate-700">{deuxieme.ventes}</p>
                                    </div>
                                </div>
                            )}

                            {/* 1re place */}
                            {premier && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <PhotoAvatar nom={premier.prenom} photoUrl={photos[premier.id]} size={sizeMap.lg} />
                                        <span className="absolute -top-2 -right-2 text-2xl">👑</span>
                                    </div>
                                    <p className="font-black text-slate-900">{premier.prenom}</p>
                                    <div className="flex h-28 w-32 flex-col items-center justify-center rounded-t-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                                        <span className="text-2xl">🥇</span>
                                        <p className="mt-1 text-2xl font-black text-white">{premier.ventes}</p>
                                        <p className="text-xs text-amber-100">ventes</p>
                                    </div>
                                </div>
                            )}

                            {/* 3e place */}
                            {troisieme && (
                                <div className="flex flex-col items-center gap-3">
                                    <PhotoAvatar nom={troisieme.prenom} photoUrl={photos[troisieme.id]} size={sizeMap.md} />
                                    <p className="text-sm font-black text-slate-700">{troisieme.prenom}</p>
                                    <div className="flex h-16 w-28 flex-col items-center justify-center rounded-t-2xl bg-slate-100">
                                        <span className="text-2xl">🥉</span>
                                        <p className="mt-1 text-xl font-black text-slate-600">{troisieme.ventes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tableau détaillé */}
                    <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.08)]">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                            Détail par produit
                        </p>

                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-300">
                                        <th className="px-3 pb-2">Conseiller</th>
                                        {colonnesProduits.map((c) => (
                                            <th key={c.cle} className="px-3 pb-2 text-center">{c.label}</th>
                                        ))}
                                        <th className="px-3 pb-2 text-right">Total</th>
                                        <th className="px-3 pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {classement.map((conseiller, idx) => {
                                        const ouvert = conseillerOuvert === conseiller.id;
                                        const position = idx + 1;

                                        return (
                                            <Fragment key={conseiller.id}>
                                                <tr className="bg-slate-50 transition-all hover:bg-slate-100">
                                                    <td className="rounded-l-2xl px-3 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-black text-slate-300 w-4">
                                                                {position <= 3
                                                                    ? ["🥇","🥈","🥉"][position - 1]
                                                                    : `${position}`}
                                                            </span>
                                                            <PhotoAvatar nom={conseiller.prenom} photoUrl={photos[conseiller.id]} size={sizeMap.sm} />
                                                            <p className="font-black text-slate-800 text-sm">
                                                                {conseiller.prenom}
                                                            </p>
                                                        </div>
                                                    </td>

                                                    {colonnesProduits.map((col) => {
                                                        const realise = conseiller[col.cle];
                                                        const objectif = conseiller.objectifs[col.cle];
                                                        const taux = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;

                                                        return (
                                                            <td key={col.cle} className="px-3 py-3 text-center">
                                                                <p className="text-sm font-black text-slate-800">
                                                                    {realise}
                                                                    <span className="text-xs font-normal text-slate-300"> /{objectif}</span>
                                                                </p>
                                                                <div className="mx-auto mt-1 h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                                                                    <div
                                                                        className={`h-full rounded-full ${col.couleur}`}
                                                                        style={{ width: `${Math.min(taux, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <p className="mt-0.5 text-xs text-slate-400">{taux}%</p>
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="px-3 py-3 text-right">
                                                        <p className="text-lg font-black text-slate-800">{conseiller.ventes}</p>
                                                    </td>

                                                    <td className="rounded-r-2xl px-3 py-3">
                                                        <button
                                                            onClick={() => setConseillerOuvert(ouvert ? null : conseiller.id)}
                                                            className="rounded-xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-600 hover:bg-violet-100 transition-all"
                                                        >
                                                            {ouvert ? "Fermer" : "Féliciter"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {ouvert && (
                                                    <tr>
                                                        <td colSpan={colonnesProduits.length + 3} className="px-3 pb-3">
                                                            <FelicitationCard
                                                                conseillerId={conseiller.id}
                                                                conseiller={conseiller.prenom}
                                                                managerId={MANAGER_ID}
                                                                onSend={(message) => handleFeliciter(conseiller.prenom, message)}
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

                </div>
            </div>
        </main>
    );
}
