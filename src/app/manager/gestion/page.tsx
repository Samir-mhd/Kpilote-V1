"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Conseiller = {
    id: string;
    nom: string;
    prenom: string | null;
    avatar: string | null;
    ordre: number;
    genre: "H" | "F" | null;
};

type DeleteMode = "archive" | "full";

type DeleteConfirm = {
    conseiller: Conseiller;
    mode: DeleteMode | null;
};

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function GestionEquipePage() {
    const [conseillers, setConseillers] = useState<Conseiller[]>([]);
    const [loading, setLoading]         = useState(true);

    // Edition de nom inline
    const [editId, setEditId]   = useState<string | null>(null);
    const [editNom, setEditNom] = useState("");

    // Upload avatar
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInputRef                  = useRef<HTMLInputElement>(null);
    const uploadTargetRef               = useRef<string | null>(null);

    // Ajout
    const [nomAjout, setNomAjout] = useState("");
    const [ajoutEnCours, setAjoutEnCours] = useState(false);
    const [erreurAjout, setErreurAjout]   = useState<string | null>(null);

    // Suppression
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
    const [deleteEnCours, setDeleteEnCours] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    useEffect(() => { charger(); }, []);

    /* ── Chargement ──────────────────────────────────────────────────────── */

    async function charger() {
        setLoading(true);
        const { data } = await supabase.from("conseillers").select("*").order("ordre");
        setConseillers((data ?? []) as Conseiller[]);
        setLoading(false);
    }

    /* ── Toast helper ────────────────────────────────────────────────────── */

    function afficherToast(msg: string, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    /* ── Upload avatar ───────────────────────────────────────────────────── */

    function ouvrirUpload(id: string) {
        uploadTargetRef.current = id;
        fileInputRef.current?.click();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const id   = uploadTargetRef.current;
        if (!file || !id) return;
        e.target.value = "";
        setUploadingId(id);
        try {
            const url = await uploadPhoto(id, file);
            setConseillers(prev => prev.map(c => c.id === id ? { ...c, avatar: url } : c));
            afficherToast("Photo mise à jour !");
        } catch {
            afficherToast("Échec de l'upload.", false);
        } finally {
            setUploadingId(null);
        }
    }

    async function toggleGenre(id: string, actuel: "H" | "F" | null) {
        const next = actuel === "H" ? "F" : actuel === "F" ? null : "H";
        const { error } = await supabase.from("conseillers").update({ genre: next }).eq("id", id);
        if (error) { afficherToast("Erreur mise à jour genre.", false); return; }
        setConseillers(prev => prev.map(c => c.id === id ? { ...c, genre: next } : c));
    }

    async function supprimerAvatar(id: string) {
        const { error } = await supabase.from("conseillers").update({ avatar: null }).eq("id", id);
        if (error) { afficherToast("Erreur lors de la suppression.", false); return; }
        setConseillers(prev => prev.map(c => c.id === id ? { ...c, avatar: null } : c));
        afficherToast("Photo supprimée.");
    }

    /* ── Renommer ────────────────────────────────────────────────────────── */

    function startEdit(c: Conseiller) {
        setEditId(c.id);
        setEditNom(c.nom);
    }

    async function saveEdit(id: string) {
        const nom = editNom.trim();
        if (!nom) { setEditId(null); return; }
        const prenom = nom.split(" ")[0];
        const { error } = await supabase.from("conseillers").update({ nom, prenom }).eq("id", id);
        if (error) { afficherToast("Erreur lors du renommage.", false); }
        else {
            setConseillers(prev => prev.map(c => c.id === id ? { ...c, nom, prenom } : c));
            afficherToast("Nom mis à jour !");
        }
        setEditId(null);
    }

    /* ── Ajouter ─────────────────────────────────────────────────────────── */

    async function ajouterConseiller() {
        const nom = nomAjout.trim();
        if (!nom) { setErreurAjout("Le nom est requis."); return; }
        setAjoutEnCours(true);
        setErreurAjout(null);
        const maxOrdre = conseillers.reduce((m, c) => Math.max(m, c.ordre ?? 0), 0);
        const prenom   = nom.split(" ")[0];
        const { data, error } = await supabase
            .from("conseillers")
            .insert({ nom, prenom, ordre: maxOrdre + 1, avatar: null })
            .select()
            .single();
        if (error) {
            setErreurAjout("Erreur lors de la création : " + error.message);
        } else {
            setConseillers(prev => [...prev, data as Conseiller]);
            setNomAjout("");
            afficherToast(`${prenom} ajouté·e à l'équipe !`);
        }
        setAjoutEnCours(false);
    }

    /* ── Supprimer ───────────────────────────────────────────────────────── */

    async function executerSuppression() {
        if (!deleteConfirm?.mode) return;
        const { conseiller, mode } = deleteConfirm;
        setDeleteEnCours(true);
        try {
            if (mode === "full") {
                await supabase.from("ventes").delete().eq("conseiller_id", conseiller.id);
            }
            await supabase.from("objectifs_mensuels").delete().eq("conseiller_id", conseiller.id);
            await supabase.from("challenges").delete().or(`createur.eq.${conseiller.id},adversaire.eq.${conseiller.id}`);
            const { error } = await supabase.from("conseillers").delete().eq("id", conseiller.id);
            if (error) throw error;
            setConseillers(prev => prev.filter(c => c.id !== conseiller.id));
            afficherToast(
                mode === "full"
                    ? `${conseiller.nom.split(" ")[0]} et toutes ses données supprimés.`
                    : `${conseiller.nom.split(" ")[0]} retiré·e de l'équipe. Historique conservé.`
            );
            setDeleteConfirm(null);
        } catch {
            afficherToast("Erreur lors de la suppression.", false);
        } finally {
            setDeleteEnCours(false);
        }
    }

    /* ── Render ──────────────────────────────────────────────────────────── */

    return (
        <main className="space-y-8">

            {/* ── Toast ─────────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl transition-all ${
                    toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                }`}>
                    {toast.ok ? "✓" : "✕"} {toast.msg}
                </div>
            )}

            {/* ── Input fichier caché ───────────────────────────────────── */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-9 shadow-[0_20px_60px_rgba(15,23,42,.30)]">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                <div className="relative">
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-400">KPILOTE Manager</p>
                    <h1 className="mt-2 text-4xl font-black text-white">Gestion de l'équipe</h1>
                    <p className="mt-1 text-sm text-slate-400">{conseillers.length} conseiller{conseillers.length > 1 ? "s" : ""} dans la boutique</p>
                </div>
            </div>

            {/* ── Liste conseillers ─────────────────────────────────────── */}
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                </div>
            ) : conseillers.length === 0 ? (
                <div className="rounded-[24px] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                    <p className="text-4xl mb-4">👥</p>
                    <p className="font-black text-slate-700">Aucun conseiller dans la boutique</p>
                    <p className="mt-1 text-sm text-slate-400">Utilisez le formulaire ci-dessous pour ajouter le premier conseiller.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {conseillers.map((c) => {
                        const isEditing   = editId === c.id;
                        const isUploading = uploadingId === c.id;
                        const isDeleting  = deleteConfirm?.conseiller.id === c.id;
                        return (
                            <div
                                key={c.id}
                                className={`flex items-center gap-5 rounded-[20px] bg-white px-6 py-5 shadow-[0_2px_16px_rgba(15,23,42,.06)] transition-all ${
                                    isDeleting ? "ring-2 ring-red-300" : ""
                                }`}
                            >
                                {/* Photo */}
                                <div className="relative flex-shrink-0">
                                    <div className={`overflow-hidden rounded-full transition-opacity ${isUploading ? "opacity-40" : ""}`}>
                                        <PhotoAvatar nom={c.nom} photoUrl={c.avatar} size={56} />
                                    </div>
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                                        </div>
                                    )}
                                </div>

                                {/* Nom */}
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            value={editNom}
                                            onChange={e => setEditNom(e.target.value)}
                                            onBlur={() => saveEdit(c.id)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") saveEdit(c.id);
                                                if (e.key === "Escape") setEditId(null);
                                            }}
                                            className="w-full rounded-xl border-2 border-violet-400 bg-violet-50 px-4 py-2 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-violet-300"
                                            placeholder="Nom complet"
                                        />
                                    ) : (
                                        <div>
                                            <p className="font-black text-slate-900">{c.nom}</p>
                                            <p className="text-xs text-slate-400">ID : {c.id.slice(0, 8)}…</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {!isEditing && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Avatar */}
                                        <button
                                            onClick={() => ouvrirUpload(c.id)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-violet-100 hover:text-violet-600"
                                            title="Changer la photo"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                <polyline points="17 8 12 3 7 8"/>
                                                <line x1="12" y1="3" x2="12" y2="15"/>
                                            </svg>
                                        </button>

                                        {/* Supprimer avatar si présent */}
                                        {c.avatar && (
                                            <button
                                                onClick={() => supprimerAvatar(c.id)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all hover:bg-red-50 hover:text-red-400"
                                                title="Supprimer la photo"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                    <circle cx="12" cy="8" r="4"/>
                                                    <path d="M20 21a8 8 0 1 0-16 0"/>
                                                    <line x1="18" y1="18" x2="22" y2="22"/>
                                                </svg>
                                            </button>
                                        )}

                                        {/* Genre H/F */}
                                        <button
                                            onClick={() => toggleGenre(c.id, c.genre)}
                                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black transition-all ${
                                                c.genre === "H" ? "bg-blue-100 text-blue-600"
                                                : c.genre === "F" ? "bg-pink-100 text-pink-600"
                                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                            }`}
                                            title={`Genre : ${c.genre ?? "non défini"} — cliquer pour changer`}
                                        >
                                            {c.genre ?? "?"}
                                        </button>

                                        {/* Renommer */}
                                        <button
                                            onClick={() => startEdit(c)}
                                            className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-500 transition-all hover:bg-violet-100 hover:text-violet-600"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                            Renommer
                                        </button>

                                        {/* Supprimer */}
                                        <button
                                            onClick={() => setDeleteConfirm({ conseiller: c, mode: null })}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all hover:bg-red-100 hover:text-red-500"
                                            title="Supprimer ce conseiller"
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                <path d="M10 11v6M14 11v6"/>
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Ajouter un conseiller ─────────────────────────────────── */}
            <div className="rounded-[24px] bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-violet-500">+ Ajouter un conseiller</p>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={nomAjout}
                            onChange={e => { setNomAjout(e.target.value); setErreurAjout(null); }}
                            onKeyDown={e => e.key === "Enter" && ajouterConseiller()}
                            placeholder="Nom complet (ex : Julie Martin)"
                            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-900 placeholder-slate-300 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                        />
                        {erreurAjout && <p className="mt-2 text-xs text-red-500">{erreurAjout}</p>}
                    </div>
                    <button
                        onClick={ajouterConseiller}
                        disabled={ajoutEnCours || !nomAjout.trim()}
                        className="flex-shrink-0 rounded-2xl bg-violet-600 px-7 py-3.5 text-sm font-black text-white shadow-[0_4px_16px_rgba(109,40,217,.30)] transition-all hover:bg-violet-700 disabled:opacity-40"
                    >
                        {ajoutEnCours ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                        ) : "Ajouter"}
                    </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                    Le conseiller apparaîtra immédiatement dans la liste de sélection. Vous pourrez ensuite uploader sa photo et définir ses objectifs.
                </p>
            </div>

            {/* ── Modal suppression ─────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !deleteEnCours && setDeleteConfirm(null)}>
                    <div className="mx-4 w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_rgba(15,23,42,.35)]" onClick={e => e.stopPropagation()}>

                        <div className="bg-red-50 px-8 py-6">
                            <p className="text-lg font-black text-red-700">
                                Supprimer {deleteConfirm.conseiller.nom.split(" ")[0]} ?
                            </p>
                            <p className="mt-1 text-sm text-red-500">
                                Cette action est irréversible. Choisissez ce que vous souhaitez conserver.
                            </p>
                        </div>

                        <div className="space-y-3 p-6">
                            {/* Option 1 : Archiver */}
                            <button
                                onClick={() => setDeleteConfirm(prev => prev ? { ...prev, mode: "archive" } : null)}
                                className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                                    deleteConfirm.mode === "archive"
                                        ? "border-amber-400 bg-amber-50"
                                        : "border-slate-200 bg-slate-50 hover:border-amber-300"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">📦</span>
                                    <div>
                                        <p className="font-black text-slate-800">Conserver l'historique</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Le conseiller est retiré de l'équipe. Ses ventes et performances passées restent dans la base — utiles pour les analyses historiques.
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Option 2 : Tout supprimer */}
                            <button
                                onClick={() => setDeleteConfirm(prev => prev ? { ...prev, mode: "full" } : null)}
                                className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
                                    deleteConfirm.mode === "full"
                                        ? "border-red-400 bg-red-50"
                                        : "border-slate-200 bg-slate-50 hover:border-red-300"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">🗑️</span>
                                    <div>
                                        <p className="font-black text-slate-800">Supprimer toutes les données</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Efface le conseiller, ses ventes, ses objectifs et ses défis. Aucune trace conservée.
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="flex gap-3 border-t border-slate-100 p-5">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleteEnCours}
                                className="flex-1 rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={executerSuppression}
                                disabled={!deleteConfirm.mode || deleteEnCours}
                                className={`flex-1 rounded-2xl py-3 text-sm font-black text-white transition-all disabled:opacity-40 ${
                                    deleteConfirm.mode === "full"
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-amber-500 hover:bg-amber-600"
                                }`}
                            >
                                {deleteEnCours ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Suppression…
                                    </div>
                                ) : deleteConfirm.mode === "full" ? "Supprimer tout" : deleteConfirm.mode === "archive" ? "Retirer de l'équipe" : "Confirmer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}
