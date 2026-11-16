"use client";

import { useEffect, useState } from "react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getBilanSoir, PerfBilan, CODES_ACTES_BILAN, CODES_SUIVI_BILAN } from "@/services/bilanSoirService";

const EMOJI: Record<string, string> = { box: "📦", forfaits: "📱", telephones: "📲", mcafee: "🛡️", assurance: "✅", avis_google: "⭐", recap_commercial: "📋", mcafee_mobile: "📶", assurance_essentielle: "🧩" };
const NOM: Record<string, [string, string]> = {
    box: ["Box", "Box"], forfaits: ["Forfait", "Forfaits"], telephones: ["Téléphone", "Téléphones"], mcafee: ["McAfee", "McAfee"],
    assurance: ["Assurance", "Assurances"], mcafee_mobile: ["McAfee Mobile", "McAfee Mobile"],
    assurance_essentielle: ["Assurance essentielle", "Assurances essentielles"],
    avis_google: ["Avis Google", "Avis Google"], recap_commercial: ["Récap Co", "Récap Co"],
};
const nomProduit = (c: string, n: number) => NOM[c][n > 1 ? 1 : 0];

function dateLongue() {
    const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function BilanSoirPage() {
    const [perfs, setPerfs] = useState<PerfBilan[] | null>(null);
    useEffect(() => { getBilanSoir().then(setPerfs).catch(() => setPerfs([])); }, []);

    if (!perfs) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    const equipe: Record<string, number> = {};
    perfs.forEach((p) => Object.entries(p.volumes).forEach(([c, n]) => { equipe[c] = (equipe[c] ?? 0) + n; }));
    const total = perfs.reduce((t, p) => t + p.actes, 0);
    const tuiles = [...CODES_ACTES_BILAN.filter((c) => (equipe[c] ?? 0) > 0), ...CODES_SUIVI_BILAN];
    const defis = perfs.filter((p) => p.defi);

    return (
        <div className="flex justify-center pb-10">
            <div className="w-full max-w-[560px] overflow-hidden rounded-[32px] bg-[#07060d] text-white shadow-2xl">
                {/* Équipe */}
                <div className="relative px-5 pb-6 pt-7 text-center sm:px-7">
                    <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/50 via-fuchsia-600/30 to-transparent blur-3xl" />
                    <p className="relative text-xs font-black uppercase tracking-[0.3em] text-violet-300">Bilan du soir · {dateLongue()}</p>
                    <p className="relative mt-4 text-8xl font-black leading-none tabular-nums">{total}</p>
                    <p className="relative mt-2 text-lg font-bold text-white/60">actes pour l&apos;équipe aujourd&apos;hui</p>
                    <div className="relative mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {tuiles.map((c) => (
                            <div key={c} className="rounded-2xl bg-white/[0.06] px-2 py-3 ring-1 ring-white/10">
                                <p className="text-xl">{EMOJI[c]}</p>
                                <p className="text-2xl font-black tabular-nums">{equipe[c] ?? 0}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{nomProduit(c, equipe[c] ?? 0)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Défis remportés : toujours félicités */}
                {defis.length > 0 && (
                    <div className="mx-5 rounded-2xl bg-gradient-to-r from-amber-400/20 to-orange-500/20 p-4 ring-1 ring-amber-300/30">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">🏆 Bravo !</p>
                        {defis.map((p) => (
                            <div key={p.id} className="mt-2 flex items-center gap-3">
                                <PhotoAvatar nom={p.nom} photoUrl={p.photo} size={44} />
                                <p className="text-sm text-white/90"><b className="text-white">{p.nom}</b> a relevé son défi du jour : <b className="text-amber-200">{p.defi}</b> 👏</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Performances individuelles (ordre alphabétique, pas de classement) */}
                <div className="px-5 pb-5 pt-5">
                    <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Performances individuelles</p>
                    {perfs.length === 0 ? (
                        <p className="px-2 text-sm text-white/50">Personne n&apos;est planifié aujourd&apos;hui.</p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {perfs.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10">
                                    <PhotoAvatar nom={p.nom} photoUrl={p.photo} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black">{p.nom}{p.defi && " 🏆"}</p>
                                        <p className="text-[11px] leading-snug text-white/50">
                                            {[...CODES_ACTES_BILAN, ...CODES_SUIVI_BILAN].filter((c) => (p.volumes[c] ?? 0) > 0).map((c) => `${EMOJI[c]}${p.volumes[c]}`).join("  ") || "—"}
                                        </p>
                                    </div>
                                    <p className="text-lg font-black tabular-nums">{p.actes}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="px-5 text-center text-base font-black text-white/85">Merci à tous, bonne soirée.</p>
                <p className="pb-5 pt-3 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-white/25">KPILOTE · Chaque vente compte</p>
            </div>
        </div>
    );
}
