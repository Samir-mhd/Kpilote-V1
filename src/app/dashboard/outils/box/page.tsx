"use client";

/**
 * Outils → Calculatrice box : ce que paie le client aujourd'hui (box, forfaits, abonnements,
 * protection) face à l'offre Free, et l'économie réalisée. Deux mises en page en test :
 * A (deux colonnes, par défaut) et B (parcours en 3 étapes, &vue=B). Tarifs : src/utils/offresBox.ts.
 */
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Plus, X, PiggyBank, ArrowLeft, ArrowRight, Printer, RotateCcw } from "lucide-react";
import { SERVICES, FREEBOX, FORFAITS_FREE, CANAL_PROMOS_FREE, PROTECTION_FREE, type CodeService } from "@/utils/offresBox";

const ROUGE = "#cd1e25";
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const lire = (s: string) => { const n = Number(s.replace(",", ".").replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : 0; };

type ServiceActuel = { on: boolean; offre: string; prix: number };
type Ligne = { label: string; prix: number; note?: string; inclus?: boolean };

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

function Ligne_({ children, actif = true }: { children: React.ReactNode; actif?: boolean }) {
    return <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${actif ? "bg-slate-50 ring-1 ring-slate-200" : "bg-white ring-1 ring-slate-100"}`}>{children}</div>;
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

const Titre = ({ c }: { c: string }) => <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 first:mt-0">{c}</p>;
const Ajouter = ({ onClick, c }: { onClick: () => void; c: string }) => (
    <button type="button" onClick={onClick} className="mt-2 flex items-center gap-1 text-xs font-black hover:underline" style={{ color: ROUGE }}><Plus size={14} /> {c}</button>
);

/* ───────────── Page ───────────── */

function Calculatrice() {
    const sp = useSearchParams();
    const vue = sp.get("vue") === "B" ? "B" : "A";
    const qs = `?id=${encodeURIComponent(sp.get("id") ?? "")}&nom=${encodeURIComponent(sp.get("nom") ?? "")}`;

    // ── Aujourd'hui ──
    const [boxActuelle, setBoxActuelle] = useState(0);
    const [forfaitsActuels, setForfaitsActuels] = useState<number[]>([0]);
    const [services, setServices] = useState<Record<CodeService, ServiceActuel>>(servicesInitiaux);
    const [autres, setAutres] = useState<{ label: string; prix: number }[]>([]);
    const [protectionActuelle, setProtectionActuelle] = useState<{ on: boolean; prix: number }>({ on: false, prix: 0 });

    // ── Chez Free ──
    const [freeboxId, setFreeboxId] = useState("ultra");
    const [forfaitsFree, setForfaitsFree] = useState<string[] | null>(null); // null = suit le nombre de forfaits actuels
    const [canalPromo, setCanalPromo] = useState(CANAL_PROMOS_FREE[0].id);
    const [garderNiveau, setGarderNiveau] = useState<Partial<Record<CodeService, boolean>>>({});
    const [garderAutres, setGarderAutres] = useState(true);
    const [protectionFree, setProtectionFree] = useState<boolean | null>(null); // null = comme aujourd'hui

    const [etape, setEtape] = useState(1);

    const freebox = FREEBOX.find((b) => b.id === freeboxId)!;
    const forfaitsFreeEffectifs = forfaitsFree ?? forfaitsActuels.map((_, i) => (i === 0 ? "free_5g" : "serie_free"));
    const protectionFreeActive = protectionFree ?? protectionActuelle.on;

    const lignesActuel: Ligne[] = useMemo(() => {
        const l: Ligne[] = [];
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

    /** Services côté Free : inclus dans la box, montée en gamme (différence de prix) ou payés à part. */
    const servicesFree = SERVICES.filter((s) => services[s.code].on).map((s) => {
        const sv = services[s.code];
        if (s.code === "canal") {
            const p = CANAL_PROMOS_FREE.find((c) => c.id === canalPromo)!;
            return { code: s.code, label: p.label, prix: p.prix, note: "promo abonnés Freebox", montee: false };
        }
        const rangInclus = freebox.inclus[s.code];
        const rangActuel = offreDe(s.code, sv.offre).rang;
        if (rangInclus && rangInclus >= rangActuel) return { code: s.code, label: s.label, prix: 0, note: "inclus dans la box", montee: false };
        if (rangInclus && rangInclus < rangActuel) {
            const inclusOffre = s.offres.find((o) => o.rang === rangInclus)!;
            const garde = garderNiveau[s.code] ?? true;
            return garde
                ? { code: s.code, label: `${s.label} ${offreDe(s.code, sv.offre).label}`, prix: Math.max(0, Math.round((sv.prix - inclusOffre.prix) * 100) / 100), note: `${inclusOffre.label} inclus, supplément seulement`, montee: true }
                : { code: s.code, label: `${s.label} ${inclusOffre.label}`, prix: 0, note: "inclus dans la box", montee: true };
        }
        return { code: s.code, label: s.label, prix: sv.prix, note: "conservé", montee: false };
    });

    const lignesFree: Ligne[] = [
        { label: freebox.nom, prix: freebox.prix },
        ...forfaitsFreeEffectifs.map((id) => { const f = FORFAITS_FREE.find((x) => x.id === id)!; return { label: f.nom, prix: f.prix, note: f.note }; }),
        ...servicesFree.map((s) => ({ label: s.label, prix: s.prix, note: s.note, inclus: s.prix === 0 })),
        ...(garderAutres ? autres.filter((a) => a.prix > 0).map((a) => ({ label: a.label || "Autre", prix: a.prix, note: "conservé" })) : []),
        ...(protectionFreeActive ? [{ label: "Protection mobile Free", prix: PROTECTION_FREE }] : []),
    ];

    const totalActuel = lignesActuel.reduce((t, l) => t + l.prix, 0);
    const totalFree = lignesFree.reduce((t, l) => t + l.prix, 0);
    const eco = totalActuel - totalFree;
    const pret = totalActuel > 0;

    function reinitialiser() {
        setBoxActuelle(0); setForfaitsActuels([0]); setServices(servicesInitiaux()); setAutres([]); setProtectionActuelle({ on: false, prix: 0 });
        setFreeboxId("ultra"); setForfaitsFree(null); setCanalPromo(CANAL_PROMOS_FREE[0].id); setGarderNiveau({}); setGarderAutres(true); setProtectionFree(null); setEtape(1);
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
            <Titre c="Freebox" />
            <div className="grid grid-cols-2 gap-2">
                {FREEBOX.map((b) => {
                    const on = b.id === freeboxId;
                    return (
                        <button key={b.id} type="button" onClick={() => setFreeboxId(b.id)}
                            className={`rounded-xl px-3 py-2.5 text-left transition-all ${on ? "text-white shadow-md" : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"}`}
                            style={on ? { background: ROUGE } : undefined}>
                            <span className="block text-sm font-black">{b.nom}</span>
                            <span className={`block text-xs font-bold ${on ? "text-white/80" : "text-slate-400"}`}>{eur(b.prix)}/mois</span>
                        </button>
                    );
                })}
            </div>
            {freebox.inclusLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {freebox.inclusLabels.map((i) => <span key={i} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">✓ {i} inclus</span>)}
                </div>
            )}

            <Titre c="Forfaits Free" />
            <div className="space-y-2">
                {forfaitsFreeEffectifs.map((id, i) => (
                    <Ligne_ key={i}>
                        <select aria-label={`Forfait Free ${i + 1}`} value={id}
                            onChange={(e) => setForfaitsFree(forfaitsFreeEffectifs.map((x, j) => (j === i ? e.target.value : x)))}
                            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none">
                            {FORFAITS_FREE.map((f) => <option key={f.id} value={f.id}>{f.nom}{f.note ? ` (${f.note})` : ""}</option>)}
                        </select>
                        <span className="text-sm font-black tabular-nums text-slate-900">{eur(FORFAITS_FREE.find((f) => f.id === id)!.prix)}</span>
                        <button type="button" aria-label={`Retirer le forfait Free ${i + 1}`} onClick={() => setForfaitsFree(forfaitsFreeEffectifs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                    </Ligne_>
                ))}
            </div>
            <Ajouter c="Ajouter un forfait Free" onClick={() => setForfaitsFree([...forfaitsFreeEffectifs, "serie_free"])} />

            <Titre c="Abonnements chez Free" />
            {servicesFree.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-400 ring-1 ring-slate-200">Coche les abonnements du client pour les retrouver ici.</p>
            ) : (
                <div className="space-y-2">
                    {servicesFree.map((s) => (
                        <div key={s.code} className="rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800">{s.label}</p>
                                    <p className="text-[11px] font-semibold text-slate-400">{s.note}</p>
                                </div>
                                <span className={`text-sm font-black tabular-nums ${s.prix === 0 ? "text-emerald-600" : "text-slate-900"}`}>{s.prix === 0 ? "Inclus" : `${s.montee ? "+" : ""}${eur(s.prix)}`}</span>
                            </div>
                            {s.montee && (
                                <div className="mt-2 flex gap-1.5">
                                    {[true, false].map((g) => {
                                        const on = (garderNiveau[s.code] ?? true) === g;
                                        return (
                                            <button key={String(g)} type="button" onClick={() => setGarderNiveau((x) => ({ ...x, [s.code]: g }))}
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${on ? "text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                                                style={on ? { background: ROUGE } : undefined}>
                                                {g ? "Garder son offre" : "Passer à l'offre incluse"}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {s.code === "canal" && (
                                <select aria-label="Offre Canal+ abonné Freebox" value={canalPromo} onChange={(e) => setCanalPromo(e.target.value)}
                                    className="mt-2 w-full rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none ring-1 ring-slate-200">
                                    {CANAL_PROMOS_FREE.map((c) => <option key={c.id} value={c.id}>{c.label} · {eur(c.prix)}</option>)}
                                </select>
                            )}
                        </div>
                    ))}
                </div>
            )}

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

            <Titre c="Protection" />
            <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${protectionFreeActive ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                <Coche on={protectionFreeActive} label="Protection mobile Free" onClick={() => setProtectionFree(!protectionFreeActive)} />
                <span className="flex-1 text-sm font-bold text-slate-800">🛟 Protection mobile Free</span>
                <span className="text-sm font-black tabular-nums text-slate-900">{eur(PROTECTION_FREE)}</span>
            </div>
        </>
    );

    const bandeauEco = (grand?: boolean) => (
        <div className={`flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-6 ${grand ? "py-6" : "py-4"} text-white shadow-[0_20px_50px_rgba(205,30,37,.3)]`}
            style={{ background: eco >= 0 ? `linear-gradient(120deg, ${ROUGE}, #e8434a)` : "linear-gradient(120deg,#475569,#64748b)" }}>
            <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><PiggyBank size={26} /></span>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{eco >= 0 ? "Économie avec Free" : "Surcoût avec Free"}</p>
                    <p className={`${grand ? "text-5xl" : "text-4xl"} font-black tabular-nums`}>{pret ? eur(Math.abs(eco)) : "—"}<span className="text-base font-bold text-white/75">/mois</span></p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-3xl font-black tabular-nums">{pret ? eur(Math.abs(eco) * 12) : "—"}</p>
                <p className="text-xs font-bold text-white/75">{eco >= 0 ? "économisés" : "en plus"} sur 1 an</p>
            </div>
        </div>
    );

    const recap = (titre: string, lignes: Ligne[], total: number, free?: boolean) => (
        <section className={`rounded-[24px] bg-white p-6 ${free ? "ring-2" : "ring-1 ring-slate-200"}`} style={free ? { ["--tw-ring-color" as string]: ROUGE } : undefined}>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: free ? ROUGE : "#94a3b8" }}>{titre}</p>
            <p className="text-4xl font-black tabular-nums"><span className={free ? "text-slate-900" : "text-slate-400 line-through decoration-2"}>{eur(total)}</span><span className="text-sm font-bold text-slate-400">/mois</span></p>
            <ul className="mt-4 space-y-1.5 text-sm">
                {lignes.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                        <span className={free ? "text-slate-700" : "text-slate-500"}>{l.label}{l.note && <span className="text-xs text-slate-400"> · {l.note}</span>}</span>
                        <span className={`shrink-0 font-bold tabular-nums ${l.inclus ? "text-emerald-600" : free ? "text-slate-900" : "text-slate-600"}`}>{l.inclus ? "inclus" : eur(l.prix)}</span>
                    </li>
                ))}
            </ul>
        </section>
    );

    const enTete = (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div>
                <Link href={`/dashboard/outils${qs}`} className="text-[11px] font-black uppercase tracking-[0.25em] hover:underline" style={{ color: ROUGE }}>Outils</Link>
                <h1 className="text-3xl font-black text-slate-900">Calculatrice box</h1>
            </div>
            <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-slate-400">Prix indicatifs · à confirmer au moment de la vente</p>
                <button type="button" onClick={reinitialiser} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><RotateCcw size={14} /> Nouveau client</button>
            </div>
        </div>
    );

    /* ── Vue A : deux colonnes ── */
    if (vue === "A") {
        return (
            <div className="mx-auto max-w-[1180px]">
                {enTete}
                <div className="mb-5">{bandeauEco()}</div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                        <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black text-slate-900">Aujourd&apos;hui</p><p className="text-2xl font-black tabular-nums text-slate-900">{eur(totalActuel)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                        {saisieActuel}
                    </section>
                    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-2" style={{ ["--tw-ring-color" as string]: ROUGE }}>
                        <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black" style={{ color: ROUGE }}>Chez Free</p><p className="text-2xl font-black tabular-nums" style={{ color: ROUGE }}>{eur(totalFree)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                        {saisieFree}
                    </section>
                </div>
            </div>
        );
    }

    /* ── Vue B : parcours en 3 étapes ── */
    const ETAPES = ["Ce que paie le client", "L'offre Free", "Résultat"];
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
                    <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black text-slate-900">Ce que paie le client</p><p className="text-2xl font-black tabular-nums text-slate-900">{eur(totalActuel)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                    {saisieActuel}
                </section>
            )}
            {etape === 2 && (
                <section className="mx-auto max-w-2xl rounded-[24px] bg-white p-5 shadow-sm ring-2 sm:p-6" style={{ ["--tw-ring-color" as string]: ROUGE }}>
                    <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black" style={{ color: ROUGE }}>L&apos;offre Free</p><p className="text-2xl font-black tabular-nums" style={{ color: ROUGE }}>{eur(totalFree)}<span className="text-xs font-bold text-slate-400">/mois</span></p></div>
                    {saisieFree}
                </section>
            )}
            {etape === 3 && (
                <div className="space-y-5">
                    {bandeauEco(true)}
                    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
                        {recap("Aujourd'hui", lignesActuel, totalActuel)}
                        <div className="hidden items-center lg:flex"><span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: ROUGE }}><ArrowRight size={22} /></span></div>
                        {recap(`Chez Free · ${freebox.nom}`, lignesFree, totalFree, true)}
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
