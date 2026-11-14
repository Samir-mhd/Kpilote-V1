"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUITS_ORDRE, PRODUITS_HORS_ACTES, type ProduitCode } from "@/utils/produits";
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
    quantite: number;
    countToday: number;   // ventes du conseiller aujourd'hui, celle-ci incluse
    rankBefore: number;
    rankAfter: number;
    reset: boolean;       // correction du jour (pas une vente)
};

type Counts = Record<string, { total: number }>;

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

// Priorité au nombre réalisé (countToday) : le message reflète toujours l'ampleur réelle de
// la journée, jamais éclipsé par une répétition sur un même produit.
function buildMessage(
    prenom: string,
    produitCode: string,
    produitNom: string,
    countToday: number,
    rankAfter: number,
    rankBefore: number,
    genre?: string | null,
): string {
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

    if (countToday >= 4 && countToday < 6) {
        return pick("fire4", [
            `${prenom} signe sa ${ord(countToday)} vente du jour — en feu ! 🔥`,
            `${prenom} enchaîne, ${countToday} ventes dans la journée ! 💪`,
            `${ord(countToday)} pour ${prenom} — la machine tourne ! ${e}`,
            `${prenom} continue sur sa lancée — ${countToday} ventes ! ${e}`,
            `${prenom} régale l'équipe — ${countToday} ventes aujourd'hui ! 💪`,
            `Série en cours pour ${prenom} — ${countToday} au compteur ! ${e}`,
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

export default function TeamFeed({ conseillerId, grand = false, condense = false }: { conseillerId: string; grand?: boolean; condense?: boolean }) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [dbError, setDbError] = useState<string | null>(null);
    const namesRef    = useRef<Record<string, string>>({});
    const countsRef   = useRef<Counts>({});
    const ranksRef    = useRef<Record<string, number>>({});
    const produitsRef = useRef<Record<string, string>>({}); // produit_id -> code (pour le realtime, sans jointure)
    const actifsRef   = useRef<Record<string, boolean>>({}); // conseiller_id -> profil actif (profil désactivé = invisible du feed)

    useEffect(() => {
        const debut = new Date();
        debut.setHours(0, 0, 0, 0);

        (async () => {
            const [resC, resV, resP] = await Promise.all([
                supabase.from("conseillers").select("id, nom, profil_actif"),
                supabase
                    .from("ventes")
                    .select("id, conseiller_id, created_at, source, quantite, produit_id, produits(nom, code)")
                    .gte("created_at", debut.toISOString())
                    .order("created_at", { ascending: false })
                    .limit(50),
                supabase.from("produits").select("id, code"),
            ]);

            const pmap: Record<string, string> = {};
            (resP.data ?? []).forEach((p: any) => { pmap[p.id] = p.code; });
            produitsRef.current = pmap;

            if (resV.error) {
                setDbError(`Erreur ventes: ${resV.error.message} (${resV.error.code})`);
                return;
            }

            const map: Record<string, string> = {};
            const amap: Record<string, boolean> = {};
            (resC.data ?? []).forEach((c: any) => {
                amap[c.id] = c.profil_actif !== false;
                if (c.profil_actif === false) return; // profil désactivé = invisible du feed
                map[c.id] = c.nom;
            });
            namesRef.current = map;
            actifsRef.current = amap;

            // Spiderhome/Avis Google/Récap Co = pas des actes commerciaux, profil désactivé = restreint → exclus du feed (comme partout ailleurs)
            const rawVentes = (resV.data ?? []).filter((v: any) =>
                v.source !== "cerebro_check"
                && !PRODUITS_HORS_ACTES.includes(extractProduit(v).produitCode as ProduitCode)
                && amap[v.conseiller_id] !== false
            );

            // Retracer chronologiquement pour le contexte cumulatif
            const ventesAsc = [...rawVentes].reverse();
            const tempCounts: Counts = {};
            const tempRanks: Record<string, number> = {};
            const netTotaux: Record<string, number> = {}; // clé "conseillerId|produitCode" → total net du jour
            const built: Entry[] = [];

            const nbConseillers = Object.keys(map).length;

            ventesAsc.forEach((v: any) => {
                const cid = v.conseiller_id;
                const { produitNom, produitCode } = extractProduit(v);
                const nom = map[cid] ?? "Équipe";
                const netKey = `${cid}|${produitCode}`;
                netTotaux[netKey] = (netTotaux[netKey] ?? 0) + (v.quantite ?? 1);

                // Correction du jour (carte remise à niveau) : un seul message avec le total, pas de streak
                if (v.source === "reset_jour") {
                    built.push({
                        id: v.id,
                        conseiller_id: cid,
                        nom,
                        produitNom,
                        produitCode,
                        created_at: v.created_at,
                        isNew: false,
                        quantite: v.quantite ?? 1, countToday: 0, rankBefore: 0, rankAfter: 0, reset: true,
                        message: `${nom.split(" ")[0]} vient de réajuster ses ventes sur ${produitLabel(produitCode, produitNom)} - ${netTotaux[netKey]} au total`,
                    });
                    return;
                }

                const rankBefore = tempRanks[cid] ?? nbConseillers;

                if (!tempCounts[cid]) tempCounts[cid] = { total: 0 };
                tempCounts[cid].total++;

                const newRanks = computeRanks(tempCounts);
                Object.assign(tempRanks, newRanks);
                const rankAfter = newRanks[cid] ?? 1;

                built.push({
                    id: v.id,
                    conseiller_id: cid,
                    nom,
                    produitNom,
                    produitCode,
                    created_at: v.created_at,
                    isNew: false,
                    quantite: v.quantite ?? 1,
                    countToday: tempCounts[cid].total,
                    rankBefore,
                    rankAfter,
                    reset: false,
                    message: buildMessage(
                        nom.split(" ")[0],
                        produitCode,
                        produitNom,
                        tempCounts[cid].total,
                        rankAfter,
                        rankBefore,
                    ),
                });
            });

            countsRef.current = tempCounts;
            ranksRef.current = computeRanks(tempCounts);

            setEntries(built.reverse().slice(0, 50));
        })();
    }, []);

    // Realtime : nouvelles ventes en direct
    useEffect(() => {
        const channel = supabase
            .channel("team-feed-rt")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, async (payload: any) => {
                const v = payload.new;
                if (v.source === "cerebro_check") return;
                if (PRODUITS_HORS_ACTES.includes(produitsRef.current[v.produit_id] as ProduitCode)) return;
                if (actifsRef.current[v.conseiller_id] === false) return;

                const cid = v.conseiller_id;
                const nom = namesRef.current[cid] ?? "Équipe";

                // Correction du jour : un seul message avec le nouveau total, pas de streak/rank
                if (v.source === "reset_jour") {
                    const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
                    const [{ data: produit }, { data: lignes }] = await Promise.all([
                        supabase.from("produits").select("nom, code").eq("id", v.produit_id).maybeSingle(),
                        supabase.from("ventes").select("quantite")
                            .eq("conseiller_id", cid).eq("produit_id", v.produit_id)
                            .gte("created_at", debutJour.toISOString()),
                    ]);
                    const total = (lignes ?? []).reduce((t: number, r: any) => t + (r.quantite ?? 1), 0);
                    const produitCode = produit?.code ?? "";
                    const entry: Entry = {
                        id: v.id,
                        conseiller_id: cid,
                        nom,
                        produitNom: produit?.nom ?? "",
                        produitCode,
                        created_at: v.created_at,
                        isNew: true,
                        quantite: v.quantite ?? 1, countToday: 0, rankBefore: 0, rankAfter: 0, reset: true,
                        message: `${nom.split(" ")[0]} vient de réajuster ses ventes sur ${produitLabel(produitCode, produit?.nom ?? "")} - ${total} au total`,
                    };
                    setEntries(prev => [entry, ...prev].slice(0, 50));
                    return;
                }

                const nbTotal = Object.keys(namesRef.current).length;
                const rankBefore = ranksRef.current[cid] ?? nbTotal;

                // Le Realtime ne retourne pas les jointures — on utilise produit_id comme code de secours
                const produitCode = produitsRef.current[v.produit_id] ?? v.produit_code ?? "";
                const produitNom = produitLabel(produitCode, v.produit_nom ?? produitCode);

                if (!countsRef.current[cid]) countsRef.current[cid] = { total: 0 };
                countsRef.current[cid].total++;

                ranksRef.current = computeRanks(countsRef.current);
                const rankAfter = ranksRef.current[cid] ?? 1;

                const entry: Entry = {
                    id: v.id,
                    conseiller_id: cid,
                    nom,
                    produitNom,
                    produitCode,
                    created_at: v.created_at,
                    isNew: true,
                    quantite: v.quantite ?? 1,
                    countToday: countsRef.current[cid].total,
                    rankBefore,
                    rankAfter,
                    reset: false,
                    message: buildMessage(
                        nom.split(" ")[0],
                        produitCode,
                        produitNom,
                        countsRef.current[cid].total,
                        rankAfter,
                        rankBefore,
                    ),
                };
                setEntries(prev => [entry, ...prev].slice(0, 50));
            })
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "ventes" }, (payload: any) => {
                const oldId = payload.old?.id;
                if (!oldId) return;
                setEntries(prev => prev.filter(e => e.id !== oldId));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (condense) return <FeedCondense entries={entries} conseillerId={conseillerId} dbError={dbError} />;

    const visibleRows = grand ? 10 : 5;
    const rowHeight = grand ? 78 : 62;

    return (
        <div className={`rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)] ${grand ? "p-8" : "p-6"}`}>
            <div className={`flex items-center gap-3 ${grand ? "mb-6" : "mb-5"}`}>
                <div className={`flex items-center justify-center rounded-2xl bg-violet-50 ${grand ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl"}`}>⚡</div>
                <div className="flex-1">
                    <p className={`font-bold uppercase tracking-[0.3em] text-slate-400 ${grand ? "text-xs" : "text-[10px]"}`}>Live</p>
                    <p className={`font-black text-slate-900 ${grand ? "text-2xl" : "text-sm"}`}>Ventes équipe</p>
                </div>
                <span className={`inline-flex rounded-full bg-green-500 animate-pulse ${grand ? "h-3 w-3" : "h-2 w-2"}`} />
            </div>

            {dbError ? (
                <p className="py-4 rounded-xl bg-red-50 px-4 text-xs text-red-500 font-mono break-all">{dbError}</p>
            ) : entries.length === 0 ? (
                <p className={`text-center text-slate-300 ${grand ? "py-12 text-base" : "py-6 text-sm"}`}>
                    Pas encore de vente aujourd'hui — soyez le premier ! 🚀
                </p>
            ) : (
                <>
                    <div
                        className="space-y-2 overflow-y-auto pr-1"
                        style={{ maxHeight: `calc(${visibleRows} * ${rowHeight}px + ${visibleRows - 1} * 8px)` }}
                    >
                        {entries.map((e) => {
                            const isMoi = e.conseiller_id === conseillerId;
                            return (
                                <div
                                    key={e.id}
                                    className={`flex items-center gap-3 rounded-2xl transition-all ${grand ? "px-5 py-4" : "px-4 py-3"} ${
                                        isMoi ? "bg-violet-50 border border-violet-100" : "bg-slate-50"
                                    } ${e.isNew ? "animate-feedIn" : ""}`}
                                >
                                    <CartoonAvatar prenom={e.nom} etat="souriant_main" size={grand ? 46 : 34} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-slate-900 leading-snug ${grand ? "text-base" : "text-sm"}`}>
                                            {e.message}
                                            {isMoi && <span className="ml-1.5 text-[10px] font-bold text-violet-500">(toi)</span>}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className={`font-black text-green-600 ${grand ? "text-sm" : "text-xs"}`}>+1</p>
                                        <p className={`text-slate-300 ${grand ? "text-xs" : "text-[10px]"}`}>{timeAgo(e.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {entries.length > visibleRows && (
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

// ─── Mode condensé (variante Accueil layout=v2) ───────────────────────────────
// Les ventes rapprochées d'un même conseiller sont regroupées en une seule ligne, et seuls les
// vrais moments ressortent : 1re vente du jour, passage en tête, paliers 5 / 10 / 15...

const FENETRE_GROUPE_MS = 30 * 60 * 1000;
const PALIERS = [5, 10, 15, 20, 25, 30];

type Groupe = {
    id: string;
    conseiller_id: string;
    nom: string;
    codes: string[];          // produits vendus dans le groupe (ordre chronologique)
    total: number;            // ventes du groupe
    countToday: number;       // ventes du jour à la fin du groupe
    debut: string;            // plus ancienne vente du groupe
    fin: string;              // plus récente
    passeEnTete: boolean;
    palier: number | null;
    premiere: boolean;
    reset: Entry | null;
    isNew: boolean;
};

function grouper(entries: Entry[]): Groupe[] {
    const groupes: Groupe[] = [];
    // entries : plus récente en premier
    for (const e of entries) {
        if (e.reset) {
            groupes.push({
                id: e.id, conseiller_id: e.conseiller_id, nom: e.nom, codes: [e.produitCode], total: 0,
                countToday: 0, debut: e.created_at, fin: e.created_at, passeEnTete: false, palier: null,
                premiere: false, reset: e, isNew: e.isNew,
            });
            continue;
        }
        const g = groupes[groupes.length - 1];
        const memeSerie = g && !g.reset && g.conseiller_id === e.conseiller_id
            && new Date(g.debut).getTime() - new Date(e.created_at).getTime() <= FENETRE_GROUPE_MS;
        const palierAtteint = PALIERS.filter((p) => e.countToday >= p && e.countToday - e.quantite < p).pop() ?? null;
        if (memeSerie) {
            g.codes.unshift(e.produitCode);
            g.total += e.quantite;
            g.debut = e.created_at;
            g.passeEnTete ||= e.rankAfter === 1 && e.rankBefore > 1;
            g.palier = Math.max(g.palier ?? 0, palierAtteint ?? 0) || null;
            g.premiere ||= e.countToday === 1;
            g.isNew ||= e.isNew;
        } else {
            groupes.push({
                id: e.id, conseiller_id: e.conseiller_id, nom: e.nom, codes: [e.produitCode], total: e.quantite,
                countToday: e.countToday, debut: e.created_at, fin: e.created_at,
                passeEnTete: e.rankAfter === 1 && e.rankBefore > 1, palier: palierAtteint,
                premiere: e.countToday === 1, reset: null, isNew: e.isNew,
            });
        }
    }
    return groupes;
}

function messageGroupe(g: Groupe): { texte: string; temps_fort: boolean } {
    const p = g.nom.split(" ")[0];
    if (g.reset) return { texte: g.reset.message, temps_fort: false };
    if (g.passeEnTete) return { texte: `${p} passe en tête du classement 👑`, temps_fort: true };
    if (g.palier) return { texte: `${p} atteint ${g.palier} ventes aujourd'hui 🔥`, temps_fort: true };
    if (g.premiere) {
        return g.total > 1
            ? { texte: `${p} démarre fort : ${g.total} ventes d'entrée`, temps_fort: false }
            : { texte: `${p} ouvre son compteur du jour`, temps_fort: false };
    }
    if (g.total > 1) return { texte: `${p} enchaîne ${g.total} ventes`, temps_fort: false };
    const code = g.codes[0];
    const singulier: Record<string, string> = { "Téléphones": "Téléphone", "Forfaits": "Forfait" };
    const label = produitLabel(code, code);
    return { texte: `${p} signe : ${singulier[label] ?? label}`, temps_fort: false };
}

function FeedCondense({ entries, conseillerId, dbError }: { entries: Entry[]; conseillerId: string; dbError: string | null }) {
    const groupes = grouper(entries);
    const nbVentes = entries.filter((e) => !e.reset).reduce((t, e) => t + e.quantite, 0);

    return (
        <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <div className="mb-4 flex items-center gap-2.5">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <p className="flex-1 text-sm font-black text-slate-900">En direct de l&apos;équipe</p>
                {nbVentes > 0 && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                        {nbVentes} vente{nbVentes > 1 ? "s" : ""} récentes
                    </span>
                )}
            </div>

            {dbError ? (
                <p className="rounded-xl bg-red-50 px-4 py-4 font-mono text-xs break-all text-red-500">{dbError}</p>
            ) : groupes.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-300">Pas encore de vente aujourd&apos;hui — à toi d&apos;ouvrir le bal ! 🚀</p>
            ) : (
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {groupes.map((g) => {
                        const isMoi = g.conseiller_id === conseillerId;
                        const { texte, temps_fort } = messageGroupe(g);
                        return (
                            <div
                                key={g.id}
                                className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 ${
                                    temps_fort ? "bg-gradient-to-r from-amber-50 to-orange-50 ring-1 ring-amber-200"
                                    : isMoi ? "bg-violet-50 ring-1 ring-violet-100"
                                    : "bg-slate-50"
                                } ${g.isNew ? "animate-feedIn" : ""}`}
                            >
                                <CartoonAvatar prenom={g.nom} etat={temps_fort ? "en_feu" : "souriant_main"} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold leading-snug text-slate-900">
                                        {texte}
                                        {isMoi && <span className="ml-1.5 text-[10px] font-bold text-violet-500">(toi)</span>}
                                    </p>
                                    {!g.reset && (
                                        <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                                            <span className="tracking-tight">{g.codes.map((c) => feedEmoji(c)).join(" ")}</span>
                                            <span>· {g.countToday} aujourd&apos;hui</span>
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    {!g.reset && <p className="text-xs font-black text-green-600">+{g.total}</p>}
                                    <p className="text-[10px] text-slate-300">{timeAgo(g.fin)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
