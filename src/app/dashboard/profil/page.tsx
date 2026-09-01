"use client";

import { Suspense } from "react";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { uploadPhoto, getPhotoUrl } from "@/services/photoService";
import ThemePicker from "@/components/dashboard/ThemePicker";
import { getMoisDisponibles, getRecapMensuel, RecapMensuel } from "@/services/recapMensuelService";

function ProfilInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const nom = searchParams.get("nom") ?? "Conseiller";

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [succes, setSucces] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [moisSelectionne, setMoisSelectionne] = useState<string | null>(null);
    const [recap, setRecap] = useState<RecapMensuel | null>(null);
    const [chargementRecap, setChargementRecap] = useState(false);
    const moisDisponibles = getMoisDisponibles(12);

    useEffect(() => {
        if (!moisSelectionne || !conseillerId) return;
        setChargementRecap(true);
        getRecapMensuel(conseillerId, moisSelectionne)
            .then(setRecap)
            .catch(() => setRecap(null))
            .finally(() => setChargementRecap(false));
    }, [moisSelectionne, conseillerId]);


    useEffect(() => {
        if (!conseillerId) return;
        getPhotoUrl(conseillerId).then(setPhotoUrl).catch(() => {});
    }, [conseillerId]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setErreur("Fichier trop lourd — max 5 Mo.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            setErreur("Fichier invalide — image uniquement.");
            return;
        }

        setErreur(null);
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    }

    async function handleUpload() {
        if (!selectedFile || !conseillerId) return;
        setUploading(true);
        setErreur(null);
        try {
            const url = await uploadPhoto(conseillerId, selectedFile);
            setPhotoUrl(url);
            setPreview(null);
            setSelectedFile(null);
            setSucces(true);
            setTimeout(() => setSucces(false), 3000);
        } catch (e: any) {
            setErreur(e.message ?? "Erreur lors de l'upload.");
        } finally {
            setUploading(false);
        }
    }

    function handleAnnuler() {
        setPreview(null);
        setSelectedFile(null);
        setErreur(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    const displayed = preview ?? photoUrl;

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Mon espace</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Profil</h1>
            </div>

            {/* Photo de profil */}
            <div className="rounded-[24px] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    Photo de profil
                </p>

                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">

                    {/* Zone photo cliquable */}
                    <div className="relative flex-shrink-0">
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="group relative cursor-pointer overflow-hidden rounded-full shadow-xl"
                            style={{ width: 120, height: 120 }}
                        >
                            {displayed ? (
                                <img
                                    src={displayed}
                                    alt={nom}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <PhotoAvatar nom={nom} size={120} />
                            )}

                            {/* Overlay au hover */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 rounded-full">
                                <span className="text-2xl">📷</span>
                                <p className="mt-1 text-xs font-bold text-white">Changer</p>
                            </div>
                        </div>

                        {/* Indicateur preview */}
                        {preview && (
                            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs shadow-md">
                                ✏️
                            </div>
                        )}
                        {photoUrl && !preview && (
                            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs shadow-md">
                                ✓
                            </div>
                        )}
                    </div>

                    {/* Infos + actions */}
                    <div className="flex-1 text-center sm:text-left">
                        <p className="text-2xl font-black text-slate-900">{nom}</p>
                        <p className="text-slate-400">Conseiller KPILOTE</p>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {!preview ? (
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02]"
                            >
                                📷 {photoUrl ? "Changer ma photo" : "Ajouter une photo"}
                            </button>
                        ) : (
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                                >
                                    {uploading ? "Envoi…" : "✅ Enregistrer"}
                                </button>
                                <button
                                    onClick={handleAnnuler}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-200"
                                >
                                    Annuler
                                </button>
                            </div>
                        )}

                        {succes && (
                            <p className="mt-3 text-sm font-semibold text-green-600">
                                ✅ Photo mise à jour !
                            </p>
                        )}
                        {erreur && (
                            <p className="mt-3 text-sm font-semibold text-red-500">
                                ⚠️ {erreur}
                            </p>
                        )}

                        <p className="mt-4 text-xs text-slate-400">
                            JPG, PNG, WEBP · Max 5 Mo · Ratio carré recommandé
                        </p>
                    </div>
                </div>
            </div>

            {/* Palette de couleurs */}
            <ThemePicker conseillerId={conseillerId} />

            {/* Mes récaps */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">📅 Mes récaps</p>

                <div className="mb-5 flex flex-wrap gap-2">
                    {moisDisponibles.map((m) => (
                        <button
                            key={m.valeur}
                            onClick={() => setMoisSelectionne(m.valeur)}
                            className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                                moisSelectionne === m.valeur ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {!moisSelectionne && (
                    <p className="text-sm text-slate-400">Choisis un mois ci-dessus pour revoir ton récap.</p>
                )}

                {moisSelectionne && chargementRecap && (
                    <div className="flex h-32 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                    </div>
                )}

                {moisSelectionne && !chargementRecap && recap && (
                    <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-7 text-white">
                        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="relative">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">Ton mois de</p>
                            <p className="text-2xl font-black">{recap.label}</p>

                            <div className="mt-5 flex items-end gap-3">
                                <p className="text-6xl font-black tabular-nums leading-none">{recap.totalVentes}</p>
                                <p className="pb-2 text-sm font-semibold text-white/70">
                                    {recap.totalObjectif > 0 ? (
                                        <>/ {recap.totalObjectif} vente{recap.totalObjectif > 1 ? "s" : ""} · R/O {recap.tauxGlobal}%</>
                                    ) : (
                                        <>vente{recap.totalVentes > 1 ? "s" : ""} au total</>
                                    )}
                                </p>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
                                {recap.parProduit.map((p) => (
                                    <div key={p.code} className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                                        <div className="text-xl">{p.emoji}</div>
                                        <p className="mt-1 text-lg font-black">
                                            {p.nombre}
                                            {p.objectif > 0 && <span className="text-xs font-normal text-white/50">/{p.objectif}</span>}
                                        </p>
                                        <p className="text-[10px] font-semibold text-white/60">{p.label}</p>
                                        {p.objectif > 0 && (
                                            <p className="mt-0.5 text-[10px] font-black text-white/70">R/O {p.taux}%</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                {recap.meilleurJour && (
                                    <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black backdrop-blur">
                                        🌟 Meilleur jour : {new Date(recap.meilleurJour.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} avec {recap.meilleurJour.nombre} vente{recap.meilleurJour.nombre > 1 ? "s" : ""}
                                    </span>
                                )}
                                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black backdrop-blur">
                                    📆 {recap.joursActifs} jour{recap.joursActifs > 1 ? "s" : ""} actif{recap.joursActifs > 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Compte */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Mon compte</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                        <div>
                            <p className="text-sm font-black text-slate-700">Identifiant</p>
                            <p className="text-xs text-slate-400 font-mono">{conseillerId || "—"}</p>
                        </div>
                        <span className="text-slate-300 text-xs">En lecture seule</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default function ProfilPage() {
    return <Suspense><ProfilInner /></Suspense>;
}

