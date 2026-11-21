"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Printer, ExternalLink, RefreshCw } from "lucide-react";
import type { CatalogueTelephones, CouponOdr } from "@/services/telephonesFreeService";

const ROUGE = "bg-[#cd1e25]";
const ROUGE_TXT = "text-[#cd1e25]";

type Filtre = "tous" | "free" | "constructeur" | "reprise";
const TYPES: Record<string, { label: string; filtre: Filtre; classe: string }> = {
    remboursement_operateur: { label: "Remboursé par Free", filtre: "free", classe: `${ROUGE} text-white` },
    remboursement_constructeur: { label: "Remboursement constructeur", filtre: "constructeur", classe: "bg-slate-900 text-white" },
    bonus_reprise_operateur: { label: "Bonus reprise", filtre: "reprise", classe: "bg-amber-100 text-amber-800" },
    speciale: { label: "Offre spéciale", filtre: "tous", classe: "bg-slate-100 text-slate-600" },
};
/** Pour quel mode d'achat imprimer ce coupon (Free a parfois un coupon différent pour les déjà abonnés). */
function pourQui(p: CouponOdr["profils"]): string | null {
    const c = p.includes("comptant"), fp = p.includes("flex_prospect"), fa = p.includes("flex_abonne");
    if (c && fp && fa) return null; // valable pour tous
    const l: string[] = [];
    if (c) l.push("comptant");
    if (fp && fa) l.push("Free Flex");
    else if (fp) l.push("Free Flex nouveau client");
    else if (fa) l.push("Free Flex déjà abonné");
    return l.length ? `Pour : ${l.join(" + ")}` : null;
}
const typeDe = (t: string) => TYPES[t] ?? { label: "Offre", filtre: "tous" as Filtre, classe: "bg-slate-100 text-slate-600" };
const lienOdr = (doc: string) => `/api/odr?u=${encodeURIComponent(doc)}`;
const go = (n: number) => (n <= 0 ? "" : n >= 1024 ? `${n / 1024} To` : `${n} Go`);

function aujourdhui() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function joursRestants(fin: string | null) {
    if (!fin) return null;
    return Math.round((new Date(fin + "T00:00:00").getTime() - new Date(aujourdhui() + "T00:00:00").getTime()) / 86400000);
}
const dateCourte = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

type CouponTel = CouponOdr & { stockages: number[] };
type TelOdr = { id: number; marque: string; nom: string; image: string; coupons: CouponTel[] };

