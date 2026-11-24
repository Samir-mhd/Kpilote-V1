"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, ExternalLink, Check, RefreshCw, Minus, Smartphone, Battery, Camera, Wifi, SlidersHorizontal, Printer } from "lucide-react";
import type { CatalogueTelephones, TelephoneFree, VarianteTel, PrixFlex } from "@/services/telephonesFreeService";

type Profil = "prospect" | "abonne";
type Tri = "flex" | "comptant" | "comptant_desc" | "nom";

/** Couleurs façon Free : rouge et blanc. */
const ROUGE = "bg-[#cd1e25]";
const ROUGE_TXT = "text-[#cd1e25]";
const MAX_COCHES = 3;

const eur = (n: number | null | undefined, dec = true) =>
    n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: dec && n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const go = (n: number) => (n <= 0 ? "—" : n >= 1024 ? `${n / 1024} To` : `${n} Go`);
const mpx = (n: number | null, siAbsent = "Non") => (n ? `${n} Mpx` : siAbsent);
const flexDe = (v: VarianteTel, p: Profil): PrixFlex | null => (p === "abonne" ? v.flexAbonne : v.flexProspect);
const rembMax = (v: VarianteTel) => v.offres.reduce((t, o) => t + o.montant, 0);

const FORFAITS = [9.99, 12.99, 15.99, 19.99];
/** Grille assurance mobile : classe selon le prix comptant de base (sans remise). */
const ASSURANCE: [number, number][] = [[250, 4.99], [400, 8.99], [600, 12.99], [800, 13.99], [1000, 14.99], [1300, 16.99], [2000, 19.99], [Infinity, 22.99]];
const assuranceDe = (v: VarianteTel): { classe: number; prix: number } | null => {
    if (v.comptant == null) return null;
    const i = ASSURANCE.findIndex(([max]) => v.comptant! <= max);
    return { classe: i + 1, prix: ASSURANCE[i][1] };
};
type Options = { forfait: number; assurance: boolean };
/** Mensualité affichée = Free Flex + forfait choisi + assurance (si cochés). */
const mensuelTotal = (v: VarianteTel, p: Profil, o: Options): number | null => {
    const f = flexDe(v, p);
    if (!f) return null;
    return Math.round((f.mensuel + o.forfait + (o.assurance ? assuranceDe(v)?.prix ?? 0 : 0)) * 100) / 100;
};

