"use client";

import { Suspense } from "react";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { uploadPhoto, getPhotoUrl } from "@/services/photoService";

export default function ProfilPage() {
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
