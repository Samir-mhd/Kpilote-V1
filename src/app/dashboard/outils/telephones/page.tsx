"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Search, X, ExternalLink, Check, RefreshCw } from "lucide-react";
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

function CaseACocher({ actif, couleur = ROUGE_TXT }: { actif: boolean; couleur?: string }) {
    return (
        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded ${actif ? `bg-white ${couleur}` : "ring-1 ring-current"}`}>
            {actif && <Check size={11} strokeWidth={4} />}
        </span>
    );
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
            {/* En-tête */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${ROUGE_TXT}`}>Outils</p>
                    <h1 className="text-3xl font-black text-slate-900">📱 Comparateur téléphones</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {data ? <>Prix de mobile.free.fr · mis à jour le {dateMaj(data.majLe)} · coche 1 modèle pour l&apos;afficher, jusqu&apos;à 3 pour comparer</> : "Chargement du catalogue Free…"}
                    </p>
                    {data && (
                        <button onClick={actualiser} disabled={actualisation === "en_cours"}
                            className="mt-2 flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-red-50 hover:text-[#cd1e25] disabled:opacity-60">
                            <RefreshCw size={13} className={actualisation === "en_cours" ? "animate-spin" : ""} />
                            {actualisation === "en_cours" ? "Lecture de mobile.free.fr…"
                                : actualisation === "ok" ? "✓ Offres à jour"
                                    : actualisation === "erreur" ? "Free ne répond pas, réessaie" : "Actualiser les offres"}
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                        {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                            <button key={p} onClick={() => setProfil(p)}
                                className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${profil === p ? `${ROUGE} text-white` : "text-slate-500 hover:text-slate-900"}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className="mr-1 text-xs font-bold text-slate-400">Prix avec forfait</span>
                        {FORFAITS.map((f) => (
                            <button key={f} onClick={() => setForfait(forfait === f ? 0 : f)}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black transition-colors ${forfait === f ? `${ROUGE} text-white` : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                                <CaseACocher actif={forfait === f} />
                                {eur(f)}
                            </button>
                        ))}
                        <span className="mx-1 h-5 w-px bg-slate-200" />
                        <button onClick={() => setAssurance(!assurance)}
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black transition-colors ${assurance ? `${ROUGE} text-white` : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                            <CaseACocher actif={assurance} />
                            Avec assurance
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un modèle"
                        className="w-60 rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-[#cd1e25]" />
                </div>
                {marques.map((m) => (
                    <button key={m} onClick={() => setMarque(m)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${marque === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                        {m}
                    </button>
                ))}
                <button onClick={() => setReco(!reco)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${reco ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                    ♻️ Reconditionnés
                </button>
                <select value={tri} onChange={(e) => setTri(e.target.value as Tri)}
                    className="ml-auto rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none ring-1 ring-slate-200">
                    <option value="flex">Free Flex : moins cher d&apos;abord</option>
                    <option value="comptant">Comptant : moins cher d&apos;abord</option>
                    <option value="comptant_desc">Comptant : plus cher d&apos;abord</option>
                    <option value="nom">Nom (A → Z)</option>
                </select>
            </div>

            {/* Grille */}
            {!data ? (
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}
                </div>
            ) : (
                <>
                    <p className="mt-4 text-xs font-bold text-slate-400">{liste.length} modèle{liste.length > 1 ? "s" : ""}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {liste.map((t) => {
                            const v = variante(t);
                            const f = flexDe(v, profil);
                            const coche = coches.includes(t.id);
                            const bloque = !coche && coches.length >= MAX_COCHES;
                            const remb = rembMax(v);
                            return (
                                <div key={t.id} className={`relative flex flex-col rounded-3xl bg-white p-4 transition-all ${coche ? "shadow-[0_10px_30px_rgba(205,30,37,.18)] ring-2 ring-[#cd1e25]" : "ring-1 ring-slate-200"}`}>
                                    <button onClick={() => cocher(t.id)} disabled={bloque} aria-label={coche ? "Retirer de la sélection" : "Sélectionner"}
                                        className={`absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition-colors ${coche ? `${ROUGE} text-white` : bloque ? "bg-slate-100 text-slate-300" : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-[#cd1e25]"}`}>
                                        <CaseACocher actif={coche} />
                                        Sélectionner
                                    </button>
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
                                                <button key={x.stockage} onClick={() => setStockage((s) => ({ ...s, [t.id]: x.stockage }))}
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
                                                Free Flex · {profil === "abonne" ? "abonné" : "nouveau client"}{forfait > 0 && " + forfait"}{assurance && " + assurance"}
                                            </p>
                                            {f ? (
                                                <>
                                                    <p className="text-xl font-black tabular-nums text-slate-900">{eur(mensuelTotal(v, profil, options))}<span className="text-xs font-bold text-slate-500">/mois</span></p>
                                                    {avecOptions && (
                                                        <p className="text-[11px] font-semibold leading-snug text-slate-600">
                                                            tél. {eur(f.mensuel)}{forfait > 0 && <> + forfait {eur(forfait)}</>}{assurance && assuranceDe(v) && <> + assurance {eur(assuranceDe(v)!.prix)}</>}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] font-semibold text-slate-600">{eur(f.premierLoyer)} au départ</p>
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
                <Comparaison tels={choisis} variantes={choisis.map(variante)} profil={profil} setProfil={setProfil} options={options} onClose={() => setOuvert(false)} />
            )}
        </div>
    );
}

/* ─── Fiche (1 modèle) ou comparaison (2 à 3 modèles) ─────────────────────── */

type Ligne = { label: string; val: (t: TelephoneFree, v: VarianteTel) => string; num?: (t: TelephoneFree, v: VarianteTel) => number | null; mieux?: "bas" | "haut" };

function Comparaison({ tels, variantes, profil, setProfil, options, onClose }: {
    tels: TelephoneFree[]; variantes: VarianteTel[]; profil: Profil; setProfil: (p: Profil) => void; options: Options; onClose: () => void;
}) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, [onClose]);

    const seul = tels.length === 1;
    const colonnes = { gridTemplateColumns: `1.1fr repeat(${tels.length}, minmax(0, 1fr))` };
    const avecOptions = options.forfait > 0 || options.assurance;

    const prix: Ligne[] = [
        ...(avecOptions ? [
            { label: `Total / mois (${["téléphone", options.forfait > 0 && "forfait", options.assurance && "assurance"].filter(Boolean).join(" + ")})`, val: (_: TelephoneFree, v: VarianteTel) => eur(mensuelTotal(v, profil, options)), num: (_: TelephoneFree, v: VarianteTel) => mensuelTotal(v, profil, options), mieux: "bas" as const },
        ] : []),
        { label: avecOptions ? "dont téléphone (Free Flex)" : "Free Flex / mois", val: (_, v) => eur(flexDe(v, profil)?.mensuel), num: (_, v) => flexDe(v, profil)?.mensuel ?? null, mieux: "bas" },
        ...(options.forfait > 0 ? [{ label: "dont forfait", val: () => eur(options.forfait) }] : []),
        ...(options.assurance ? [{ label: "dont assurance", val: (_: TelephoneFree, v: VarianteTel) => { const a = assuranceDe(v); return a ? `${eur(a.prix)} (classe ${a.classe})` : "—"; }, num: (_: TelephoneFree, v: VarianteTel) => assuranceDe(v)?.prix ?? null, mieux: "bas" as const }] : []),
        { label: "1er loyer", val: (_, v) => eur(flexDe(v, profil)?.premierLoyer), num: (_, v) => flexDe(v, profil)?.premierLoyer ?? null, mieux: "bas" },
        { label: "Option d'achat (fin de contrat)", val: (_, v) => eur(flexDe(v, profil)?.optionAchat) },
        { label: "Comptant", val: (_, v) => eur(v.comptant), num: (_, v) => v.comptant, mieux: "bas" },
        { label: "Comptant après remboursements", val: (_, v) => eur(v.comptantApresRemb), num: (_, v) => v.comptantApresRemb, mieux: "bas" },
    ];
    const general: Ligne[] = [
        { label: "Stockage", val: (_, v) => go(v.stockage), num: (_, v) => v.stockage, mieux: "haut" },
        { label: "Écran", val: (t) => t.carac.ecran ?? "—" },
        { label: "Processeur", val: (t) => t.carac.puce ?? "—" },
        { label: "Mémoire vive", val: (t) => (t.carac.ram ? `${t.carac.ram} Go` : "—"), num: (t) => t.carac.ram, mieux: "haut" },
        { label: "Système", val: (t) => t.carac.os ?? "—" },
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
        { label: "Résistant à l'eau", val: (t) => (t.carac.etanche ? "Oui" : "Non") },
        { label: "DAS tête / tronc", val: (t) => (t.carac.dasTete != null ? `${t.carac.dasTete.toLocaleString("fr-FR")} / ${t.carac.dasTronc?.toLocaleString("fr-FR") ?? "—"} W/kg` : "—") },
        { label: "Indice énergie", val: (t) => t.carac.indiceEnergie ?? "—" },
    ];

    /** Meilleure(s) valeur(s) en vert ; rien si 1 seul modèle ou si toutes égales. */
    function rangee(l: Ligne) {
        const n = l.num && !seul ? tels.map((t, i) => l.num!(t, variantes[i])) : [];
        const valides = n.filter((x): x is number => x != null);
        const meilleur = l.mieux && valides.length === tels.length && new Set(valides).size > 1
            ? (l.mieux === "bas" ? Math.min(...valides) : Math.max(...valides)) : null;
        return (
            <div key={l.label} style={colonnes} className="grid items-center border-b border-slate-100 py-2.5 text-sm last:border-0">
                <span className="font-bold text-slate-500">{l.label}</span>
                {tels.map((t, i) => (
                    <span key={t.id} className={`px-2 text-center font-black tabular-nums ${meilleur != null && n[i] === meilleur ? "text-emerald-600" : "text-slate-900"}`}>
                        {l.val(t, variantes[i])}
                    </span>
                ))}
            </div>
        );
    }

    const section = (titre: string, lignes: Ligne[]) => (
        <>
            <p className={`mt-6 text-[11px] font-black uppercase tracking-[0.2em] ${ROUGE_TXT}`}>{titre}</p>
            <div className="mt-1">{lignes.map(rangee)}</div>
        </>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className={`my-6 w-full ${seul ? "max-w-2xl" : tels.length === 2 ? "max-w-4xl" : "max-w-6xl"} overflow-hidden rounded-[28px] bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
                <div className={`flex items-center justify-between gap-3 ${ROUGE} px-6 py-4`}>
                    <h2 className="text-xl font-black text-white">{seul ? "Fiche téléphone" : `Comparaison de ${tels.length} modèles`}</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-xl bg-white/15 p-1">
                            {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                                <button key={p} onClick={() => setProfil(p)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-black ${profil === p ? `bg-white ${ROUGE_TXT}` : "text-white/80"}`}>{l}</button>
                            ))}
                        </div>
                        <button onClick={onClose} aria-label="Fermer" className="rounded-xl bg-white/15 p-2 text-white hover:bg-white/25"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-6 pt-4">
                    <div style={colonnes} className="grid items-end">
                        <span />
                        {tels.map((t, i) => (
                            <div key={t.id} className="flex flex-col items-center px-2 text-center">
                                <img src={t.image} alt={t.nom} className="h-40 w-full object-contain" />
                                <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{t.marque}</p>
                                <p className="font-black leading-tight text-slate-900">{t.nom}</p>
                                {variantes[i].stockage > 0 && <p className="text-xs font-bold text-slate-400">{go(variantes[i].stockage)}</p>}
                            </div>
                        ))}
                    </div>

                    {section(`Prix · ${profil === "abonne" ? "déjà abonné" : "nouveau client"}`, prix)}

                    <div style={colonnes} className="mt-2 grid py-2 text-sm">
                        <span className="font-bold text-slate-500">Offres en cours</span>
                        {variantes.map((v, i) => (
                            <div key={i} className="flex flex-col gap-1 px-2">
                                {v.offres.length ? v.offres.map((o, j) => (
                                    <span key={j} className="rounded-lg bg-red-50 px-2 py-1 text-center text-[11px] font-bold text-[#a8161c]">{o.titre}</span>
                                )) : <span className="text-center text-slate-300">—</span>}
                            </div>
                        ))}
                    </div>

                    {section("Caractéristiques", general)}
                    {section("Batterie et recharge", batterie)}
                    {section("Photo et vidéo", photo)}
                    {section("Connectivité et autres", autres)}

                    <div style={colonnes} className="mt-5 grid">
                        <span className="text-[11px] text-slate-400">Prix indicatifs relevés sur mobile.free.fr, à confirmer au moment de la vente.
                            {tels.some((t) => t.carac.batterieHorsFree) && <><br />* Batterie non indiquée par Free : donnée constructeur.</>}</span>
                        {tels.map((t) => (
                            <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                                className="mx-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">
                                Fiche Free <ExternalLink size={13} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
