"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import ThemePicker from "@/components/dashboard/ThemePicker";
import OrdreMissionsCard from "@/components/dashboard/OrdreMissionsCard";
import { uploadPhoto, getPhotoUrl } from "@/services/photoService";
import { getMoisDisponibles, getRecapMensuel, RecapMensuel } from "@/services/recapMensuelService";
import { calculerStreak } from "@/services/streakService";
import { getJoursTravailPlage, estWeekend, jourStr, StatutJour } from "@/services/planningService";
import { useGenres, accord } from "@/utils/genre";

/**
 * Profil repensé (variante &profil=v2) : carte d'identité avec repères rapides, mon planning
 * des 2 prochaines semaines, mon mois dernier (actes / Quali séparés, évolution vs le mois
 * d'avant) et la personnalisation regroupée. L'identifiant technique n'est plus affiché.
 */

const STATUTS: Record<StatutJour, { label: string; classe: string }> = {
    present: { label: "Boutique", classe: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    off: { label: "Repos", classe: "bg-slate-50 text-slate-400 ring-slate-200" },
    formation: { label: "Formation", classe: "bg-sky-50 text-sky-700 ring-sky-200" },
    arret_maladie: { label: "Arrêt", classe: "bg-rose-50 text-rose-700 ring-rose-200" },
    conges_payes: { label: "Congés", classe: "bg-amber-50 text-amber-700 ring-amber-200" },
    ferie: { label: "Férié", classe: "bg-violet-50 text-violet-700 ring-violet-200" },
};
const NB_JOURS_PLANNING = 14;

function Carte({ titre, children, action }: { titre: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <section className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)] sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{titre}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function ProfilV2({ conseillerId, nom }: { conseillerId: string; nom: string }) {
    const genre = useGenres()[conseillerId] ?? null;
    const prenom = nom.split(" ")[0];

    // ── Photo ──
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [fichier, setFichier] = useState<File | null>(null);
    const [envoi, setEnvoi] = useState(false);
    const [messagePhoto, setMessagePhoto] = useState<{ ok: boolean; texte: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Repères ──
    const [serie, setSerie] = useState<number | null>(null);
    const [nbTrophees, setNbTrophees] = useState<number | null>(null);
    const [joursRestants, setJoursRestants] = useState<number | null>(null);

    // ── Planning ──
    const [planning, setPlanning] = useState<{ jour: Date; statut: StatutJour; saisi: boolean }[] | null>(null);

    // ── Récap ──
    const moisDisponibles = getMoisDisponibles(12);
    const [mois, setMois] = useState<string | null>(moisDisponibles[0]?.valeur ?? null);
    const [recap, setRecap] = useState<RecapMensuel | null>(null);
    const [recapAvant, setRecapAvant] = useState<RecapMensuel | null>(null);
    const [chargementRecap, setChargementRecap] = useState(false);

    const [ordreOuvert, setOrdreOuvert] = useState(false);

    useEffect(() => {
        if (!conseillerId) return;
        getPhotoUrl(conseillerId).then(setPhotoUrl).catch(() => {});
        calculerStreak(conseillerId).then((s) => setSerie(s.streakActuel)).catch(() => setSerie(null));
        supabase.from("conseiller_badges").select("badge_code", { count: "exact", head: true }).eq("conseiller_id", conseillerId)
            .then(({ count }) => setNbTrophees(count ?? 0));
        const auj = new Date(); auj.setHours(0, 0, 0, 0);
        const finMois = new Date(auj.getFullYear(), auj.getMonth() + 1, 0);
        getJoursTravailPlage(conseillerId, auj, finMois).then(setJoursRestants).catch(() => setJoursRestants(null));

        const fin = new Date(auj); fin.setDate(fin.getDate() + NB_JOURS_PLANNING - 1);
        supabase.from("planning_conseillers").select("jour, statut").eq("conseiller_id", conseillerId)
            .gte("jour", jourStr(auj)).lte("jour", jourStr(fin))
            .then(({ data }) => {
                const parJour: Record<string, StatutJour> = {};
                (data ?? []).forEach((r: { jour: string; statut: StatutJour }) => { parJour[r.jour] = r.statut; });
                setPlanning(Array.from({ length: NB_JOURS_PLANNING }, (_, i) => {
                    const d = new Date(auj); d.setDate(d.getDate() + i);
                    const saisi = parJour[jourStr(d)];
                    // Même règle que les objectifs : jour non saisi = boutique en semaine, repos le week-end.
                    return { jour: d, statut: saisi ?? (estWeekend(d) ? "off" : "present"), saisi: !!saisi };
                }));
            });
    }, [conseillerId]);

    useEffect(() => {
        if (!mois || !conseillerId) return;
        setChargementRecap(true);
        const [a, m] = mois.split("-").map(Number);
        const precedent = new Date(a, m - 2, 1);
        const moisPrec = `${precedent.getFullYear()}-${String(precedent.getMonth() + 1).padStart(2, "0")}`;
        const avecPrec = moisDisponibles.some((x) => x.valeur === moisPrec);
        Promise.all([getRecapMensuel(conseillerId, mois), avecPrec ? getRecapMensuel(conseillerId, moisPrec) : Promise.resolve(null)])
            .then(([r, p]) => { setRecap(r); setRecapAvant(p); })
            .catch(() => { setRecap(null); setRecapAvant(null); })
            .finally(() => setChargementRecap(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mois, conseillerId]);

    function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { setMessagePhoto({ ok: false, texte: "Fichier trop lourd — max 5 Mo." }); return; }
        if (!f.type.startsWith("image/")) { setMessagePhoto({ ok: false, texte: "Fichier invalide — image uniquement." }); return; }
        setMessagePhoto(null);
        setFichier(f);
        setPreview(URL.createObjectURL(f));
    }
    async function enregistrerPhoto() {
        if (!fichier) return;
        setEnvoi(true);
        try {
            setPhotoUrl(await uploadPhoto(conseillerId, fichier));
            setPreview(null); setFichier(null);
            setMessagePhoto({ ok: true, texte: "Photo mise à jour !" });
            setTimeout(() => setMessagePhoto(null), 3000);
        } catch (e: unknown) {
            setMessagePhoto({ ok: false, texte: e instanceof Error ? e.message : "Erreur lors de l'envoi." });
        } finally { setEnvoi(false); }
    }
    function annulerPhoto() {
        setPreview(null); setFichier(null); setMessagePhoto(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    const affichee = preview ?? photoUrl;
    const lien = (page: string) => `/dashboard/${page}?id=${conseillerId}&nom=${encodeURIComponent(nom)}`;
    const ecart = recap && recapAvant ? recap.totalActes - recapAvant.totalActes : null;
    const produitsVendus = recap ? recap.parProduit.filter((p) => p.nombre > 0) : [];

    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Mon espace</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Profil</h1>
            </div>

            {/* ── Identité + repères ─────────────────────────────── */}
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,.3)] sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => fileRef.current?.click()} className="group relative shrink-0 overflow-hidden rounded-full ring-4 ring-white/15" style={{ width: 112, height: 112 }} aria-label="Changer ma photo">
                        {affichee
                            ? <img src={affichee} alt={nom} className="h-full w-full object-cover" />
                            : <PhotoAvatar nom={nom} size={112} />}
                        <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">📷 Changer</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={choisirFichier} />

                    <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-3xl font-black">{prenom}</p>
                        <p className="text-sm font-semibold text-white/60">{accord(genre, "Conseiller", "Conseillère")} KPILOTE</p>
                        {preview ? (
                            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                                <button onClick={enregistrerPhoto} disabled={envoi} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{envoi ? "Envoi…" : "✅ Enregistrer la photo"}</button>
                                <button onClick={annulerPhoto} disabled={envoi} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white/80">Annuler</button>
                            </div>
                        ) : (
                            <button onClick={() => fileRef.current?.click()} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/15">
                                📷 {photoUrl ? "Changer ma photo" : "Ajouter une photo"}
                            </button>
                        )}
                        {messagePhoto && <p className={`mt-2 text-sm font-semibold ${messagePhoto.ok ? "text-emerald-300" : "text-rose-300"}`}>{messagePhoto.texte}</p>}
                    </div>

                    <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
                        {[
                            { emoji: "🔥", valeur: serie, label: "jours de série", href: lien("badges") },
                            { emoji: "🏆", valeur: nbTrophees, label: "trophées", href: lien("badges") },
                            { emoji: "📅", valeur: joursRestants, label: "jours planifiés restants", href: null },
                        ].map((k) => {
                            const contenu = (
                                <>
                                    <p className="text-2xl font-black tabular-nums">{k.emoji} {k.valeur ?? "–"}</p>
                                    <p className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-white/50">{k.label}</p>
                                </>
                            );
                            return k.href
                                ? <Link key={k.label} href={k.href} className="rounded-2xl bg-white/[0.07] p-3 text-center ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] sm:w-28">{contenu}</Link>
                                : <div key={k.label} className="rounded-2xl bg-white/[0.07] p-3 text-center ring-1 ring-white/10 sm:w-28">{contenu}</div>;
                        })}
                    </div>
                </div>
            </section>

            {/* ── Mon planning ───────────────────────────────────── */}
            <Carte titre="🗓️ Mon planning — 2 prochaines semaines">
                {!planning ? (
                    <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ) : (
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {planning.map(({ jour, statut, saisi }, i) => {
                            const s = STATUTS[statut] ?? STATUTS.off;
                            const aujourdhui = i === 0;
                            return (
                                <div key={i} title={saisi ? s.label : `${s.label} (non saisi au planning)`} className={`rounded-xl px-1 py-2 text-center ring-1 ${s.classe} ${aujourdhui ? "ring-2 !ring-violet-500" : ""} ${saisi ? "" : "opacity-70"}`}>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">{jour.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</p>
                                    <p className="text-lg font-black tabular-nums text-slate-800">{jour.getDate()}</p>
                                    <p className="truncate text-[10px] font-black">{aujourdhui ? "Auj." : s.label}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="mt-3 text-[11px] text-slate-400">Le planning est saisi par ton manager. Un jour non saisi compte comme un jour en boutique en semaine.</p>
            </Carte>

            {/* ── Mes récaps ─────────────────────────────────────── */}
            <Carte titre="📊 Mes récaps">
                {moisDisponibles.length === 0 ? (
                    <p className="text-sm text-slate-400">Ton premier récap arrivera à la fin du mois.</p>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap gap-2">
                            {moisDisponibles.map((m) => (
                                <button key={m.valeur} onClick={() => setMois(m.valeur)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${mois === m.valeur ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        {chargementRecap || !recap ? (
                            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-white">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Actes</p>
                                        <p className="mt-1 text-4xl font-black tabular-nums">{recap.totalActes}</p>
                                        {ecart !== null && recapAvant && recapAvant.totalActes > 0 && (
                                            <p className="mt-1 text-xs font-bold text-white/80">
                                                {ecart > 0 ? "▲" : ecart < 0 ? "▼" : "="} {ecart > 0 ? "+" : ""}{ecart} vs {recapAvant.label.split(" ")[0].toLowerCase()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Quali</p>
                                        <p className="mt-1 text-4xl font-black tabular-nums text-slate-900">{recap.totalQuali}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-400">avis Google + récaps co</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Régularité</p>
                                        <p className="mt-1 text-4xl font-black tabular-nums text-slate-900">{recap.joursActifs}<span className="text-base font-bold text-slate-400"> j</span></p>
                                        <p className="mt-1 text-xs font-semibold text-slate-400">jours avec au moins une vente</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {produitsVendus.map((p) => (
                                        <span key={p.code} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-800 ring-1 ring-slate-200">
                                            <span aria-hidden="true">{p.emoji}</span> {p.nombre} <span className="font-semibold text-slate-400">{p.label}</span>
                                        </span>
                                    ))}
                                    {recap.combos.mcafee_mobile > 0 && <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-800 ring-1 ring-slate-200">🔐 {recap.combos.mcafee_mobile} <span className="font-semibold text-slate-400">McAfee Mobile</span></span>}
                                    {recap.combos.assurance_essentielle > 0 && <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-800 ring-1 ring-slate-200">⛑️ {recap.combos.assurance_essentielle} <span className="font-semibold text-slate-400">Assu. essentielle</span></span>}
                                    {recap.combos.canal_plus > 0 && <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-800 ring-1 ring-slate-200">📺 {recap.combos.canal_plus} <span className="font-semibold text-slate-400">Canal+</span></span>}
                                </div>

                                {recap.meilleurJour && (
                                    <p className="text-sm font-semibold text-slate-500">
                                        🌟 Meilleur jour : <span className="font-black text-slate-800">{new Date(`${recap.meilleurJour.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span> avec {recap.meilleurJour.nombre} vente{recap.meilleurJour.nombre > 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Carte>

            {/* ── Personnalisation ───────────────────────────────── */}
            <ThemePicker conseillerId={conseillerId} />
            <section className="rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                <button onClick={() => setOrdreOuvert(!ordreOuvert)} aria-expanded={ordreOuvert} className="flex w-full items-center justify-between gap-3 p-5 text-left sm:px-7">
                    <span>
                        <span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">🎯 Ordre de mes objectifs</span>
                        <span className="mt-1 block text-sm text-slate-500">L&apos;ordre des cartes sur ton Accueil</span>
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${ordreOuvert ? "rotate-180" : ""}`} />
                </button>
                {ordreOuvert && <div className="px-2 pb-2 sm:px-0 sm:pb-0 [&>*]:shadow-none">
                    <OrdreMissionsCard conseillerId={conseillerId} />
                </div>}
            </section>
        </div>
    );
}