function dateMaj(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ComparateurTelephonesPage() {
    const [data, setData] = useState<CatalogueTelephones | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [profil, setProfil] = useState<Profil>("prospect");
    const [recherche, setRecherche] = useState("");
    const [marque, setMarque] = useState("Toutes");
    const [tri, setTri] = useState<Tri>("flex");
    const [reco, setReco] = useState(false);
    const [stockage, setStockage] = useState<Record<number, number>>({});
    const [coches, setCoches] = useState<number[]>([]);
    const [ouvert, setOuvert] = useState(false);
    const [forfait, setForfait] = useState(0);
    const [assurance, setAssurance] = useState(false);
    const options: Options = { forfait, assurance };
    const avecOptions = forfait > 0 || assurance;

    const [actualisation, setActualisation] = useState<"" | "en_cours" | "ok" | "erreur">("");
    const [prenom, setPrenom] = useState("");
    useEffect(() => { setPrenom((new URLSearchParams(window.location.search).get("nom") ?? "").trim().split(/\s+/)[0] ?? ""); }, []);

    useEffect(() => {
        fetch("/api/telephones")
            .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.erreur ?? "Erreur"); setData(j); })
            .catch((e) => setErreur(e.message));
    }, []);

    /** Relit mobile.free.fr tout de suite (sans attendre la mise à jour automatique horaire). */
    async function actualiser() {
        setActualisation("en_cours");
        try {
            const r = await fetch("/api/telephones", { method: "POST" });
            const j = await r.json();
            if (!r.ok) throw new Error(j.erreur ?? "Erreur");
            setData(j);
            setActualisation("ok");
        } catch {
            setActualisation("erreur");
        }
        setTimeout(() => setActualisation(""), 4000);
    }

    const variante = (t: TelephoneFree) => t.variantes.find((v) => v.stockage === stockage[t.id]) ?? t.variantes[0];

    const marques = useMemo(() => {
        const n: Record<string, number> = {};
        data?.telephones.forEach((t) => { n[t.marque] = (n[t.marque] ?? 0) + 1; });
        return ["Toutes", ...Object.keys(n).sort((a, b) => n[b] - n[a])];
    }, [data]);

    const liste = useMemo(() => {
        if (!data) return [];
        const q = recherche.trim().toLowerCase();
        const l = data.telephones.filter((t) =>
            (marque === "Toutes" || t.marque === marque) &&
            (!reco || t.reconditionne) &&
            (!q || `${t.marque} ${t.nom}`.toLowerCase().includes(q)));
        const prixFlex = (t: TelephoneFree) => mensuelTotal(t.variantes[0], profil, { forfait, assurance }) ?? Infinity;
        const prixCash = (t: TelephoneFree) => t.variantes[0].comptant ?? Infinity;
        return l.sort((a, b) =>
            tri === "flex" ? prixFlex(a) - prixFlex(b)
                : tri === "comptant" ? prixCash(a) - prixCash(b)
                    : tri === "comptant_desc" ? prixCash(b) - prixCash(a)
                        : `${a.marque} ${a.nom}`.localeCompare(`${b.marque} ${b.nom}`));
    }, [data, recherche, marque, reco, tri, profil, forfait, assurance]);

    function cocher(id: number) {
        setCoches((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_COCHES ? c : [...c, id]));
    }

    const choisis = coches.map((id) => data?.telephones.find((t) => t.id === id)).filter(Boolean) as TelephoneFree[];

    if (erreur) {
        return (
            <div className="mx-auto mt-16 max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
                <p className="text-3xl">📵</p>
                <p className="mt-2 font-black text-slate-900">Catalogue Free indisponible</p>
                <p className="mt-1 text-sm text-slate-500">Le site mobile.free.fr n&apos;a pas répondu. Réessaie dans quelques minutes.</p>
                <p className="mt-3 text-xs text-slate-400">{erreur}</p>
            </div>
        );
    }

    return (
        <div className="pb-28">
            {/* En-tête (version A) : titre + date des prix, puis une barre d'outils unique et les marques */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${ROUGE_TXT}`}>Outils</p>
                    <h1 className="text-3xl font-black text-slate-900">Comparateur téléphones</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    {actualisation === "en_cours" ? "Lecture de mobile.free.fr…"
                        : actualisation === "ok" ? "✓ Offres à jour"
                            : actualisation === "erreur" ? "Free ne répond pas, réessaie"
                                : data ? `Prix Free du ${dateMaj(data.majLe)}` : "Chargement du catalogue Free…"}
                    {data && (
                        <button onClick={actualiser} disabled={actualisation === "en_cours"} aria-label="Actualiser les offres" title="Actualiser les offres"
                            className="rounded-lg bg-white p-1.5 text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-red-50 hover:text-[#cd1e25] disabled:opacity-60">
                            <RefreshCw size={13} className={actualisation === "en_cours" ? "animate-spin" : ""} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                <div className="relative min-w-[220px] flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un modèle…"
                        className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-[#cd1e25]" />
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                    {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                        <button key={p} onClick={() => setProfil(p)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-black transition-colors ${profil === p ? `${ROUGE} text-white` : "text-slate-500 hover:text-slate-900"}`}>
                            {l}
                        </button>
                    ))}
                </div>
                <select value={forfait} onChange={(e) => setForfait(Number(e.target.value))} aria-label="Forfait inclus dans la mensualité"
                    className={`rounded-xl px-3 py-2.5 text-sm font-bold outline-none ${forfait > 0 ? `${ROUGE} text-white` : "bg-slate-100 text-slate-700"}`}>
                    <option value={0}>Forfait : aucun</option>
                    {FORFAITS.map((f) => <option key={f} value={f}>Forfait : {eur(f)}</option>)}
                </select>
                <button onClick={() => setAssurance(!assurance)} role="switch" aria-checked={assurance}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${assurance ? "bg-red-50 text-[#cd1e25]" : "bg-slate-100 text-slate-700"}`}>
                    <span className={`h-4 w-7 rounded-full p-0.5 transition-colors ${assurance ? ROUGE : "bg-slate-300"}`}>
                        <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${assurance ? "translate-x-3" : ""}`} />
                    </span>
                    Protection
                </button>
                <select value={tri} onChange={(e) => setTri(e.target.value as Tri)} aria-label="Tri"
                    className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none">
                    <option value="flex">Free Flex : moins cher</option>
                    <option value="comptant">Comptant : moins cher</option>
                    <option value="comptant_desc">Comptant : plus cher</option>
                    <option value="nom">Nom (A → Z)</option>
                </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {marques.map((m) => (
                    <button key={m} onClick={() => setMarque(m)}
                        className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${marque === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                        {m}
                    </button>
                ))}
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button onClick={() => setReco(!reco)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${reco ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                    ♻️ Reconditionnés
                </button>
            </div>

            {/* Grille */}
            {!data ? (
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}
                </div>
            ) : (
                <>
                    <p className="mt-4 text-xs font-bold text-slate-400">{liste.length} modèle{liste.length > 1 ? "s" : ""} · clique sur une carte pour la sélectionner (jusqu&apos;à 3)</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {liste.map((t) => {
                            const v = variante(t);
                            const f = flexDe(v, profil);
                            const coche = coches.includes(t.id);
                            const bloque = !coche && coches.length >= MAX_COCHES;
                            const remb = rembMax(v);
                            return (
                                <div key={t.id} role="button" tabIndex={0} aria-pressed={coche}
                                    aria-label={`${coche ? "Retirer" : "Sélectionner"} ${t.marque} ${t.nom}`}
                                    title={bloque ? "3 modèles maximum : retire-en un pour en ajouter un autre" : undefined}
                                    onClick={() => cocher(t.id)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cocher(t.id); } }}
                                    className={`relative flex select-none flex-col rounded-3xl bg-white p-4 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#cd1e25] ${coche ? "cursor-pointer shadow-[0_10px_30px_rgba(205,30,37,.18)] ring-2 ring-[#cd1e25]" : bloque ? "cursor-not-allowed opacity-60 ring-1 ring-slate-200" : "cursor-pointer ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-[#cd1e25]/40"}`}>
                                    {coche && (
                                        <span className={`absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full ${ROUGE} text-white shadow-md`}>
                                            <Check size={16} strokeWidth={3.5} />
                                        </span>
                                    )}
                                    <div className="flex gap-1.5">
                                        {t.nouveau && <span className={`rounded-full ${ROUGE} px-2 py-0.5 text-[10px] font-black text-white`}>Nouveau</span>}
                                        {t.reconditionne && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">Reconditionné</span>}
                                    </div>
                                    <img src={t.image} alt={`${t.marque} ${t.nom}`} loading="lazy" className="mx-auto mt-2 h-36 w-full object-contain" />
                                    <p className="mt-3 text-[11px] font-black uppercase tracking-wider text-slate-400">{t.marque}</p>
                                    <p className="font-black leading-tight text-slate-900">{t.nom}</p>
                                    {t.variantes.length > 1 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {t.variantes.map((x) => (
                                                <button key={x.stockage} onClick={(e) => { e.stopPropagation(); setStockage((s) => ({ ...s, [t.id]: x.stockage })); }}
                                                    className={`rounded-lg px-2 py-0.5 text-[11px] font-black ${x.stockage === v.stockage ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                                    {go(x.stockage)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {t.variantes.length === 1 && v.stockage > 0 && <p className="mt-1 text-xs font-bold text-slate-400">{go(v.stockage)}</p>}
                                    <div className="mt-auto pt-3">
                                        <div className="rounded-2xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${ROUGE_TXT}`}>
                                                Free Flex · {profil === "abonne" ? "abonné" : "nouveau client"}{forfait > 0 && " + forfait"}{assurance && " + protection"}
                                            </p>
                                            {f ? (
                                                <>
                                                    <p className="text-xl font-black tabular-nums text-slate-900">{eur(mensuelTotal(v, profil, options))}<span className="text-xs font-bold text-slate-500">/mois</span></p>
                                                    {avecOptions && (
                                                        <p className="text-[11px] font-semibold leading-snug text-slate-600">
                                                            tél. {eur(f.mensuel)}{forfait > 0 && <> + forfait {eur(forfait)}</>}{assurance && assuranceDe(v) && <> + protection {eur(assuranceDe(v)!.prix)}</>}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] font-semibold text-slate-600">
                                                        {eur(f.premierLoyer)} au départ
                                                        {f.optionAchat != null && <> · option d&apos;achat {eur(f.optionAchat)}</>}
                                                    </p>
                                                </>
                                            ) : <p className="text-sm font-bold text-slate-400">Non disponible</p>}
                                        </div>
                                        <div className="mt-2 flex items-baseline justify-between px-1">
                                            <span className="text-xs font-bold text-slate-400">Comptant</span>
                                            <span className="font-black tabular-nums text-slate-900">{eur(v.comptant)}</span>
                                        </div>
                                        {remb > 0 && <p className={`mt-1 px-1 text-[11px] font-bold ${ROUGE_TXT}`}>🎁 Jusqu&apos;à {eur(remb, false)} d&apos;offres</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {data.erreurs > 0 && <p className="mt-4 text-center text-xs text-slate-400">{data.erreurs} fiche{data.erreurs > 1 ? "s" : ""} Free n&apos;ont pas pu être lues.</p>}
                </>
            )}

            {/* Barre de sélection */}
            {coches.length > 0 && (
                <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-950 p-2 pl-4 text-white shadow-2xl">
                        {choisis.map((t) => (
                            <span key={t.id} className="flex items-center gap-1.5 rounded-xl bg-white/10 py-1 pl-2.5 pr-1 text-sm font-bold">
                                {t.nom}
                                <button onClick={() => cocher(t.id)} aria-label="Retirer" className="rounded-lg p-1 hover:bg-white/10"><X size={14} /></button>
                            </span>
                        ))}
                        {coches.length < MAX_COCHES && <span className="px-1 text-xs text-white/50">{coches.length === 1 ? "Coche un 2e modèle pour comparer" : "Jusqu'à 3 modèles"}</span>}
                        <button onClick={() => setOuvert(true)} className={`rounded-xl ${ROUGE} px-5 py-2.5 text-sm font-black hover:brightness-110`}>
                            {coches.length === 1 ? "Afficher" : `Comparer (${coches.length})`}
                        </button>
                    </div>
                </div>
            )}

            {ouvert && choisis.length > 0 && (
                <Comparaison tels={choisis} variantes={choisis.map(variante)} profil={profil} setProfil={setProfil} options={options} setProtection={setAssurance} setForfait={setForfait} onClose={() => setOuvert(false)} majLe={data?.majLe ?? null} prenom={prenom} />
            )}
        </div>
    );
}

/* ─── Fiche (1 modèle) ou comparaison (2 à 3 modèles) ─────────────────────── */

type Ligne = { label: string; val: (t: TelephoneFree, v: VarianteTel) => string; num?: (t: TelephoneFree, v: VarianteTel) => number | null; mieux?: "bas" | "haut" };

function Comparaison({ tels, variantes, profil, setProfil, options, setProtection, setForfait, onClose, majLe, prenom }: {
    tels: TelephoneFree[]; variantes: VarianteTel[]; profil: Profil; setProfil: (p: Profil) => void; options: Options;
    /** Interrupteur Protection dans l'en-tête : évite de revenir en arrière si on l'a oubliée. */
    setProtection: (actif: boolean) => void; setForfait: (montant: number) => void; onClose: () => void;
    majLe: string | null; prenom: string;
}) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, [onClose]);

    const seul = tels.length === 1;
    const [reglages, setReglages] = useState(false);
    const avecOptions = options.forfait > 0 || options.assurance;

    const prix: Ligne[] = [
        ...(avecOptions ? [
            { label: `Total / mois (${["téléphone", options.forfait > 0 && "forfait", options.assurance && "protection"].filter(Boolean).join(" + ")})`, val: (_: TelephoneFree, v: VarianteTel) => eur(mensuelTotal(v, profil, options)), num: (_: TelephoneFree, v: VarianteTel) => mensuelTotal(v, profil, options), mieux: "bas" as const },
        ] : []),
        { label: avecOptions ? "dont téléphone (Free Flex)" : "Free Flex / mois", val: (_, v) => eur(flexDe(v, profil)?.mensuel), num: (_, v) => flexDe(v, profil)?.mensuel ?? null, mieux: "bas" },
        ...(options.forfait > 0 ? [{ label: "dont forfait", val: () => eur(options.forfait) }] : []),
        ...(options.assurance ? [{ label: "dont protection", val: (_: TelephoneFree, v: VarianteTel) => { const a = assuranceDe(v); return a ? eur(a.prix) : "—"; }, num: (_: TelephoneFree, v: VarianteTel) => assuranceDe(v)?.prix ?? null, mieux: "bas" as const }] : []),
        { label: "1er loyer", val: (_, v) => eur(flexDe(v, profil)?.premierLoyer), num: (_, v) => flexDe(v, profil)?.premierLoyer ?? null, mieux: "bas" },
        { label: "Option d'achat (fin de contrat)", val: (_, v) => eur(flexDe(v, profil)?.optionAchat) },
        { label: "Comptant", val: (_, v) => eur(v.comptant), num: (_, v) => v.comptant, mieux: "bas" },
        { label: "Comptant après remboursements", val: (_, v) => eur(v.comptantApresRemb), num: (_, v) => v.comptantApresRemb, mieux: "bas" },
    ];
    const general: Ligne[] = [
        { label: "Stockage", val: (_, v) => go(v.stockage), num: (_, v) => v.stockage, mieux: "haut" },
        { label: "Écran", val: (t) => t.carac.ecran ?? "—" },
        { label: "Mémoire vive", val: (t) => (t.carac.ram ? `${t.carac.ram} Go` : "—"), num: (t) => t.carac.ram, mieux: "haut" },
        { label: "Poids", val: (t) => (t.carac.poids ? `${t.carac.poids} g` : "—"), num: (t) => t.carac.poids, mieux: "bas" },
    ];
    const batterie: Ligne[] = [
        { label: "Batterie", val: (t) => (t.carac.batterie ? `${t.carac.batterie.toLocaleString("fr-FR")} mAh${t.carac.batterieHorsFree ? "*" : ""}` : "—"), num: (t) => t.carac.batterie, mieux: "haut" },
        { label: "Recharge filaire", val: (t) => (t.carac.chargeFilaireW ? `Jusqu'à ${t.carac.chargeFilaireW} W${t.carac.chargeRapide ? " (rapide)" : ""}` : t.carac.chargeRapide ? "Rapide" : "—"), num: (t) => t.carac.chargeFilaireW, mieux: "haut" },
        { label: "Recharge sans fil", val: (t) => (t.carac.sansFil ? (t.carac.sansFilRapide ? "Oui, rapide" : "Oui") : "Non"), num: (t) => (t.carac.sansFil ? (t.carac.sansFilRapide ? 2 : 1) : 0), mieux: "haut" },
    ];
    const photo: Ligne[] = [
        { label: "Capteurs photo arrière", val: (t) => (t.carac.nbCapteurs ? String(t.carac.nbCapteurs) : "—"), num: (t) => t.carac.nbCapteurs, mieux: "haut" },
        { label: "Capteur principal", val: (t) => mpx(t.carac.capteurPrincipal, "—"), num: (t) => t.carac.capteurPrincipal, mieux: "haut" },
        { label: "Ultra grand-angle", val: (t) => mpx(t.carac.ultraGrandAngle), num: (t) => t.carac.ultraGrandAngle ?? 0, mieux: "haut" },
        { label: "Téléobjectif (zoom optique)", val: (t) => mpx(t.carac.teleobjectif), num: (t) => t.carac.teleobjectif ?? 0, mieux: "haut" },
        { label: "Macro", val: (t) => mpx(t.carac.macro), num: (t) => t.carac.macro ?? 0, mieux: "haut" },
        { label: "Caméra selfie", val: (t) => mpx(t.carac.selfie, "—"), num: (t) => t.carac.selfie, mieux: "haut" },
        { label: "Vidéo", val: (t) => (t.carac.video ? `${t.carac.video}${t.carac.stabilisation ? ", stabilisée" : ""}` : "—") },
    ];
    const autres: Ligne[] = [
        { label: "5G", val: (t) => (t.carac.fiveG ? "Oui" : "Non") },
        { label: "eSIM", val: (t) => (t.carac.esim ? "Oui" : "Non") },
    ];

    /** Indices des meilleures valeurs d'une ligne ; vide si 1 seul modèle ou si toutes égales. */
    function meilleurs(l: Ligne): Set<number> {
        if (seul || !l.num || !l.mieux) return new Set();
        const n = tels.map((t, i) => l.num!(t, variantes[i]));
        const valides = n.filter((x): x is number => x != null);
        if (valides.length !== tels.length || new Set(valides).size < 2) return new Set();
        const m = l.mieux === "bas" ? Math.min(...valides) : Math.max(...valides);
        return new Set(n.map((x, i) => (x === m ? i : -1)).filter((i) => i >= 0));
    }

    const sections: { titre: string; Icone: typeof Smartphone; lignes: Ligne[] }[] = [
        { titre: "Écran et mémoire", Icone: Smartphone, lignes: general },
        { titre: "Batterie et recharge", Icone: Battery, lignes: batterie },
        { titre: "Photo et vidéo", Icone: Camera, lignes: photo },
        { titre: "Connectivité", Icone: Wifi, lignes: autres },
    ];
    const toutes = [...prix, ...general, ...batterie, ...photo];
    const meilleursParLigne = new Map(toutes.map((l) => [l, meilleurs(l)]));
    const pointsForts = tels.map((_, i) => toutes.filter((l) => meilleursParLigne.get(l)!.has(i)).length);
    // Point fort mis en avant (comparaison uniquement) : le critère où le téléphone devance
    // seul les autres avec le plus grand écart relatif. Pas de badge sans avance nette (≥ 5 %).
    const pouces = (t: TelephoneFree) => { const m = t.carac.ecran?.match(/(d+(?:[.,]d+)?)s*"/); return m ? Number(m[1].replace(",", ".")) : null; };
    const CRITERES_FORTS: { badge: string; mieux: "haut" | "bas"; val: (t: TelephoneFree, v: VarianteTel) => number | null }[] = [
        { badge: "🔋 Meilleure autonomie", mieux: "haut", val: (t) => t.carac.batterie },
        { badge: "📸 Meilleur capteur photo", mieux: "haut", val: (t) => t.carac.capteurPrincipal },
        { badge: "📱 Plus grand écran", mieux: "haut", val: (t) => pouces(t) },
        { badge: "⚡ Recharge la plus rapide", mieux: "haut", val: (t) => t.carac.chargeFilaireW },
        { badge: "💾 Plus de stockage", mieux: "haut", val: (_, v) => (v.stockage > 0 ? v.stockage : null) },
        { badge: "🧠 Plus de mémoire vive", mieux: "haut", val: (t) => t.carac.ram },
        { badge: "🔭 Meilleur zoom", mieux: "haut", val: (t) => t.carac.teleobjectif ?? 0 },
        { badge: "🤳 Meilleur selfie", mieux: "haut", val: (t) => t.carac.selfie },
        { badge: "🪶 Plus léger", mieux: "bas", val: (t) => t.carac.poids },
    ];
    const pointFort = tels.map((_, i) => {
        if (seul) return null;
        let meilleur: { badge: string; ecart: number } | null = null;
        for (const c of CRITERES_FORTS) {
            const vals = tels.map((t, j) => c.val(t, variantes[j]));
            const moi = vals[i];
            const autres = vals.filter((_, j) => j !== i);
            if (moi == null || moi <= 0 || autres.some((x) => x == null)) continue;
            const second = c.mieux === "haut" ? Math.max(...(autres as number[])) : Math.min(...(autres as number[]));
            const ecart = c.mieux === "haut" ? (second > 0 ? (moi - second) / second : 1) : (second - moi) / second;
            if (ecart >= 0.05 && (!meilleur || ecart > meilleur.ecart)) meilleur = { badge: c.badge, ecart };
        }
        return meilleur?.badge ?? null;
    });
    const ligneOui = (txt: string) => txt === "Oui" || txt.startsWith("Oui,");

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
            <ImpressionSelection tels={tels} variantes={variantes} profil={profil} options={options} majLe={majLe} prenom={prenom} />
            <div className={`shrink-0 ${ROUGE} px-4 py-3 sm:px-8 sm:py-4`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-white sm:text-2xl">{seul ? "Fiche téléphone" : `Comparaison de ${tels.length} modèles`}</h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => window.print()} aria-label="Imprimer" title="Imprimer la sélection pour le client"
                            className="flex h-10 items-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-black text-white hover:bg-white/25">
                            <Printer size={18} /><span className="hidden sm:inline">Imprimer</span>
                        </button>
                        <button
                            onClick={() => setReglages((o) => !o)}
                            aria-expanded={reglages}
                            aria-label={reglages ? "Masquer les réglages" : "Afficher les réglages"}
                            title={reglages ? "Masquer les réglages" : "Afficher les réglages"}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${reglages ? `bg-white ${ROUGE_TXT}` : "bg-white/15 text-white hover:bg-white/25"}`}
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                        <button onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"><X size={20} /></button>
                    </div>
                </div>
                {reglages && (
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <select
                        value={options.forfait}
                        onChange={(e) => setForfait(Number(e.target.value))}
                        aria-label="Forfait inclus dans la mensualité"
                        className={`rounded-xl px-3 py-2 text-xs font-black outline-none sm:text-sm ${options.forfait > 0 ? `bg-white ${ROUGE_TXT}` : "bg-white/15 text-white/85 hover:bg-white/25"}`}
                    >
                        <option value={0} className="text-slate-900">Forfait : aucun</option>
                        {FORFAITS.map((m) => <option key={m} value={m} className="text-slate-900">Forfait : {eur(m)}</option>)}
                    </select>
                    <button onClick={() => setProtection(!options.assurance)} role="switch" aria-checked={options.assurance}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition-colors sm:text-sm ${options.assurance ? `bg-white ${ROUGE_TXT}` : "bg-white/15 text-white/85 hover:bg-white/25"}`}>
                        <span className={`h-4 w-7 rounded-full p-0.5 transition-colors ${options.assurance ? ROUGE : "bg-white/40"}`}>
                            <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${options.assurance ? "translate-x-3" : ""}`} />
                        </span>
                        Protection
                    </button>
                    <div className="flex rounded-xl bg-white/15 p-1">
                        {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                            <button key={p} onClick={() => setProfil(p)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-black sm:px-4 sm:text-sm ${profil === p ? `bg-white ${ROUGE_TXT}` : "text-white/80"}`}>{l}</button>
                        ))}
                    </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div
                    className={`mx-auto grid grid-cols-1 gap-5 px-4 py-5 sm:px-8 sm:py-6 ${seul ? "max-w-2xl" : tels.length === 2 ? "max-w-5xl md:grid-cols-2" : "md:grid-cols-3"}`}
                >
                    {tels.map((t, i) => {
                        const v = variantes[i];
                        const f = flexDe(v, profil);
                        const badge = pointFort[i];
                        return (
                            <article key={t.id} className="relative flex flex-col overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
                                {badge && <span className="absolute right-4 top-4 z-10 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-sm">{badge}</span>}

                                <div className="flex items-center gap-5 bg-gradient-to-b from-slate-50 to-white px-5 pb-4 pt-6 sm:px-6">
                                    <img src={t.image} alt={t.nom} className="h-32 w-24 shrink-0 object-contain" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{t.marque}</p>
                                        <p className="text-xl font-black leading-tight text-slate-900">{t.nom}</p>
                                        {v.stockage > 0 && <p className="text-sm font-bold text-slate-400">{go(v.stockage)}</p>}
                                        {!seul && <p className="mt-1 text-xs font-bold text-emerald-700">{pointsForts[i]} point{pointsForts[i] > 1 ? "s" : ""} fort{pointsForts[i] > 1 ? "s" : ""}</p>}
                                    </div>
                                </div>

                                <div className={`mx-5 rounded-2xl ${ROUGE} px-5 py-4 text-white sm:mx-6`}>
                                    <p className="text-[11px] font-black uppercase tracking-wider text-white/70">
                                        Free Flex · {profil === "abonne" ? "déjà abonné" : "nouveau client"}{options.forfait > 0 && " + forfait"}{options.assurance && " + protection"}
                                    </p>
                                    {f ? (
                                        <>
                                            <p className="flex flex-wrap items-baseline gap-x-2">
                                                <span className="text-4xl font-black tabular-nums">{eur(mensuelTotal(v, profil, options))}<span className="text-sm font-bold text-white/70">/mois</span></span>
                                            </p>
                                            {avecOptions && (
                                                <p className="text-sm font-semibold text-white/85">
                                                    tél. {eur(f.mensuel)}{options.forfait > 0 && <> + forfait {eur(options.forfait)}</>}
                                                    {options.assurance && assuranceDe(v) && <> + protection {eur(assuranceDe(v)!.prix)}</>}
                                                </p>
                                            )}
                                            <p className="text-sm font-semibold text-white/85">{eur(f.premierLoyer)} au départ · option d&apos;achat {eur(f.optionAchat)}</p>
                                        </>
                                    ) : <p className="py-2 text-lg font-black">Free Flex non disponible</p>}
                                    <p className="mt-1 text-sm font-semibold text-white/85">
                                        Comptant {eur(v.comptant)}{v.comptantApresRemb != null && v.comptantApresRemb !== v.comptant && <> → {eur(v.comptantApresRemb)} après remb.</>}
                                    </p>
                                </div>

                                <div className="flex-1 space-y-4 px-5 py-4 sm:px-6">
                                    {sections.map((s) => (
                                        <div key={s.titre}>
                                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"><s.Icone size={13} /> {s.titre}</p>
                                            {s.lignes.map((l) => {
                                                const txt = l.val(t, v);
                                                const top = (meilleursParLigne.get(l) ?? meilleurs(l)).has(i);
                                                const binaire = txt === "Oui" || txt === "Non";
                                                return (
                                                    <div key={l.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
                                                        <span className="text-slate-500">{l.label}</span>
                                                        <span className={`flex items-center gap-1.5 text-right tabular-nums ${top ? "font-black text-emerald-600" : "font-bold text-slate-800"}`}>
                                                            {binaire ? (ligneOui(txt) ? <Check size={16} className="text-emerald-500" /> : <Minus size={16} className="text-slate-300" />) : txt}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>

                                {v.offres.length > 0 && (
                                    <div className="mx-5 mb-4 flex flex-wrap gap-1.5 sm:mx-6">
                                        {v.offres.map((o, j) => (
                                            <span key={j} className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-[#a8161c] ring-1 ring-red-100">🎁 {o.titre}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="px-5 pb-5 sm:px-6">
                                    <a href={t.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200">
                                        Fiche Free <ExternalLink size={14} />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>
                <p className="px-4 pb-6 text-center text-[11px] text-slate-400 sm:px-8">
                    Prix indicatifs relevés sur mobile.free.fr, à confirmer au moment de la vente. En vert : le meilleur sur la ligne.
                    {tels.some((t) => t.carac.batterieHorsFree) && <> · * Batterie non indiquée par Free : donnée constructeur.</>}
                </p>
            </div>
        </div>
    );
}

/* ─── Impression client (A4) : fiche si 1 modèle, cartes si 2 ou 3. Jamais nommé « devis ». ─── */

const dateHeure = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");

function ImpressionSelection({ tels, variantes, profil, options, majLe, prenom }: {
    tels: TelephoneFree[]; variantes: VarianteTel[]; profil: Profil; options: Options; majLe: string | null; prenom: string;
}) {
    const [monte, setMonte] = useState(false);
    const [edition, setEdition] = useState(() => new Date());
    useEffect(() => {
        setMonte(true);
        const maj = () => setEdition(new Date());
        window.addEventListener("beforeprint", maj);
        return () => window.removeEventListener("beforeprint", maj);
    }, []);
    if (!monte) return null;

    const avecOptions = options.forfait > 0 || options.assurance;
    const libProfil = profil === "abonne" ? "déjà abonné" : "nouveau client";
    const prixLe = majLe ? dateHeure(new Date(majLe)) : dateHeure(edition);
    const edite = <>Édité le {dateHeure(edition)}{prenom && <> par <b>{prenom}</b></>}</>;
    const detail = (v: VarianteTel) => {
        const f = flexDe(v, profil); const a = assuranceDe(v);
        if (!f || !avecOptions) return null;
        return [`téléphone ${eur(f.mensuel)}`, options.forfait > 0 && `forfait ${eur(options.forfait)}`, options.assurance && a && `protection ${eur(a.prix)}`].filter(Boolean).join(" + ");
    };
    const mentions = (
        <p className="ip-small">
            Document non contractuel, remis à titre d&apos;information. Prix et offres en vigueur le {prixLe}, susceptibles d&apos;évoluer à tout moment.
            Free Flex : location avec option d&apos;achat sur 24 mois, sous réserve d&apos;acceptation du dossier ; le 1<sup>er</sup> loyer est réglé à la souscription.
            {avecOptions && <> Forfait et protection indiqués selon les conditions en vigueur à cette date.</>}
            {" "}Offres de remboursement soumises à conditions et valables jusqu&apos;aux dates indiquées, dans la limite des stocks disponibles. Photos non contractuelles.
        </p>
    );

    const seul = tels.length === 1;
    const t0 = tels[0], v0 = variantes[0], f0 = flexDe(v0, profil);

    return createPortal(
        <div id="impression-tel">
            <style>{CSS_IMPRESSION}</style>
            {seul ? (
                <div className="ip-page">
                    <div className="ip-hd">
                        <div><p className="ip-sur">Votre sélection</p><p className="ip-titre">Récapitulatif téléphone</p></div>
                        <p className="ip-small ip-droite">{edite}<br />Prix relevés le {prixLe}</p>
                    </div>
                    <div className="ip-hero">
                        <img src={t0.image} alt="" />
                        <div style={{ flex: 1 }}>
                            <p className="ip-marque">{t0.marque}</p>
                            <p className="ip-nom-xl">{t0.nom}</p>
                            <p className="ip-gris">{[v0.stockage > 0 && go(v0.stockage), t0.couleurs?.map((c) => c.nom).join(", ")].filter(Boolean).join(" · ")}</p>
                            {f0 ? (
                                <div className="ip-rouge">
                                    <p className="ip-rouge-sur">Free Flex · 24 mois · {libProfil}{options.forfait > 0 && " + forfait"}{options.assurance && " + protection"}</p>
                                    <p className="ip-rouge-prix">{eur(mensuelTotal(v0, profil, options))}<span>/mois</span></p>
                                    {detail(v0) && <p className="ip-rouge-det">{detail(v0)}</p>}
                                    <p className="ip-rouge-det">{eur(f0.premierLoyer)} au départ · option d&apos;achat {eur(f0.optionAchat)}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <p className="ip-h3">Prix</p>
                    <table className="ip-table"><tbody>
                        {f0 && <>
                            <tr><td>Free Flex — 1<sup>er</sup> loyer</td><td>{eur(f0.premierLoyer)}</td></tr>
                            <tr><td>Free Flex — mensualité téléphone (24 mois)</td><td>{eur(f0.mensuel)}</td></tr>
                            {options.forfait > 0 && <tr><td>Forfait</td><td>{eur(options.forfait)}/mois</td></tr>}
                            {options.assurance && assuranceDe(v0) && <tr><td>Protection</td><td>{eur(assuranceDe(v0)!.prix)}/mois</td></tr>}
                            <tr><td>Option d&apos;achat en fin de contrat</td><td>{eur(f0.optionAchat)}</td></tr>
                        </>}
                        <tr><td>Prix comptant</td><td>{eur(v0.comptant)}</td></tr>
                        {v0.comptantApresRemb != null && v0.comptantApresRemb !== v0.comptant && <tr><td>Comptant après remboursement</td><td>{eur(v0.comptantApresRemb)}</td></tr>}
                    </tbody></table>
                    {v0.offres.length > 0 && <>
                        <p className="ip-h3">Offres du moment</p>
                        <table className="ip-table"><tbody>
                            {v0.offres.map((o, j) => <tr key={j}><td>{o.titre}</td><td className="ip-gris">{o.fin ? `jusqu'au ${new Date(o.fin).toLocaleDateString("fr-FR")}` : ""}</td></tr>)}
                        </tbody></table>
                    </>}
                    <p className="ip-h3">En bref</p>
                    <table className="ip-table"><tbody>
                        {t0.carac.ecran && <tr><td>Écran</td><td>{t0.carac.ecran}</td></tr>}
                        {t0.carac.photo && <tr><td>Photo</td><td>{t0.carac.photo}</td></tr>}
                        {t0.carac.batterie && <tr><td>Batterie</td><td>{t0.carac.batterie.toLocaleString("fr-FR")} mAh</td></tr>}
                    </tbody></table>
                    <div className="ip-foot">{mentions}</div>
                </div>
            ) : (
                <div className="ip-page ip-page-c">
                    <div className="ip-hd-c">
                        <p className="ip-titre-c">Votre sélection<span style={{ color: "#cd1e25" }}>.</span></p>
                        <p className="ip-small ip-droite">{edite}</p>
                    </div>
                    <p className="ip-gris" style={{ margin: "6px 0 26px" }}>Prix en date du {prixLe} — Free Flex sur 24 mois, {libProfil}{options.forfait > 0 && ", forfait inclus"}{options.assurance && ", protection incluse"}</p>
                    {tels.map((t, i) => {
                        const v = variantes[i]; const f = flexDe(v, profil);
                        return (
                            <div key={t.id} className="ip-card">
                                <img src={t.image} alt="" />
                                <div>
                                    <p className="ip-marque">{t.marque}</p>
                                    <p className="ip-nom">{t.nom}</p>
                                    <p className="ip-gris" style={{ fontSize: 12, marginBottom: 8 }}>{[v.stockage > 0 && go(v.stockage), t.carac.ecran?.split(" ")[0], t.carac.batterie && `${t.carac.batterie.toLocaleString("fr-FR")} mAh`].filter(Boolean).join(" · ")}</p>
                                    <div className="ip-ligne"><span>Comptant</span><b>{eur(v.comptant)}</b></div>
                                    {v.comptantApresRemb != null && v.comptantApresRemb !== v.comptant && <div className="ip-ligne"><span>Après remboursement</span><b>{eur(v.comptantApresRemb)}</b></div>}
                                    {v.offres.length > 0 && <p className="ip-offres">{v.offres.map((o) => o.titre.trim() + (o.fin ? ` (jusqu'au ${new Date(o.fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })})` : "")).join(" · ")}</p>}
                                </div>
                                {f ? (
                                    <div className="ip-rouge ip-rouge-c">
                                        <p className="ip-rouge-prix">{eur(mensuelTotal(v, profil, options))}<span>/mois</span></p>
                                        <p className="ip-rouge-det" style={{ marginBottom: 6 }}>{detail(v) ?? "pendant 24 mois"}</p>
                                        <div className="ip-ligne ip-ligne-b"><span>Au départ</span><b>{eur(f.premierLoyer)}</b></div>
                                        <div className="ip-ligne ip-ligne-b"><span>Option d&apos;achat</span><b>{eur(f.optionAchat)}</b></div>
                                    </div>
                                ) : <div className="ip-gris">Free Flex non disponible</div>}
                            </div>
                        );
                    })}
                    <div className="ip-foot">{mentions}</div>
                </div>
            )}
        </div>,
        document.body,
    );
}

const CSS_IMPRESSION = `
#impression-tel{display:none}
@media print{
  @page{size:A4;margin:0}
  html,body{background:#fff!important}
  body>*:not(#impression-tel){display:none!important}
  #impression-tel{display:block;color:#18181b;font-family:inherit;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
#impression-tel .ip-page{width:210mm;height:296mm;padding:15mm 15mm 11mm;display:flex;flex-direction:column;overflow:hidden;font-variant-numeric:tabular-nums}
#impression-tel .ip-page-c{padding:16mm 17mm 11mm}
#impression-tel .ip-small{font-size:9.5px;line-height:1.5;color:#71717a}
#impression-tel .ip-droite{text-align:right}
#impression-tel .ip-gris{color:#71717a;font-weight:600}
#impression-tel .ip-hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #18181b;padding-bottom:14px}
#impression-tel .ip-sur{font-size:10px;letter-spacing:.25em;font-weight:800;text-transform:uppercase;color:#cd1e25}
#impression-tel .ip-titre{font-size:24px;font-weight:900;margin-top:4px}
#impression-tel .ip-hero{display:flex;gap:36px;align-items:center;margin:34px 0 22px}
#impression-tel .ip-hero img{width:220px;height:280px;object-fit:contain}
#impression-tel .ip-marque{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#71717a}
#impression-tel .ip-nom-xl{font-size:32px;font-weight:900;line-height:1.05}
#impression-tel .ip-nom{font-size:20px;font-weight:900;line-height:1.1}
#impression-tel .ip-rouge{background:#cd1e25;color:#fff;border-radius:18px;padding:20px 24px;margin-top:16px}
#impression-tel .ip-rouge-sur{font-size:10px;letter-spacing:.16em;font-weight:800;opacity:.8;text-transform:uppercase}
#impression-tel .ip-rouge-prix{font-size:42px;font-weight:900;line-height:1.1}
#impression-tel .ip-rouge-prix span{font-size:14px;opacity:.8;font-weight:700}
#impression-tel .ip-rouge-det{font-size:12.5px;font-weight:600;opacity:.92}
#impression-tel .ip-h3{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#a1a1aa;font-weight:800;margin:20px 0 4px}
#impression-tel .ip-table{width:100%;border-collapse:collapse;font-size:13px}
#impression-tel .ip-table td{padding:8px 0;border-bottom:1px solid #ececf0}
#impression-tel .ip-table td:last-child{text-align:right;font-weight:700}
#impression-tel .ip-foot{margin-top:auto;border-top:1px solid #e4e4e7;padding-top:10px}
#impression-tel .ip-hd-c{display:flex;justify-content:space-between;align-items:flex-end}
#impression-tel .ip-titre-c{font-size:30px;font-weight:900;letter-spacing:-.02em}
#impression-tel .ip-card{display:grid;grid-template-columns:105px 1fr 200px;gap:20px;align-items:center;border:1.5px solid #18181b;border-radius:16px;padding:14px 16px 14px 20px;margin-bottom:14px;break-inside:avoid}
#impression-tel .ip-card img{width:105px;height:125px;object-fit:contain}
#impression-tel .ip-ligne{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:2px 0}
#impression-tel .ip-ligne span{color:#71717a}
#impression-tel .ip-ligne-b span{color:rgba(255,255,255,.8)}
#impression-tel .ip-offres{margin-top:6px;font-size:10.5px;font-weight:600;color:#a8161c}
#impression-tel .ip-rouge-c{margin-top:0;padding:14px 16px;border-radius:14px}
#impression-tel .ip-rouge-c .ip-rouge-prix{font-size:28px}
#impression-tel .ip-rouge-c .ip-rouge-det{font-size:11px}
`;
