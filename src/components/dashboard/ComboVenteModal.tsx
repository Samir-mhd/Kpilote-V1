"use client";

import { useState, ReactNode } from "react";
import { BaremeVariable, BonusManuel } from "@/services/variableConseiller";

/** Une vente combo = une seule transaction client. Forfaits, téléphones et assurances se
 *  comptent à l'unité (un client peut prendre plusieurs lignes) ; box et McAfee restent uniques. */
export type ComboSelection = {
    box: "box_ultra" | "box_pop" | "box_pop_s_revolution_5g" | null;
    canal: "canal_option1" | "canal_option2" | "canal_option3" | null;
    forfaits: { forfait_free_serie: number; forfait_free_max: number };
    quatreP: boolean;
    telephones: number;
    boostConstructeurId: string | null;
    mcafee: "mcafee_499" | "mcafee_699" | null;
    mcafeeMobileId: string | null;
    assurances: { nouveau_mobile: number; essentielle: number };
    /** Commentaire de la box (identifiant client, RDV technicien…) — reporté sur la fiche de suivi. */
    commentaire: string;
};

const SELECTION_VIDE: ComboSelection = {
    box: null, canal: null, forfaits: { forfait_free_serie: 0, forfait_free_max: 0 }, quatreP: false,
    telephones: 0, boostConstructeurId: null, mcafee: null, mcafeeMobileId: null,
    assurances: { nouveau_mobile: 0, essentielle: 0 }, commentaire: "",
};

function fmtEuro(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/40">{titre}</p>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                actif ? "bg-amber-500 text-white" : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
        >
            {children}
        </button>
    );
}