export default function OdrPage() {
    const [data, setData] = useState<CatalogueTelephones | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [recherche, setRecherche] = useState("");
    const [filtre, setFiltre] = useState<Filtre>("tous");
    const [impression, setImpression] = useState<string | null>(null);
    const [actualisation, setActualisation] = useState<"" | "en_cours" | "ok" | "erreur">("");
    const cadre = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        fetch("/api/telephones")
            .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.erreur ?? "Erreur"); setData(j); })
            .catch((e) => setErreur(e.message));
    }, []);

    async function actualiser() {
        setActualisation("en_cours");
        try {
            const r = await fetch("/api/telephones", { method: "POST" });
            const j = await r.json();
            if (!r.ok) throw new Error(j.erreur ?? "Erreur");
            setData(j);
            setActualisation("ok");
        } catch { setActualisation("erreur"); }
        setTimeout(() => setActualisation(""), 4000);
    }

    /** Un téléphone = ses coupons en cours (toutes capacités), dédoublonnés par PDF. */
    const telephones = useMemo<TelOdr[]>(() => {
        if (!data) return [];
        const auj = aujourdhui();
        return data.telephones.map((t) => {
            const parDoc = new Map<string, CouponTel>();
            for (const v of t.variantes) {
                for (const c of v.coupons ?? []) {
                    if (c.fin && c.fin < auj) continue;
                    const e = parDoc.get(c.document) ?? { ...c, stockages: [] };
                    if (v.stockage > 0 && !e.stockages.includes(v.stockage)) e.stockages.push(v.stockage);
                    parDoc.set(c.document, e);
                }
            }
            const ordre = ["remboursement_operateur", "remboursement_constructeur", "bonus_reprise_operateur"];
            const rang = (t: string) => { const i = ordre.indexOf(t); return i < 0 ? ordre.length : i; };
            const coupons = [...parDoc.values()].sort((a, b) => rang(a.type) - rang(b.type) || b.montant - a.montant);
            return { id: t.id, marque: t.marque, nom: t.nom, image: t.image, coupons };
        }).filter((t) => t.coupons.length);
    }, [data]);

    const liste = useMemo(() => {
        const q = recherche.trim().toLowerCase();
        return telephones
            .map((t) => ({ ...t, coupons: filtre === "tous" ? t.coupons : t.coupons.filter((c) => typeDe(c.type).filtre === filtre) }))
            .filter((t) => t.coupons.length && (!q || `${t.marque} ${t.nom}`.toLowerCase().includes(q)))
            .sort((a, b) => `${a.marque} ${a.nom}`.localeCompare(`${b.marque} ${b.nom}`));
    }, [telephones, recherche, filtre]);

    const nbCoupons = useMemo(() => new Set(telephones.flatMap((t) => t.coupons.map((c) => c.document))).size, [telephones]);

    /** Impression directe : le PDF est chargé dans un cadre invisible puis on ouvre la fenêtre d'impression. */
    function imprimer(doc: string) {
        const f = cadre.current;
        if (!f) return;
        setImpression(doc);
        let fait = false;
        const secours = setTimeout(() => { if (!fait) { window.open(lienOdr(doc), "_blank"); setImpression(null); } }, 15000);
        f.onload = () => {
            fait = true;
            clearTimeout(secours);
            setTimeout(() => {
                try { f.contentWindow?.focus(); f.contentWindow?.print(); }
                catch { window.open(lienOdr(doc), "_blank"); }
                setImpression(null);
            }, 400);
        };
        f.src = lienOdr(doc);
    }

    if (erreur) {
        return (
            <div className="mx-auto mt-16 max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
                <p className="text-3xl">📵</p>
                <p className="mt-2 font-black text-slate-900">Coupons Free indisponibles</p>
                <p className="mt-1 text-sm text-slate-500">Le site mobile.free.fr n&apos;a pas répondu. Réessaie dans quelques minutes.</p>
                <p className="mt-3 text-xs text-slate-400">{erreur}</p>
            </div>
        );
    }

    return (
        <div className="pb-16">
            <iframe ref={cadre} title="Impression ODR" className="pointer-events-none fixed -left-[9999px] top-0 h-[1px] w-[1px] opacity-0" />

            <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${ROUGE_TXT}`}>Outils</p>
                <h1 className="text-3xl font-black text-slate-900">🧾 Coupons ODR</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {data ? <>{nbCoupons} coupon{nbCoupons > 1 ? "s" : ""} en cours sur mobile.free.fr · cherche le téléphone vendu et imprime en 1 clic</> : "Chargement des coupons Free…"}
                </p>
                {data && (
                    <button onClick={actualiser} disabled={actualisation === "en_cours"}
                        className="mt-2 flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-red-50 hover:text-[#cd1e25] disabled:opacity-60">
                        <RefreshCw size={13} className={actualisation === "en_cours" ? "animate-spin" : ""} />
                        {actualisation === "en_cours" ? "Lecture de mobile.free.fr…" : actualisation === "ok" ? "✓ Coupons à jour" : actualisation === "erreur" ? "Free ne répond pas, réessaie" : "Actualiser les coupons"}
                    </button>
                )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Téléphone vendu (ex. S26, iPhone 17…)"
                        className="w-72 rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-[#cd1e25]" />
                </div>
                {([["tous", "Tous"], ["free", "Remboursé par Free"], ["constructeur", "Constructeur"], ["reprise", "Bonus reprise"]] as [Filtre, string][]).map(([f, l]) => (
                    <button key={f} onClick={() => setFiltre(f)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-colors ${filtre === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                        {l}
                    </button>
                ))}
            </div>

            {!data ? (
                <div className="mt-6 grid gap-3 lg:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />)}
                </div>
            ) : liste.length === 0 ? (
                <p className="mt-10 text-center text-sm font-bold text-slate-400">Aucun coupon pour cette recherche.</p>
            ) : (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {liste.map((t) => (
                        <div key={t.id} className="flex gap-4 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                            <img src={t.image} alt={t.nom} loading="lazy" className="h-24 w-20 shrink-0 object-contain" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t.marque}</p>
                                <p className="font-black leading-tight text-slate-900">{t.nom}</p>
                                <div className="mt-2.5 flex flex-col gap-2">
                                    {t.coupons.map((c) => {
                                        const ty = typeDe(c.type);
                                        const j = joursRestants(c.fin);
                                        return (
                                            <div key={c.document} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${ty.classe}`}>{ty.label}</span>
                                                        {c.stockages.length > 0 && c.stockages.length < (data.telephones.find((x) => x.id === t.id)?.variantes.length ?? 0) && (
                                                            <span className="text-[10px] font-bold text-slate-400">{c.stockages.map(go).join(", ")}</span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-sm font-black text-slate-900">{c.titre}</p>
                                                    {pourQui(c.profils) && <p className="text-[11px] font-black text-slate-700">{pourQui(c.profils)}</p>}
                                                    {c.fin && (
                                                        <p className={`text-[11px] font-bold ${j !== null && j <= 3 ? ROUGE_TXT : "text-slate-500"}`}>
                                                            {j === 0 ? "Dernier jour aujourd'hui" : j !== null && j <= 3 ? `Plus que ${j} jour${j > 1 ? "s" : ""} (jusqu'au ${dateCourte(c.fin)})` : `Jusqu'au ${dateCourte(c.fin)}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <a href={lienOdr(c.document)} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le coupon"
                                                    className="rounded-xl bg-white p-2 text-slate-500 ring-1 ring-slate-200 hover:text-slate-900">
                                                    <ExternalLink size={15} />
                                                </a>
                                                <button onClick={() => imprimer(c.document)} disabled={impression !== null}
                                                    className={`flex items-center gap-1.5 rounded-xl ${ROUGE} px-3 py-2 text-xs font-black text-white hover:brightness-110 disabled:opacity-60`}>
                                                    <Printer size={14} />
                                                    {impression === c.document ? "Préparation…" : "Imprimer"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {data && <p className="mt-6 text-center text-[11px] text-slate-400">Coupons relevés sur mobile.free.fr, mis à jour automatiquement toutes les heures. Conditions sur chaque coupon.</p>}
        </div>
    );
}
