"use client";

/**
 * Outils → Calculatrice box : ce que paie le client aujourd'hui (box, forfaits, abonnements,
 * protection) face à l'offre Free, avec les prix 1re année / 2e année et l'économie réalisée.
 * Vue A (deux colonnes, par défaut) et vue B (parcours en 3 étapes, &vue=B).
 * Tarifs relevés sur free.fr : src/utils/offresBox.ts.
 */
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { tracerOutil } from "@/services/outilsUsage";
import { Check, Plus, X, PiggyBank, ArrowLeft, ArrowRight, Printer, RotateCcw } from "lucide-react";
import {
    SERVICES, FREEBOX, FORFAITS_FREE, MISE_EN_SERVICE, offresFree, prixForfaitFree,
    type CodeService, type PrixFree,
} from "@/utils/offresBox";

const ROUGE = "#cd1e25";
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const lire = (s: string) => { const n = Number(s.replace(",", ".").replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : 0; };

type ServiceActuel = { on: boolean; offre: string; prix: number };
type LigneA = { label: string; prix: number };
type LigneF = { label: string; prix: PrixFree };

const offreDe = (code: CodeService, id: string) => SERVICES.find((s) => s.code === code)!.offres.find((o) => o.id === id)!;

function servicesInitiaux(): Record<CodeService, ServiceActuel> {
    const r = {} as Record<CodeService, ServiceActuel>;
    SERVICES.forEach((s) => {
        const o = s.offres.length > 1 && s.code !== "canal" ? s.offres[1] : s.offres[0];
        r[s.code] = { on: false, offre: o.id, prix: o.prix };
    });
    return r;
}


/* ───────────── Champs ───────────── */

function PrixInput({ valeur, onChange, label }: { valeur: number; onChange: (n: number) => void; label: string }) {
    const [txt, setTxt] = useState(valeur ? String(valeur).replace(".", ",") : "");
    return (
        <span className="relative inline-flex items-center">
            <input
                aria-label={label}
                inputMode="decimal"
                value={txt}
                placeholder="0,00"
                onChange={(e) => { setTxt(e.target.value); onChange(lire(e.target.value)); }}
                className="w-24 rounded-lg bg-white py-1.5 pl-2.5 pr-6 text-right text-sm font-black tabular-nums text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#cd1e25]"
            />
            <span className="pointer-events-none absolute right-2 text-sm font-bold text-slate-400">€</span>
        </span>
    );
}

function Ligne_({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200">{children}</div>;
}

function Coche({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
    return (
        <button type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={onClick}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? "text-white" : "bg-white ring-1 ring-slate-300"}`}
            style={on ? { background: ROUGE } : undefined}>
            {on && <Check size={13} strokeWidth={3.5} />}
        </button>
    );
}

/** Prix Free affiché : « 9,99 € » ou « 9,99 € puis 15,99 € », ou « Inclus ». */
function PrixF({ p }: { p: PrixFree }) {
    if (p.an1 === 0 && p.an2 === 0) return <span className="text-sm font-black text-emerald-600">Inclus</span>;
    return (
        <span className="text-right">
            <span className="block text-sm font-black tabular-nums text-slate-900">{eur(p.an1)}</span>
            {p.an2 !== p.an1 && <span className="block text-[11px] font-bold tabular-nums text-slate-400">puis {eur(p.an2)}</span>}
        </span>
    );
}

const Titre = ({ c }: { c: string }) => <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 first:mt-0">{c}</p>;
const Ajouter = ({ onClick, c }: { onClick: () => void; c: string }) => (
    <button type="button" onClick={onClick} className="mt-2 flex items-center gap-1 text-xs font-black hover:underline" style={{ color: ROUGE }}><Plus size={14} /> {c}</button>
);

/* ───────────── Page ───────────── */

function Calculatrice() {
    const sp = useSearchParams();
    const vue = sp.get("vue") === "B" ? "B" : "A";
    const qs = `?id=${encodeURIComponent(sp.get("id") ?? "")}&nom=${encodeURIComponent(sp.get("nom") ?? "")}`;
    const baseOutils = usePathname().startsWith("/manager") ? "/manager/outils" : "/dashboard/outils";
    useEffect(() => { tracerOutil("box", "ouverture"); }, []);

    // ── Aujourd'hui ──
    const [boxActuelle, setBoxActuelle] = useState(0);
    const [forfaitsActuels, setForfaitsActuels] = useState<number[]>([0]);
    const [services, setServices] = useState<Record<CodeService, ServiceActuel>>(servicesInitiaux);
    const [autres, setAutres] = useState<{ label: string; prix: number }[]>([]);
    const [protectionActuelle, setProtectionActuelle] = useState<{ on: boolean; prix: number }>({ on: false, prix: 0 });

    // ── Chez Free ──
    const [freeboxId, setFreeboxId] = useState("ultra");
    const [forfaitsFree, setForfaitsFree] = useState<string[] | null>(null); // null = autant que chez le client
    const [choixFree, setChoixFree] = useState<Partial<Record<CodeService, string>>>({}); // id d'offre cochée ; absent = non pris
    const [garderAutres, setGarderAutres] = useState(true);
    const [mes, setMes] = useState(true);

    const [etape, setEtape] = useState(1);

    const freebox = FREEBOX.find((b) => b.id === freeboxId)!;
    const forfaitsFreeEffectifs = forfaitsFree ?? forfaitsActuels.map(() => "free_5g");

    const lignesActuel: LigneA[] = useMemo(() => {
        const l: LigneA[] = [];
        if (boxActuelle > 0) l.push({ label: "Box", prix: boxActuelle });
        forfaitsActuels.forEach((p, i) => { if (p > 0) l.push({ label: `Forfait ${i + 1}`, prix: p }); });
        SERVICES.forEach((s) => {
            const sv = services[s.code];
            if (sv.on) l.push({ label: `${s.label}${s.offres.length > 1 ? ` ${offreDe(s.code, sv.offre).label}` : ""}`, prix: sv.prix });
        });
        autres.forEach((a) => { if (a.prix > 0) l.push({ label: a.label || "Autre", prix: a.prix }); });
        if (protectionActuelle.on && protectionActuelle.prix > 0) l.push({ label: "Protection", prix: protectionActuelle.prix });
        return l;
    }, [boxActuelle, forfaitsActuels, services, autres, protectionActuelle]);

    /** Abonnements repris chez Free : offre choisie (par défaut le même niveau) ou « aucun ». */
    const servicesFree = SERVICES.map((s) => {
        const offres = offresFree(s.code, freeboxId);
        const choisi = choixFree[s.code];
        const offre = choisi ? offres.find((o) => o.id === choisi) ?? offres[0] : null;
        const inclus = offres.filter((o) => o.prix.an1 === 0 && o.prix.an2 === 0).map((o) => o.label);
        return { code: s.code, label: s.label, emoji: s.emoji, offres, choisi: offre?.id ?? null, offre, inclus };
    });

    const lignesFree: LigneF[] = [
        { label: freebox.nom, prix: freebox.prix },
        ...forfaitsFreeEffectifs.map((id, i) => ({ label: FORFAITS_FREE.find((f) => f.id === id)!.nom, prix: prixForfaitFree(id, freeboxId, i) })),
        ...servicesFree.filter((s) => s.offre).map((s) => ({ label: `${s.label} ${s.offres.length > 1 ? s.offre!.label : ""}`.trim(), prix: s.offre!.prix })),
        ...(garderAutres ? autres.filter((a) => a.prix > 0).map((a) => ({ label: a.label || "Autre", prix: { an1: a.prix, an2: a.prix } })) : []),
    ];

    const mensuelActuel = lignesActuel.reduce((t, l) => t + l.prix, 0);
    const mensuelFreeAn1 = lignesFree.reduce((t, l) => t + l.prix.an1, 0);
    const mensuelFreeAn2 = lignesFree.reduce((t, l) => t + l.prix.an2, 0);
    const moisOffertsEco = lignesFree.reduce((t, l) => t + l.prix.an1 * (l.prix.moisOfferts ?? 0), 0);
    const coutFreeAn1 = mensuelFreeAn1 * 12 - moisOffertsEco + (mes ? MISE_EN_SERVICE : 0);
    const coutFreeAn2 = mensuelFreeAn2 * 12;
    const ecoMoisAn1 = mensuelActuel - mensuelFreeAn1;
    const ecoMoisAn2 = mensuelActuel - mensuelFreeAn2;
    const ecoAn1 = mensuelActuel * 12 - coutFreeAn1;
    const ecoAn2 = mensuelActuel * 12 - coutFreeAn2;
    const pret = mensuelActuel > 0;

    function reinitialiser() {
        setBoxActuelle(0); setForfaitsActuels([0]); setServices(servicesInitiaux()); setAutres([]); setProtectionActuelle({ on: false, prix: 0 });
        setFreeboxId("ultra"); setForfaitsFree(null); setChoixFree({}); setGarderAutres(true); setMes(true); setEtape(1);
    }

    /* ── Saisie : aujourd'hui ── */
    const saisieActuel = (
        <>
            <Titre c="Box actuelle" />
            <Ligne_><span className="flex-1 text-sm font-bold text-slate-700">Prix de la box</span><PrixInput label="Prix de la box actuelle" valeur={boxActuelle} onChange={setBoxActuelle} /></Ligne_>

            <Titre c="Forfaits mobiles" />
            <div className="space-y-2">
                {forfaitsActuels.map((p, i) => (
                    <Ligne_ key={i}>
                        <span className="flex-1 text-sm font-bold text-slate-700">Forfait {i + 1}</span>
                        <PrixInput label={`Prix du forfait ${i + 1}`} valeur={p} onChange={(n) => setForfaitsActuels((l) => l.map((x, j) => (j === i ? n : x)))} />
                        {forfaitsActuels.length > 1 && (
                            <button type="button" aria-label={`Retirer le forfait ${i + 1}`} onClick={() => { setForfaitsActuels((l) => l.filter((_, j) => j !== i)); setForfaitsFree(null); }} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                        )}
                    </Ligne_>
                ))}
            </div>
            <Ajouter c="Ajouter un forfait" onClick={() => { setForfaitsActuels((l) => [...l, 0]); setForfaitsFree(null); }} />

            <Titre c="Abonnements" />
            <div className="space-y-2">
                {SERVICES.map((s) => {
                    const sv = services[s.code];
                    const maj = (p: Partial<ServiceActuel>) => setServices((x) => ({ ...x, [s.code]: { ...x[s.code], ...p } }));
                    return (
                        <div key={s.code} className={`rounded-xl px-3.5 py-2.5 ${sv.on ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                            <div className="flex items-center gap-3">
                                <Coche on={sv.on} label={s.label} onClick={() => maj({ on: !sv.on })} />
                                <button type="button" onClick={() => maj({ on: !sv.on })} className={`flex-1 text-left text-sm font-bold ${sv.on ? "text-slate-900" : "text-slate-500"}`}>{s.emoji} {s.label}</button>
                                {sv.on && <PrixInput key={sv.offre} label={`Prix ${s.label}`} valeur={sv.prix} onChange={(n) => maj({ prix: n })} />}
                            </div>
                            {sv.on && s.offres.length > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                                    {s.offres.map((o) => (
                                        <button key={o.id} type="button" onClick={() => maj({ offre: o.id, prix: o.prix })}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${sv.offre === o.id ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                                            style={sv.offre === o.id ? { background: ROUGE } : undefined}>
                                            {o.label} · {eur(o.prix)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Titre c="Autres abonnements" />
            <div className="space-y-2">
                {autres.map((a, i) => (
                    <Ligne_ key={i}>
                        <input aria-label="Nom de l'abonnement" value={a.label} placeholder="Ex. Spotify, Deezer…" onChange={(e) => setAutres((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400" />
                        <PrixInput label="Prix de l'abonnement" valeur={a.prix} onChange={(n) => setAutres((l) => l.map((x, j) => (j === i ? { ...x, prix: n } : x)))} />
                        <button type="button" aria-label="Retirer" onClick={() => setAutres((l) => l.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                    </Ligne_>
                ))}
            </div>
            <Ajouter c="Ajouter un abonnement" onClick={() => setAutres((l) => [...l, { label: "", prix: 0 }])} />

            <Titre c="Protection" />
            <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${protectionActuelle.on ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                <Coche on={protectionActuelle.on} label="Protection mobile" onClick={() => setProtectionActuelle((p) => ({ ...p, on: !p.on }))} />
                <span className={`flex-1 text-sm font-bold ${protectionActuelle.on ? "text-slate-900" : "text-slate-500"}`}>🛟 Protection / assurance mobile</span>
                {protectionActuelle.on && <PrixInput label="Prix de la protection" valeur={protectionActuelle.prix} onChange={(n) => setProtectionActuelle((p) => ({ ...p, prix: n }))} />}
            </div>
        </>
    );

    /* ── Saisie : chez Free ── */
    const saisieFree = (
        <>
            <Titre c="Freebox · sans engagement" />
            <div className="grid grid-cols-2 gap-2">
                {FREEBOX.map((b) => {
                    const on = b.id === freeboxId;
                    return (
                        <button key={b.id} type="button" onClick={() => setFreeboxId(b.id)}
                            className={`rounded-xl px-3 py-2.5 text-left transition-all ${on ? "text-white shadow-md" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"}`}
                            style={on ? { background: ROUGE } : undefined}>
                            <span className="block text-sm font-black">{b.nom}</span>
                            <span className={`block text-xs font-bold ${on ? "text-white/85" : "text-slate-500"}`}>{eur(b.prix.an1)}/mois{b.prix.an2 !== b.prix.an1 ? " la 1re année" : ""}</span>
                            {b.prix.an2 !== b.prix.an1 && <span className={`block text-[11px] font-semibold ${on ? "text-white/70" : "text-slate-400"}`}>puis {eur(b.prix.an2)}/mois</span>}
                        </button>
                    );
                })}
            </div>
            {freebox.inclusLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {freebox.inclusLabels.map((i) => <span key={i} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">✓ {i}</span>)}
                </div>
            )}
            <button type="button" role="switch" aria-checked={mes} onClick={() => setMes((m) => !m)}
                className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left ${mes ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${mes ? "" : "bg-slate-300"}`} style={mes ? { background: ROUGE } : undefined}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${mes ? "translate-x-4" : ""}`} />
                </span>
                <span className="flex-1">
                    <span className="block text-sm font-black text-slate-800">MES {MISE_EN_SERVICE} €</span>
                    <span className="block text-[11px] font-semibold text-slate-400">Frais de mise en service, payés une fois (comptés dans l&apos;économie de la 1re année)</span>
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900">{mes ? eur(MISE_EN_SERVICE) : "Non"}</span>
            </button>

            <Titre c="Forfaits Free · remise abonné Freebox" />
            <div className="space-y-2">
                {forfaitsFreeEffectifs.map((id, i) => {
                    const p = prixForfaitFree(id, freeboxId, i);
                    return (
                        <div key={i} className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200">
                            <div className="flex items-center gap-3">
                                <select aria-label={`Forfait Free ${i + 1}`} value={id}
                                    onChange={(e) => setForfaitsFree(forfaitsFreeEffectifs.map((x, j) => (j === i ? e.target.value : x)))}
                                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none">
                                    {FORFAITS_FREE.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                                </select>
                                <PrixF p={p} />
                                <button type="button" aria-label={`Retirer le forfait Free ${i + 1}`} onClick={() => setForfaitsFree(forfaitsFreeEffectifs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                            </div>
                            {p.note && <p className="mt-1 text-[11px] font-semibold text-slate-400">{p.note}</p>}
                        </div>
                    );
                })}
            </div>
            <Ajouter c="Ajouter un forfait Free" onClick={() => setForfaitsFree([...forfaitsFreeEffectifs, "free_5g"])} />

            <Titre c="Abonnements chez Free" />
            <div className="space-y-2">
                {servicesFree.map((s) => {
                    const on = !!s.offre;
                    const basculer = () => setChoixFree((x) => {
                        const n = { ...x };
                        if (on) delete n[s.code];
                        else n[s.code] = (s.offres.find((o) => o.prix.an1 === 0 && o.prix.an2 === 0) ?? s.offres[0]).id;
                        return n;
                    });
                    return (
                        <div key={s.code} className={`rounded-xl px-3.5 py-2.5 ${on ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                            <div className="flex items-center gap-3">
                                <Coche on={on} label={`${s.label} chez Free`} onClick={basculer} />
                                <button type="button" onClick={basculer} className={`min-w-0 flex-1 text-left text-sm font-bold ${on ? "text-slate-900" : "text-slate-500"}`}>
                                    {s.emoji} {s.label}
                                    {s.inclus.length > 0 && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">{s.inclus.join(", ")} inclus avec l&apos;{freebox.nom.replace("Freebox ", "")}</span>}
                                </button>
                                {s.offre && <PrixF p={s.offre.prix} />}
                            </div>
                            {on && s.offres.length > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                                    {s.offres.map((o) => {
                                        const actif = s.choisi === o.id;
                                        const gratuit = o.prix.an1 === 0 && o.prix.an2 === 0;
                                        return (
                                            <button key={o.id} type="button" onClick={() => setChoixFree((x) => ({ ...x, [s.code]: o.id }))}
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${actif ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                                                style={actif ? { background: ROUGE } : undefined}>
                                                {o.label} · {gratuit ? "inclus" : eur(o.prix.an1)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {s.offre?.prix.note && <p className="mt-1 pl-8 text-[11px] font-semibold text-slate-400">{s.offre.prix.note}</p>}
                        </div>
                    );
                })}
            </div>

            {autres.some((a) => a.prix > 0) && (
                <>
                    <Titre c="Autres abonnements" />
                    <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${garderAutres ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                        <Coche on={garderAutres} label="Garder les autres abonnements" onClick={() => setGarderAutres((g) => !g)} />
                        <span className="flex-1 text-sm font-bold text-slate-800">Garder ses autres abonnements</span>
                        <span className="text-sm font-black tabular-nums text-slate-900">{eur(autres.reduce((t, a) => t + a.prix, 0))}</span>
                    </div>
                </>
            )}

        </>
    );

    /* ── Résultat ── */
    const bloc = (titre: string, mois: number, an: number, detail?: string) => (
        <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{titre}</p>
            <p className="text-3xl font-black tabular-nums sm:text-4xl">{pret ? `${mois >= 0 ? "" : "+"}${eur(Math.abs(mois))}` : "—"}<span className="text-sm font-bold text-white/75">/mois</span></p>
            <p className="text-sm font-bold text-white/85">{pret ? (an >= 0 ? `soit ${eur(an)} économisés sur l'année` : `soit ${eur(-an)} de plus sur l'année`) : " "}</p>
            {detail && <p className="text-[11px] font-semibold text-white/70">{detail}</p>}
        </div>
    );
    const bandeauEco = (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[24px] px-6 py-5 text-white shadow-[0_20px_50px_rgba(205,30,37,.3)]"
            style={{ background: ecoAn1 >= 0 || !pret ? `linear-gradient(120deg, ${ROUGE}, #e8434a)` : "linear-gradient(120deg,#475569,#64748b)" }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><PiggyBank size={26} /></span>
            {bloc("Économie 1re année", ecoMoisAn1, ecoAn1, [mes ? `MES ${MISE_EN_SERVICE} € déduite` : "", moisOffertsEco > 0 ? "mois offerts comptés" : ""].filter(Boolean).join(" · ") || undefined)}
            <span className="hidden h-14 w-px bg-white/25 sm:block" />
            {bloc("À partir de la 2e année", ecoMoisAn2, ecoAn2)}
        </div>
    );

    const enTete = (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div>
                <Link href={baseOutils === "/manager/outils" ? baseOutils : `${baseOutils}${qs}`} className="text-[11px] font-black uppercase tracking-[0.25em] hover:underline" style={{ color: ROUGE }}>Outils</Link>
                <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">Calculatrice box <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-300">Bêta</span></h1>
            </div>
            <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-slate-400">Tarifs free.fr · à confirmer au moment de la vente</p>
                <button type="button" onClick={reinitialiser} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw size={14} /> Nouveau client</button>
            </div>
        </div>
    );

    const enteteFree = (
        <div className="mb-4 flex items-start justify-between gap-3">
            <p className="text-lg font-black" style={{ color: ROUGE }}>Chez Free</p>
            <div className="text-right">
                <p className="text-2xl font-black tabular-nums" style={{ color: ROUGE }}>{eur(mensuelFreeAn1)}<span className="text-xs font-bold text-slate-400">/mois la 1re année</span></p>
                <p className="text-sm font-bold tabular-nums text-slate-500">puis {eur(mensuelFreeAn2)}/mois{mes ? ` · + MES ${MISE_EN_SERVICE} €` : ""}</p>
            </div>
        </div>
    );

    /* ── Vue A : deux colonnes ── */
    if (vue === "A") {
        return (
            <div className="mx-auto max-w-[1180px]">
                {enTete}
                <div className="mb-5">{bandeauEco}</div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-4 flex items-start justify-between"><p className="text-lg font-black text-slate-900">Aujourd&apos;hui</p><p className="text-2xl font-black tabular-nums text-slate-900">{eur(mensuelActuel)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                        {saisieActuel}
                    </section>
                    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-2" style={{ ["--tw-ring-color" as string]: ROUGE }}>
                        {enteteFree}
                        {saisieFree}
                    </section>
                </div>
            </div>
        );
    }

    /* ── Vue B : parcours en 3 étapes ── */
    const ETAPES = ["Ce que paie le client", "L'offre Free", "Résultat"];
    const recap = (titre: string, lignes: { label: string; txt: string; vert?: boolean }[], total: string, sous: string | null, free?: boolean) => (
        <section className={`rounded-[24px] bg-white p-6 ${free ? "ring-2" : "ring-1 ring-slate-200"}`} style={free ? { ["--tw-ring-color" as string]: ROUGE } : undefined}>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: free ? ROUGE : "#94a3b8" }}>{titre}</p>
            <p className="text-4xl font-black tabular-nums"><span className={free ? "text-slate-900" : "text-slate-400 line-through decoration-2"}>{total}</span><span className="text-sm font-bold text-slate-400">/mois</span></p>
            {sous && <p className="text-sm font-bold text-slate-500">{sous}</p>}
            <ul className="mt-4 space-y-1.5 text-sm">
                {lignes.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className={free ? "text-slate-700" : "text-slate-500"}>{l.label}</span><span className={`shrink-0 font-bold tabular-nums ${l.vert ? "text-emerald-600" : "text-slate-900"}`}>{l.txt}</span></li>
                ))}
            </ul>
        </section>
    );
    return (
        <div className="mx-auto max-w-[1180px]">
            {enTete}
            <div className="mb-5 flex items-center gap-3 print:hidden">
                {ETAPES.map((e, i) => {
                    const n = i + 1;
                    const fait = n < etape;
                    return (
                        <button key={e} type="button" onClick={() => (n <= etape || pret) && setEtape(n)} className="flex flex-1 items-center gap-3 text-left">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${fait ? "bg-emerald-500 text-white" : n === etape ? "text-white" : "bg-slate-200 text-slate-500"}`} style={n === etape ? { background: ROUGE } : undefined}>
                                {fait ? <Check size={16} strokeWidth={3} /> : n}
                            </span>
                            <span className={`hidden text-sm font-black sm:inline ${n === etape ? "text-slate-900" : "text-slate-400"}`}>{e}</span>
                            {i < 2 && <span className={`h-0.5 flex-1 rounded ${fait ? "bg-emerald-200" : "bg-slate-200"}`} />}
                        </button>
                    );
                })}
            </div>

            {etape === 1 && (
                <section className="mx-auto max-w-2xl rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                    <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black text-slate-900">Ce que paie le client</p><p className="text-2xl font-black tabular-nums text-slate-900">{eur(mensuelActuel)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                    {saisieActuel}
                </section>
            )}
            {etape === 2 && (
                <section className="mx-auto max-w-2xl rounded-[24px] bg-white p-5 shadow-sm ring-2 sm:p-6" style={{ ["--tw-ring-color" as string]: ROUGE }}>
                    {enteteFree}
                    {saisieFree}
                </section>
            )}
            {etape === 3 && (
                <div className="space-y-5">
                    {bandeauEco}
                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
                        {recap("Aujourd'hui", lignesActuel.map((l) => ({ label: l.label, txt: eur(l.prix) })), eur(mensuelActuel), null)}
                        <div className="hidden items-center lg:flex"><span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: ROUGE }}><ArrowRight size={22} /></span></div>
                        {recap(`Chez Free · ${freebox.nom}`, [
                            ...lignesFree.map((l) => ({ label: l.label, txt: l.prix.an1 === 0 && l.prix.an2 === 0 ? "inclus" : l.prix.an2 !== l.prix.an1 ? `${eur(l.prix.an1)} puis ${eur(l.prix.an2)}` : eur(l.prix.an1), vert: l.prix.an1 === 0 && l.prix.an2 === 0 })),
                            ...(mes ? [{ label: "Mise en service (une fois)", txt: eur(MISE_EN_SERVICE) }] : []),
                        ], eur(mensuelFreeAn1), `puis ${eur(mensuelFreeAn2)}/mois à partir de la 2e année`, true)}
                    </div>
                </div>
            )}

            <div className="mx-auto mt-5 flex max-w-2xl justify-between print:hidden" style={etape === 3 ? { maxWidth: "none" } : undefined}>
                {etape > 1 ? (
                    <button type="button" onClick={() => setEtape(etape - 1)} className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft size={16} /> {etape === 3 ? "Modifier" : "Retour"}</button>
                ) : <span />}
                {etape < 3 ? (
                    <button type="button" disabled={etape === 1 && !pret} onClick={() => setEtape(etape + 1)} className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-black text-white disabled:opacity-40" style={{ background: ROUGE }}>
                        {etape === 1 ? "Voir l'offre Free" : "Voir le résultat"} <ArrowRight size={16} />
                    </button>
                ) : (
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-black text-white" style={{ background: ROUGE }}><Printer size={16} /> Imprimer pour le client</button>
                )}
            </div>
        </div>
    );
}

export default function CalculatriceBoxPage() {
    return <Suspense><Calculatrice /></Suspense>;
}