/** Ligne avec compteur − n + (forfaits, téléphones, assurances). */
function Compteur({ label, valeur, onChange }: { label: string; valeur: number; onChange: (n: number) => void }) {
    const actif = valeur > 0;
    return (
        <div className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${actif ? "bg-amber-500 text-white" : "border border-white/15 bg-white/5 text-white/60"}`}>
            <button type="button" onClick={() => onChange(actif ? valeur : 1)} className="min-w-0 flex-1 truncate text-left">{label}</button>
            <div className="flex shrink-0 items-center gap-2">
                <button type="button" aria-label={`Retirer : ${label}`} onClick={() => onChange(Math.max(0, valeur - 1))} disabled={valeur === 0}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-base leading-none disabled:opacity-30 ${actif ? "bg-white/25 hover:bg-white/35" : "bg-white/10 hover:bg-white/15"}`}>−</button>
                <span className="w-5 text-center text-sm tabular-nums">{valeur}</span>
                <button type="button" aria-label={`Ajouter : ${label}`} onClick={() => onChange(Math.min(20, valeur + 1))}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-base leading-none ${actif ? "bg-white/25 hover:bg-white/35" : "bg-white/10 hover:bg-white/15"}`}>+</button>
            </div>
        </div>
    );
}

type Props = {
    bareme: BaremeVariable;
    bonusManuels: BonusManuel[];
    onClose: () => void;
    onValider: (selection: ComboSelection) => Promise<void>;
    /** Produits choisis depuis la carte « Déclarer une vente » (codes box, forfaits, telephones,
     *  mcafee, assurance) : seuls ces groupes sont affichés et chacun doit être renseigné. */
    produits?: string[];
    /** Quantités choisies sur la carte « Déclarer une vente » (forfaits, telephones, assurance). */
    quantites?: Record<string, number>;
};

export default function ComboVenteModal({ bareme, bonusManuels, onClose, onValider, produits, quantites = {} }: Props) {
    const voir = (code: string) => !produits || produits.includes(code);
    const [s, setS] = useState<ComboSelection>(() => ({
        ...SELECTION_VIDE,
        // Forfaits annoncés depuis l'Accueil : pré-remplis en Série (le plus courant), à ajuster en Max.
        forfaits: { forfait_free_serie: produits?.includes("forfaits") ? Math.max(1, quantites.forfaits ?? 1) : 0, forfait_free_max: 0 },
        telephones: produits?.includes("telephones") ? Math.max(1, quantites.telephones ?? 1) : 0,
        // Assurance de la carte Accueil = Nouveau Mobile ; l'essentielle se répartit ici si besoin.
        assurances: { nouveau_mobile: produits?.includes("assurance") ? Math.max(1, quantites.assurance ?? 1) : 0, essentielle: 0 },
    }));
    const [enCours, setEnCours] = useState(false);
    // Forfaits annoncés depuis l'Accueil : à répartir entre Série et Max.
    const forfaitsAttendus = produits?.includes("forfaits") ? Math.max(1, quantites.forfaits ?? 1) : 0;

    const bonusConstructeur = bonusManuels.filter((b) => !b.categorie || b.categorie === "destockage");
    const bonusMcafeeMobile = bonusManuels.filter(
        (b) => b.categorie === "autres_primes" && b.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("mcafee")
    );

    const boxOptions: { cle: ComboSelection["box"]; label: string; montant: number }[] = [
        { cle: "box_ultra", label: "Ultra / Ultra Essentiel", montant: bareme.box_ultra },
        { cle: "box_pop", label: "POP", montant: bareme.box_pop },
        { cle: "box_pop_s_revolution_5g", label: "POP S / Révolution / 5G", montant: bareme.box_pop_s_revolution_5g },
    ];
    const forfaitOptions: { cle: keyof ComboSelection["forfaits"]; label: string; montant: number }[] = [
        { cle: "forfait_free_serie", label: "Free / Série Free", montant: bareme.forfait_free_serie },
        { cle: "forfait_free_max", label: "Free Max", montant: bareme.forfait_free_max },
    ];
    const canalOptions: { cle: ComboSelection["canal"]; label: string; montant: number }[] = [
        { cle: "canal_option1", label: "Option 1", montant: bareme.canal_option1 },
        { cle: "canal_option2", label: "Option 2", montant: bareme.canal_option2 },
        { cle: "canal_option3", label: "Option 3", montant: bareme.canal_option3 },
    ];
    const mcafeeOptions: { cle: ComboSelection["mcafee"]; label: string; montant: number }[] = [
        { cle: "mcafee_499", label: "4,99€", montant: bareme.mcafee_499 },
        { cle: "mcafee_699", label: "6,99€", montant: bareme.mcafee_699 },
    ];

    const nbForfaits = s.forfaits.forfait_free_serie + s.forfaits.forfait_free_max;
    const nbAssurances = s.assurances.nouveau_mobile + s.assurances.essentielle;

    const total =
        (boxOptions.find((o) => o.cle === s.box)?.montant ?? 0) +
        (s.box === "box_ultra" ? (canalOptions.find((o) => o.cle === s.canal)?.montant ?? 0) : 0) +
        s.forfaits.forfait_free_serie * bareme.forfait_free_serie +
        s.forfaits.forfait_free_max * bareme.forfait_free_max +
        (s.quatreP ? bareme.cross_sell_4p : 0) +
        s.telephones * bareme.smartphone +
        (s.telephones > 0 ? (bonusConstructeur.find((b) => b.id === s.boostConstructeurId)?.montant ?? 0) : 0) +
        (mcafeeOptions.find((o) => o.cle === s.mcafee)?.montant ?? 0) +
        (bonusMcafeeMobile.find((b) => b.id === s.mcafeeMobileId)?.montant ?? 0) +
        s.assurances.nouveau_mobile * bareme.assurance_nouveau_mobile +
        s.assurances.essentielle * bareme.assurance_essentielle;

    const rienSelectionne = !s.box && nbForfaits === 0 && !s.quatreP && s.telephones === 0 && !s.mcafee && !s.mcafeeMobileId && nbAssurances === 0;
    // Depuis « Déclarer une vente » : chaque produit coché doit avoir son modèle choisi.
    const manquants = (produits ?? []).filter((p) =>
        (p === "box" && !s.box) || (p === "forfaits" && nbForfaits === 0) || (p === "telephones" && s.telephones === 0)
        || (p === "mcafee" && !s.mcafee) || (p === "assurance" && nbAssurances === 0));
    const LIBELLES: Record<string, string> = { box: "Box", forfaits: "Forfait", telephones: "Téléphone", mcafee: "McAfee", assurance: "Assurance" };

    async function valider() {
        if (rienSelectionne || manquants.length > 0 || enCours) return;
        setEnCours(true);
        try {
            await onValider(s);
            onClose();
        } finally {
            setEnCours(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-slate-900 p-6 shadow-[0_-20px_60px_rgba(0,0,0,.5)] sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">🎁 Vente combo</h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20">✕</button>
                </div>
                <p className="mb-5 text-xs text-white/40">Coche tout ce qui fait partie de cette même vente — plusieurs lignes possibles pour les forfaits, téléphones et assurances.</p>

                <div className="space-y-5">
                    {voir("box") && <Groupe titre="💻 Box">
                        {boxOptions.map((o) => (
                            <Puce key={o.cle} actif={s.box === o.cle} onClick={() => setS((p) => ({ ...p, box: p.box === o.cle ? null : o.cle, canal: p.box === o.cle ? p.canal : (o.cle === "box_ultra" ? p.canal : null) }))}>
                                {o.label} · {fmtEuro(o.montant)}
                            </Puce>
                        ))}
                    </Groupe>}

                    {s.box && (
                        <Groupe titre="📝 Commentaire box (optionnel)">
                            <input
                                value={s.commentaire}
                                onChange={(e) => setS((p) => ({ ...p, commentaire: e.target.value }))}
                                placeholder="Identifiant client, RDV technicien…"
                                className="h-11 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400"
                            />
                        </Groupe>
                    )}

                    {s.box === "box_ultra" && (
                        <Groupe titre="📺 Canal+">
                            {canalOptions.map((o) => (
                                <Puce key={o.cle} actif={s.canal === o.cle} onClick={() => setS((p) => ({ ...p, canal: p.canal === o.cle ? null : o.cle }))}>
                                    {o.label} · {fmtEuro(o.montant)}
                                </Puce>
                            ))}
                        </Groupe>
                    )}

                    {voir("forfaits") && <Groupe titre={forfaitsAttendus > 1 ? `📶 Forfaits · ${nbForfaits} / ${forfaitsAttendus} répartis` : "📶 Forfaits"}>
                        {forfaitOptions.map((o) => (
                            <Compteur
                                key={o.cle}
                                label={`${o.label} · ${fmtEuro(o.montant)}`}
                                valeur={s.forfaits[o.cle]}
                                onChange={(n) => setS((p) => ({ ...p, forfaits: { ...p.forfaits, [o.cle]: n } }))}
                            />
                        ))}
                    </Groupe>}

                    {(s.box || nbForfaits > 0) && (
                        <Groupe titre="🔁 Cross-sell 4P">
                            <Puce actif={s.quatreP} onClick={() => setS((p) => ({ ...p, quatreP: !p.quatreP }))}>
                                Vente 4P · {fmtEuro(bareme.cross_sell_4p)}
                            </Puce>
                        </Groupe>
                    )}

                    {voir("telephones") && <Groupe titre="📲 Téléphones">
                        <Compteur
                            label={`Smartphone · ${fmtEuro(bareme.smartphone)}`}
                            valeur={s.telephones}
                            onChange={(n) => setS((p) => ({ ...p, telephones: n, boostConstructeurId: n === 0 ? null : p.boostConstructeurId }))}
                        />
                    </Groupe>}

                    {s.telephones > 0 && bonusConstructeur.length > 0 && (
                        <Groupe titre="🏭 Boost constructeur / déstockage">
                            {bonusConstructeur.map((b) => (
                                <Puce key={b.id} actif={s.boostConstructeurId === b.id} onClick={() => setS((p) => ({ ...p, boostConstructeurId: p.boostConstructeurId === b.id ? null : b.id }))}>
                                    {b.label} · {fmtEuro(b.montant)}
                                </Puce>
                            ))}
                        </Groupe>
                    )}

                    {voir("mcafee") && <Groupe titre="🛡️ McAfee">
                        {mcafeeOptions.map((o) => (
                            <Puce key={o.cle} actif={s.mcafee === o.cle} onClick={() => setS((p) => ({ ...p, mcafee: p.mcafee === o.cle ? null : o.cle }))}>
                                {o.label}
                            </Puce>
                        ))}
                    </Groupe>}

                    {bonusMcafeeMobile.length > 0 && (voir("mcafee") || voir("forfaits")) && (
                        <Groupe titre="🔐 McAfee Mobile">
                            {bonusMcafeeMobile.map((b) => (
                                <Puce key={b.id} actif={s.mcafeeMobileId === b.id} onClick={() => setS((p) => ({ ...p, mcafeeMobileId: p.mcafeeMobileId === b.id ? null : b.id }))}>
                                    {b.label}
                                </Puce>
                            ))}
                        </Groupe>
                    )}

                    {voir("assurance") && <Groupe titre="🛟 Assurances">
                        <Compteur
                            label={`🛟 Nouveau Mobile · ${fmtEuro(bareme.assurance_nouveau_mobile)}`}
                            valeur={s.assurances.nouveau_mobile}
                            onChange={(n) => setS((p) => ({ ...p, assurances: { ...p.assurances, nouveau_mobile: n } }))}
                        />
                        <Compteur
                            label={`⛑️ Essentielle · ${fmtEuro(bareme.assurance_essentielle)}`}
                            valeur={s.assurances.essentielle}
                            onChange={(n) => setS((p) => ({ ...p, assurances: { ...p.assurances, essentielle: n } }))}
                        />
                    </Groupe>}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Total combo</span>
                    <span className="text-xl font-black text-amber-300">{fmtEuro(total)}</span>
                </div>

                <button
                    onClick={valider}
                    disabled={rienSelectionne || manquants.length > 0 || enCours}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-black text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
                >
                    {enCours ? "Enregistrement..." : manquants.length > 0 ? `Choisis : ${manquants.map((m) => LIBELLES[m]).join(", ")}` : "Valider la vente combo"}
                </button>
            </div>
        </div>
    );
}
