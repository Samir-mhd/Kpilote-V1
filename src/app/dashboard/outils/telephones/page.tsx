"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { Search, X, ExternalLink, Check } from "lucide-react";
import type { CatalogueTelephones, TelephoneFree, VarianteTel, PrixFlex } from "@/services/telephonesFreeService";

type Profil = "prospect" | "abonne";
type Tri = "flex" | "comptant" | "comptant_desc" | "nom";

const eur = (n: number | null | undefined, dec = true) =>
    n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: dec && n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const go = (n: number) => (n <= 0 ? "—" : n >= 1024 ? `${n / 1024} To` : `${n} Go`);
const flexDe = (v: VarianteTel, p: Profil): PrixFlex | null => (p === "abonne" ? v.flexAbonne : v.flexProspect);
const rembMax = (v: VarianteTel) => v.offres.reduce((t, o) => t + o.montant, 0);

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
    const [comparer, setComparer] = useState(false);

    useEffect(() => {
        fetch("/api/telephones")
            .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.erreur ?? "Erreur"); setData(j); })
            .catch((e) => setErreur(e.message));
    }, []);

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
        const prixFlex = (t: TelephoneFree) => flexDe(t.variantes[0], profil)?.mensuel ?? Infinity;
        const prixCash = (t: TelephoneFree) => t.variantes[0].comptant ?? Infinity;
        return l.sort((a, b) =>
            tri === "flex" ? prixFlex(a) - prixFlex(b)
                : tri === "comptant" ? prixCash(a) - prixCash(b)
                    : tri === "comptant_desc" ? prixCash(b) - prixCash(a)
                        : `${a.marque} ${a.nom}`.localeCompare(`${b.marque} ${b.nom}`));
    }, [data, recherche, marque, reco, tri, profil]);

    function cocher(id: number) {
        setCoches((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? c : [...c, id]));
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
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-500">Outils</p>
                    <h1 className="text-3xl font-black text-slate-900">📱 Comparateur téléphones</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {data ? <>Prix de mobile.free.fr · mis à jour le {dateMaj(data.majLe)} · coche 2 modèles pour les comparer</> : "Chargement du catalogue Free…"}
                    </p>
                </div>
                <div className="flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                    {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                        <button key={p} onClick={() => setProfil(p)}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${profil === p ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtres */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un modèle"
                        className="w-60 rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-violet-400" />
                </div>
                {marques.map((m) => (
                    <button key={m} onClick={() => setMarque(m)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${marque === m ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                        {m}
                    </button>
                ))}
                <button onClick={() => setReco(!reco)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${reco ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
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
                            const bloque = !coche && coches.length >= 2;
                            const remb = rembMax(v);
                            return (
                                <div key={t.id} className={`relative flex flex-col rounded-3xl bg-white p-4 transition-all ${coche ? "ring-2 ring-violet-500 shadow-[0_10px_30px_rgba(124,58,237,.18)]" : "ring-1 ring-slate-200"}`}>
                                    <button onClick={() => cocher(t.id)} disabled={bloque} aria-label={coche ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
                                        className={`absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition-colors ${coche ? "bg-violet-600 text-white" : bloque ? "bg-slate-100 text-slate-300" : "bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-700"}`}>
                                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded ${coche ? "bg-white text-violet-600" : "ring-1 ring-current"}`}>{coche && <Check size={11} strokeWidth={4} />}</span>
                                        Comparer
                                    </button>
                                    <div className="flex gap-1.5">
                                        {t.nouveau && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-black text-fuchsia-700">Nouveau</span>}
                                        {t.reconditionne && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Reconditionné</span>}
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
                                        <div className="rounded-2xl bg-violet-50 px-3 py-2">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-violet-500">Free Flex · {profil === "abonne" ? "abonné" : "nouveau client"}</p>
                                            {f ? (
                                                <>
                                                    <p className="text-xl font-black tabular-nums text-violet-900">{eur(f.mensuel)}<span className="text-xs font-bold text-violet-500">/mois</span></p>
                                                    <p className="text-[11px] font-semibold text-violet-600">{eur(f.premierLoyer)} au départ · {f.duree} mois</p>
                                                </>
                                            ) : <p className="text-sm font-bold text-violet-400">Non disponible</p>}
                                        </div>
                                        <div className="mt-2 flex items-baseline justify-between px-1">
                                            <span className="text-xs font-bold text-slate-400">Comptant</span>
                                            <span className="font-black tabular-nums text-slate-900">{eur(v.comptant)}</span>
                                        </div>
                                        {remb > 0 && <p className="mt-1 px-1 text-[11px] font-bold text-emerald-600">🎁 Jusqu&apos;à {eur(remb, false)} d&apos;offres</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {data.erreurs > 0 && <p className="mt-4 text-center text-xs text-slate-400">{data.erreurs} fiche{data.erreurs > 1 ? "s" : ""} Free n&apos;ont pas pu être lues.</p>}
                </>
            )}

            {/* Barre de comparaison */}
            {coches.length > 0 && (
                <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-2 pl-4 text-white shadow-2xl">
                        {choisis.map((t) => (
                            <span key={t.id} className="flex items-center gap-1.5 rounded-xl bg-white/10 py-1 pl-2.5 pr-1 text-sm font-bold">
                                {t.nom}
                                <button onClick={() => cocher(t.id)} aria-label="Retirer" className="rounded-lg p-1 hover:bg-white/10"><X size={14} /></button>
                            </span>
                        ))}
                        {coches.length < 2 && <span className="text-sm text-white/50">Coche un 2e modèle</span>}
                        <button onClick={() => setComparer(true)} disabled={coches.length < 2}
                            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black disabled:opacity-40">
                            Comparer
                        </button>
                    </div>
                </div>
            )}

            {comparer && choisis.length === 2 && (
                <Comparaison tels={choisis} variantes={choisis.map(variante)} profil={profil} setProfil={setProfil} onClose={() => setComparer(false)} />
            )}
        </div>
    );
}

/* ─── Vue comparaison côte à côte ──────────────────────────────────────────── */

type Ligne = { label: string; val: (t: TelephoneFree, v: VarianteTel) => string; num?: (t: TelephoneFree, v: VarianteTel) => number | null; mieux?: "bas" | "haut" };

function Comparaison({ tels, variantes, profil, setProfil, onClose }: {
    tels: TelephoneFree[]; variantes: VarianteTel[]; profil: Profil; setProfil: (p: Profil) => void; onClose: () => void;
}) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, [onClose]);

    const prix: Ligne[] = [
        { label: "Free Flex / mois", val: (_, v) => eur(flexDe(v, profil)?.mensuel), num: (_, v) => flexDe(v, profil)?.mensuel ?? null, mieux: "bas" },
        { label: "1er loyer", val: (_, v) => eur(flexDe(v, profil)?.premierLoyer), num: (_, v) => flexDe(v, profil)?.premierLoyer ?? null, mieux: "bas" },
        { label: "Durée", val: (_, v) => (flexDe(v, profil) ? `${flexDe(v, profil)!.duree} mois` : "—") },
        { label: "Option d'achat (fin de contrat)", val: (_, v) => eur(flexDe(v, profil)?.optionAchat) },
        { label: "Comptant", val: (_, v) => eur(v.comptant), num: (_, v) => v.comptant, mieux: "bas" },
        { label: "Comptant après remboursements", val: (_, v) => eur(v.comptantApresRemb), num: (_, v) => v.comptantApresRemb, mieux: "bas" },
    ];
    const caracs: Ligne[] = [
        { label: "Stockage", val: (_, v) => go(v.stockage), num: (_, v) => v.stockage, mieux: "haut" },
        { label: "Écran", val: (t) => t.carac.ecran ?? "—" },
        { label: "Processeur", val: (t) => t.carac.puce ?? "—" },
        { label: "Mémoire vive", val: (t) => (t.carac.ram ? `${t.carac.ram} Go` : "—"), num: (t) => t.carac.ram, mieux: "haut" },
        { label: "Batterie", val: (t) => (t.carac.batterie ? `${t.carac.batterie.toLocaleString("fr-FR")} mAh${t.carac.batterieHorsFree ? "*" : ""}` : "—"), num: (t) => t.carac.batterie, mieux: "haut" },
        { label: "Recharge", val: (t) => t.carac.recharge ?? "—" },
        { label: "Appareil photo", val: (t) => t.carac.photo ?? "—" },
        { label: "Caméra selfie", val: (t) => (t.carac.selfie ? `${t.carac.selfie} Mpx` : "—"), num: (t) => t.carac.selfie, mieux: "haut" },
        { label: "Poids", val: (t) => (t.carac.poids ? `${t.carac.poids} g` : "—"), num: (t) => t.carac.poids, mieux: "bas" },
        { label: "Système", val: (t) => t.carac.os ?? "—" },
        { label: "5G", val: (t) => (t.carac.fiveG ? "Oui" : "Non") },
        { label: "eSIM", val: (t) => (t.carac.esim ? "Oui" : "Non") },
        { label: "Résistant à l'eau", val: (t) => (t.carac.etanche ? "Oui" : "Non") },
        { label: "DAS tête / tronc", val: (t) => (t.carac.dasTete != null ? `${t.carac.dasTete.toLocaleString("fr-FR")} / ${t.carac.dasTronc?.toLocaleString("fr-FR") ?? "—"} W/kg` : "—") },
        { label: "Indice énergie", val: (t) => t.carac.indiceEnergie ?? "—" },
    ];

    function rangee(l: Ligne) {
        const n = l.num ? tels.map((t, i) => l.num!(t, variantes[i])) : [null, null];
        const gagnant = l.mieux && n[0] != null && n[1] != null && n[0] !== n[1]
            ? (l.mieux === "bas" ? (n[0]! < n[1]! ? 0 : 1) : (n[0]! > n[1]! ? 0 : 1)) : -1;
        return (
            <div key={l.label} className="grid grid-cols-[1.1fr_1fr_1fr] items-center border-b border-slate-100 py-2.5 text-sm last:border-0">
                <span className="font-bold text-slate-500">{l.label}</span>
                {tels.map((t, i) => (
                    <span key={t.id} className={`px-2 text-center font-black tabular-nums ${gagnant === i ? "text-emerald-600" : "text-slate-900"}`}>
                        {gagnant === i && "✓ "}{l.val(t, variantes[i])}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="my-6 w-full max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-slate-900">Comparaison</h2>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-xl bg-slate-100 p-1">
                            {([["prospect", "Nouveau client"], ["abonne", "Déjà abonné"]] as [Profil, string][]).map(([p, l]) => (
                                <button key={p} onClick={() => setProfil(p)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-black ${profil === p ? "bg-slate-900 text-white" : "text-slate-500"}`}>{l}</button>
                            ))}
                        </div>
                        <button onClick={onClose} aria-label="Fermer" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-[1.1fr_1fr_1fr] items-end">
                    <span />
                    {tels.map((t, i) => (
                        <div key={t.id} className="flex flex-col items-center px-2 text-center">
                            <img src={t.image} alt={t.nom} className="h-40 w-full object-contain" />
                            <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{t.marque}</p>
                            <p className="font-black leading-tight text-slate-900">{t.nom}</p>
                            <p className="text-xs font-bold text-slate-400">{go(variantes[i].stockage)}</p>
                        </div>
                    ))}
                </div>

                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-violet-500">Prix · {profil === "abonne" ? "déjà abonné" : "nouveau client"}</p>
                <div className="mt-1">{prix.map(rangee)}</div>

                <div className="mt-2 grid grid-cols-[1.1fr_1fr_1fr] py-2 text-sm">
                    <span className="font-bold text-slate-500">Offres en cours</span>
                    {variantes.map((v, i) => (
                        <div key={i} className="flex flex-col gap-1 px-2">
                            {v.offres.length ? v.offres.map((o, j) => (
                                <span key={j} className="rounded-lg bg-emerald-50 px-2 py-1 text-center text-[11px] font-bold text-emerald-700">{o.titre}</span>
                            )) : <span className="text-center text-slate-300">—</span>}
                        </div>
                    ))}
                </div>

                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-violet-500">Caractéristiques</p>
                <div className="mt-1">{caracs.map(rangee)}</div>

                <div className="mt-5 grid grid-cols-[1.1fr_1fr_1fr]">
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
    );
}
