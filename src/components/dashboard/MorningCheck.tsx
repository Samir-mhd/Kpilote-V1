"use client";

import { useEffect, useState } from "react";
import { getMissionsCompletes } from "@/services/missionsReelles";
import { sauvegarderCheckCerebro, ajusterCheckCerebro } from "@/services/resetService";

type Props = {
    nom: string;
    conseillerId: string;
    /** true = check forcé après reset manager → sauvegarde les valeurs en base */
    isReset?: boolean;
    onValidated: () => void;
};

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const FALLBACK = ["Box", "Forfaits", "Téléphones", "McAfee", "Assurance"].map((p) => ({ produit: p, valeur: 0 }));
const MESSAGES = [
    "Prêt à performer aujourd'hui ?",
    "Une nouvelle journée, de nouvelles opportunités.",
    "Chaque vente compte. Commence fort.",
    "Concentré, motivé — c'est parti.",
    "Ta boutique t'attend. Let's go.",
    "Aujourd'hui, on bat nos records.",
];

type Item = { produit: string; valeur: number };

export default function MorningCheck({ nom, conseillerId, isReset = false, onValidated }: Props) {
    const [visible, setVisible] = useState(false);
    const [dateLabel, setDateLabel] = useState("");
    const [heure, setHeure] = useState("");
    const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    const [items,         setItems]         = useState<Item[]>([]);
    const [originalItems, setOriginalItems] = useState<Item[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [pressing, setPressing]   = useState(false);
    const [saving, setSaving]        = useState(false);

    useEffect(() => {
        const now = new Date();
        setDateLabel(`${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]}`);
        setHeure(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
        setTimeout(() => setVisible(true), 80);
    }, []);

    useEffect(() => {
        if (!conseillerId) { setItems(FALLBACK); setOriginalItems(FALLBACK); setLoading(false); return; }
        getMissionsCompletes(conseillerId)
            .then((missions) => {
                const loaded = missions.map((m) => ({ produit: m.produit, valeur: m.realise }));
                setItems(loaded);
                setOriginalItems(loaded);
            })
            .catch(() => { setItems(FALLBACK); setOriginalItems(FALLBACK); })
            .finally(() => setLoading(false));
    }, [conseillerId]);

    function adjust(produit: string, delta: number) {
        setItems((prev) =>
            prev.map((it) =>
                it.produit === produit ? { ...it, valeur: Math.max(0, it.valeur + delta) } : it
            )
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: "#060612" }}
        >
            {/* Halos */}
            <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />
            <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

            <div
                className="relative mx-auto w-full max-w-lg px-6 py-12 transition-all duration-700"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)" }}
            >
                {/* Logo */}
                <div className="mb-12 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-black text-white">
                        K
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">KPILOTE</span>
                </div>

                {/* Salutation */}
                <h1 className="text-5xl font-black leading-tight text-white">
                    Bonjour<br />
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                        {nom}
                    </span>{" "}👋
                </h1>

                <div className="mt-4 flex items-center gap-3">
                    <p className="text-sm font-semibold text-white/40">{dateLabel}</p>
                    <span className="text-white/15">·</span>
                    <p className="font-mono text-sm text-white/25">{heure}</p>
                </div>

                <p className="mt-4 text-lg font-medium leading-relaxed text-white/50">{msg}</p>

                {/* ── Cerebro Check ───────────────────────────────────────────── */}
                <div className="mt-10">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.3em] text-violet-400">
                        Cerebro Check
                    </p>
                    <p className="mb-6 text-xs text-white/30">
                        {isReset
                            ? "⚠️ Tes données ont été réinitialisées. Saisis tes vrais chiffres du mois."
                            : "Vérifie tes volumes du mois en cours — ajuste si nécessaire."}
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {items.map((item) => (
                                <div
                                    key={item.produit}
                                    className="group rounded-[20px] border border-white/8 bg-white/4 p-5 transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                                >
                                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                                        {item.produit}
                                    </p>

                                    <div className="flex items-center justify-between gap-3">
                                        {/* Bouton − */}
                                        <button
                                            onClick={() => adjust(item.produit, -1)}
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-white/50 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 active:scale-90"
                                        >
                                            −
                                        </button>

                                        {/* Valeur */}
                                        <p className="text-5xl font-black tabular-nums text-white">
                                            {item.valeur}
                                        </p>

                                        {/* Bouton + */}
                                        <button
                                            onClick={() => adjust(item.produit, +1)}
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-white/50 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 active:scale-90"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <p className="mt-4 text-xs text-white/20">ventes ce mois</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Carte CTA ────────────────────────────────────────────────── */}
                {!loading && (
                    <button
                        onClick={async () => {
                            setPressing(true);
                            if (conseillerId) {
                                const toCode = (produit: string) =>
                                    produit.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

                                if (isReset) {
                                    // Après reset : toutes les ventes ont été supprimées → on insère le total complet
                                    setSaving(true);
                                    try {
                                        const values: Record<string, number> = {};
                                        items.forEach(it => { if (it.valeur > 0) values[toCode(it.produit)] = it.valeur; });
                                        await sauvegarderCheckCerebro(conseillerId, values);
                                    } catch { /* silencieux */ }
                                    setSaving(false);
                                } else {
                                    // Mode normal : sauvegarde uniquement si le conseiller a modifié des valeurs
                                    const hasChanges = items.some((it, i) => it.valeur !== (originalItems[i]?.valeur ?? 0));
                                    if (hasChanges) {
                                        setSaving(true);
                                        try {
                                            const values: Record<string, number> = {};
                                            items.forEach(it => { values[toCode(it.produit)] = it.valeur; });
                                            await ajusterCheckCerebro(conseillerId, values);
                                        } catch { /* silencieux */ }
                                        setSaving(false);
                                    }
                                }
                            }
                            setTimeout(onValidated, 100);
                        }}
                        className="group relative mt-6 w-full overflow-hidden rounded-[20px] border border-violet-500/20 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 px-7 py-6 text-left transition-all duration-300 hover:border-violet-500/50 hover:from-violet-600/30 hover:to-fuchsia-600/30 active:scale-[0.98]"
                        style={{ opacity: pressing ? 0.6 : 1, transform: pressing ? "scale(0.98)" : undefined }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400/70">
                                    Tout est bon
                                </p>
                                <p className="mt-1 text-xl font-black text-white">
                                    {saving ? "Enregistrement…" : isReset ? "Valider et démarrer" : "Démarrer la journée"}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_20px_rgba(124,58,237,.4)] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_28px_rgba(124,58,237,.6)]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>

                        {/* Shine */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>
                )}

            </div>
        </div>
    );
}
