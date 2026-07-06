"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE } from "@/utils/produits";
import CartoonAvatar from "@/components/avatar/CartoonAvatar";

type Entry = {
    id: string;
    conseiller_id: string;
    nom: string;
    produitNom: string;
    produitCode: string;
    created_at: string;
    isNew: boolean;
    message: string;
};

type Counts = Record<string, { total: number; byCode: Record<string, number> }>;

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h`;
}

function feedEmoji(code: string): string {
    return PRODUITS_ORDRE.find(p => p.code === code)?.emoji ?? "✅";
}
function produitLabel(code: string, nom: string): string {
    return PRODUITS_ORDRE.find(p => p.code === code)?.label ?? nom ?? code;
}

const ORDINALS = ["", "1ère", "2ème", "3ème", "4ème", "5ème", "6ème", "7ème", "8ème", "9ème", "10ème"];
function ord(n: number) { return ORDINALS[n] ?? `${n}ème`; }

// Deck shufflé par pool : chaque phrase est épuisée avant de recommencer
const _decks: Record<string, number[]> = {};
function pick<T>(poolKey: string, arr: T[]): T {
    if (!_decks[poolKey] || _decks[poolKey].length === 0) {
        const idx = Array.from({ length: arr.length }, (_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        _decks[poolKey] = idx;
    }
    return arr[_decks[poolKey].pop()!];
}

function computeRanks(counts: Counts): Record<string, number> {
    const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
    const ranks: Record<string, number> = {};
    sorted.forEach(([id], i) => { ranks[id] = i + 1; });
    return ranks;
}

function buildMessage(
    prenom: string,
    produitCode: string,
    produitNom: string,
    countToday: number,
    codeCountToday: number,
    rankAfter: number,
    rankBefore: number,
    genre?: string | null,
): string {
    const il = genre === "F" ? "elle" : genre === "H" ? "il" : "il/elle";
    const e = feedEmoji(produitCode);
    const label = produitLabel(produitCode, produitNom);

    if (rankAfter === 1 && rankBefore > 1) {
        return pick("rank1", [
            `${prenom} passe en tête du classement ! 👑`,
            `${prenom} s'empare de la 1ère place ! 🔝`,
            `${prenom} prend le leadership de la boutique ! 🏆`,
            `Renversement de situation — ${prenom} est 1er ! 🔥`,
            `${prenom} détrône tout le monde ! 🥇`,
            `La 1ère place change de mains — c'est ${prenom} ! 🏆`,
        ]);
    }

    if (rankBefore - rankAfter >= 2) {
        return pick("rankup", [
            `${prenom} remonte au classement ! ↑ ${rankAfter}ème désormais`,
            `${prenom} grimpe de ${rankBefore - rankAfter} places — belle série ! 🚀`,
            `${prenom} en mode rattrapage — ${rankAfter}ème place ! 💪`,
            `Attention, ${prenom} remonte ! ${rankAfter}ème au classement 📈`,
            `${prenom} reprend des places — ${rankAfter}ème ! 🔝`,
        ]);
    }

    if (countToday === 1) {
        return pick("first", [
            `${prenom} ouvre son compteur du jour ! ${e}`,
            `${prenom} démarre la journée — première vente au compteur ! ${e}`,
            `Premier point pour ${prenom} — c'est parti ! ${e}`,
            `${prenom} lance les hostilités ! ${e}`,
            `${prenom} est dans la place et ça commence fort ! ${e}`,
            `${prenom} ouvre le score aujourd'hui ! ${e}`,
            `La journée commence bien pour ${prenom} ! ${e}`,
            `${prenom} prend un bon départ ce matin ! ${e}`,
            `1-0 pour ${prenom} — la journée est lancée ! ${e}`,
            `${prenom} frappe en premier aujourd'hui ! ${e}`,
        ]);
    }

    if (countToday === 2) {
        return pick("double", [
            `Doublé pour ${prenom} aujourd'hui ! ${e}`,
            `${prenom} récidive — 2ème vente dans la journée ! ${e}`,
            `${prenom} ne lâche rien, 2 ventes au compteur ! ${e}`,
            `${prenom} confirme avec une 2ème vente — bonne dynamique ! ${e}`,
            `${prenom} enchaîne, 2-0 dans la journée ! ${e}`,
            `Deux ventes pour ${prenom} — ça roule ! ${e}`,
            `${prenom} tient son rythme — 2ème vente ! ${e}`,
        ]);
    }

    if (codeCountToday >= 3) {
        return pick("streak3", [
            `${prenom} enchaîne ${codeCountToday} ${label} aujourd'hui — machine ! ${e}`,
            `${codeCountToday} ${label} pour ${prenom} ce jour — incroyable ! ${e}`,
            `${prenom} est devenu expert ${label} aujourd'hui ! ${e}`,
            `${prenom} avec son ${codeCountToday}ème ${label} du jour — imparable ! ${e}`,
            `${label} x${codeCountToday} pour ${prenom} aujourd'hui ! ${e}`,
            `${prenom} adore le ${label} — ${codeCountToday} dans la journée ! ${e}`,
        ]);
    }

    if (codeCountToday === 2) {
        return pick("streak2", [
            `${prenom} remet ça avec un ${label} ! ${e}`,
            `2ème ${label} pour ${prenom} aujourd'hui — ça colle bien ! ${e}`,
            `${prenom} confirme sur le ${label}, 2 dans la journée ! ${e}`,
            `${label} x2 pour ${prenom} — ${il} maîtrise ! ${e}`,
            `${prenom} double la mise sur le ${label} ! ${e}`,
        ]);
    }

    if (countToday >= 6) {
        return pick("fire6", [
            `${prenom} est en feu — ${countToday} ventes aujourd'hui ! 🔥🔥`,
            `${prenom} n'arrête plus ! ${countToday} ventes au compteur ! 🔥`,
            `Journée XXL pour ${prenom} avec ${countToday} ventes ! 🚀`,
            `${prenom} cartonne — ${countToday} ventes ce jour ! 🏆`,
            `${countToday} ventes pour ${prenom} — légende de la journée ! 🔥`,
            `${prenom} déchire tout — ${countToday} ventes et ça continue ! 💥`,
        ]);
    }

    if (countToday >= 4) {
        return pick("fire4", [
            `${prenom} signe sa ${ord(countToday)} vente du jour — en feu ! 🔥`,
            `${prenom} enchaîne, ${countToday} ventes dans la journée ! 💪`,
            `${ord(countToday)} pour ${prenom} — la machine tourne ! ${e}`,
            `${prenom} continue sur sa lancée — ${countToday} ventes ! ${e}`,
            `${prenom} régale l'équipe — ${countToday} ventes aujourd'hui ! 💪`,
            `Série en cours pour ${prenom} — ${countToday} au compteur ! ${e}`,
        ]);
    }

    if (countToday === 3) {
        return pick("triple", [
            `${prenom} signe sa 3ème vente du jour ! ${e}`,
            `Triplé pour ${prenom} aujourd'hui ! ${e}`,
            `${prenom} enchaîne les ventes — 3 au compteur ! ${e}`,
            `Hat-trick pour ${prenom} ! ${e}`,
            `3 ventes pour ${prenom} — belle journée en vue ! ${e}`,
            `${prenom} à 3 ventes et ça sent bon ! ${e}`,
            `Le triplé pour ${prenom} — respect ! ${e}`,
        ]);
    }

    return pick("generic", [
        `${prenom} vient de signer un ${label} ! ${e}`,
        `Belle vente ${label} pour ${prenom} ! ${e}`,
        `${prenom} marque un point pour l'équipe ! ${e}`,
        `Vente validée pour ${prenom} — ${label} ! ${e}`,
        `${prenom} ajoute un ${label} à son tableau ! ${e}`,
        `${label} pour ${prenom} — ça avance ! ${e}`,
        `${prenom} fait bouger les compteurs ! ${e}`,
        `Nouvelle vente pour ${prenom} — ${label} dans la poche ! ${e}`,
    ]);
}

function extractProduit(v: any): { produitNom: string; produitCode: string } {
    const p = v.produits;
    if (!p) return { produitNom: "Produit", produitCode: "" };
    return { produitNom: p.nom ?? p.code ?? "Produit", produitCode: p.code ?? "" };
}

export default function TeamFeed({ conseillerId }: { conseillerId: string }) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [dbError, setDbError] = useState<string | null>(null);
    const namesRef  = useRef<Record<string, string>>({});
    const genresRef = useRef<Record<string, string | null>>({});
    const countsRef = useRef<Counts>({});
    const ranksRef  = useRef<Record<string, number>>({});

    useEffect(() => {
        const debut = new Date();
        debut.setHours(0, 0, 0, 0);

        Promise.all([
            supabase.from("conseillers").select("id, nom"),
            supabase
                .from("ventes")
                .select("id, conseiller_id, created_at, source, produits(nom, code)")
                .gte("created_at", debut.toISOString())
                .order("created_at", { ascending: false })
                .limit(50),
        ]).then(async ([resC, resV]) => {
            if (resV.error) {
                setDbError(`Erreur ventes: ${resV.error.message} (${resV.error.code})`);
                return;
            }

            const map: Record<string, string> = {};
            (resC.data ?? []).forEach((c: any) => { map[c.id] = c.nom; });
            namesRef.current = map;

            // Fetch genre séparément — résistant si la colonne n'existe pas encore
            const gmap: Record<string, string | null> = {};
            const resG = await supabase.from("conseillers").select("id, genre");
            if (!resG.error && resG.data) {
                resG.data.forEach((c: any) => { gmap[c.id] = c.genre ?? null; });
            }
            genresRef.current = gmap;

            const rawVentes = (resV.data ?? []).filter((v: any) => v.source !== "cerebro_check");

            // Retracer chronologiquement pour le contexte cumulatif
            const ventesAsc = [...rawVentes].reverse();
            const tempCounts: Counts = {};
            const tempRanks: Record<string, number> = {};
            const built: Entry[] = [];

            const nbConseillers = Object.keys(map).length;

            ventesAsc.forEach((v: any) => {
                const cid = v.conseiller_id;
                const { produitNom, produitCode } = extractProduit(v);
                const rankBefore = tempRanks[cid] ?? nbConseillers;

                if (!tempCounts[cid]) tempCounts[cid] = { total: 0, byCode: {} };
                tempCounts[cid].total++;
                tempCounts[cid].byCode[produitCode] = (tempCounts[cid].byCode[produitCode] ?? 0) + 1;

                const newRanks = computeRanks(tempCounts);
                Object.assign(tempRanks, newRanks);
                const rankAfter = newRanks[cid] ?? 1;

                const nom = map[cid] ?? "Équipe";
                built.push({
                    id: v.id,
                    conseiller_id: cid,
                    nom,
                    produitNom,
                    produitCode,
                    created_at: v.created_at,
                    isNew: false,
                    message: buildMessage(
                        nom.split(" ")[0],
                        produitCode,
                        produitNom,
                        tempCounts[cid].total,
                        tempCounts[cid].byCode[produitCode],
                        rankAfter,
                        rankBefore,
                        gmap[cid],
                    ),
                });
            });

            countsRef.current = tempCounts;
            ranksRef.current = computeRanks(tempCounts);

            setEntries(built.reverse().slice(0, 15));
        });
    }, []);

    // Realtime : nouvelles ventes en direct
    useEffect(() => {
        const channel = supabase
            .channel("team-feed-rt")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, (payload: any) => {
                const v = payload.new;
                if (v.source === "cerebro_check") return;

                const cid = v.conseiller_id;
                const nbTotal = Object.keys(namesRef.current).length;
                const rankBefore = ranksRef.current[cid] ?? nbTotal;

                // Le Realtime ne retourne pas les jointures — on utilise produit_id comme code de secours
                const produitCode = v.produit_code ?? "";
                const produitNom = v.produit_nom ?? produitCode;

                if (!countsRef.current[cid]) countsRef.current[cid] = { total: 0, byCode: {} };
                countsRef.current[cid].total++;
                countsRef.current[cid].byCode[produitCode] = (countsRef.current[cid].byCode[produitCode] ?? 0) + 1;

                ranksRef.current = computeRanks(countsRef.current);
                const rankAfter = ranksRef.current[cid] ?? 1;

                const nom = namesRef.current[cid] ?? "Équipe";
                const entry: Entry = {
                    id: v.id,
                    conseiller_id: cid,
                    nom,
                    produitNom,
                    produitCode,
                    created_at: v.created_at,
                    isNew: true,
                    message: buildMessage(
                        nom.split(" ")[0],
                        produitCode,
                        produitNom,
                        countsRef.current[cid].total,
                        countsRef.current[cid].byCode[produitCode],
                        rankAfter,
                        rankBefore,
                        genresRef.current[cid],
                    ),
                };
                setEntries(prev => [entry, ...prev].slice(0, 15));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-xl">⚡</div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Live</p>
                    <p className="text-sm font-black text-slate-900">Ventes équipe</p>
                </div>
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {dbError ? (
                <p className="py-4 rounded-xl bg-red-50 px-4 text-xs text-red-500 font-mono break-all">{dbError}</p>
            ) : entries.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-300">
                    Pas encore de vente aujourd'hui — soyez le premier ! 🚀
                </p>
            ) : (
                <>
                    <div
                        className="space-y-2 overflow-y-auto pr-1"
                        style={{ maxHeight: "calc(5 * 62px + 4 * 8px)" }}
                    >
                        {entries.map((e) => {
                            const isMoi = e.conseiller_id === conseillerId;
                            return (
                                <div
                                    key={e.id}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                                        isMoi ? "bg-violet-50 border border-violet-100" : "bg-slate-50"
                                    } ${e.isNew ? "animate-feedIn" : ""}`}
                                >
                                    <CartoonAvatar prenom={e.nom} etat="souriant_main" size={34} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                                            {e.message}
                                            {isMoi && <span className="ml-1.5 text-[10px] font-bold text-violet-500">(toi)</span>}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="text-xs font-black text-green-600">+1</p>
                                        <p className="text-[10px] text-slate-300">{timeAgo(e.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {entries.length > 5 && (
                        <p className="mt-3 text-center text-[10px] text-slate-300">
                            {entries.length} ventes aujourd'hui · défiler pour tout voir
                        </p>
                    )}
                </>
            )}

            <style>{`
                @keyframes feedIn {
                    from { opacity: 0; transform: translateY(-12px) scale(.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-feedIn { animation: feedIn .4s cubic-bezier(.34,1.56,.64,1); }
            `}</style>
        </div>
    );
}
