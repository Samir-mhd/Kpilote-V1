"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUITS_CLASSEMENT } from "@/utils/produits";
import { Periode, PERIODE_LABELS, periodeSemaineEffective, joursPeriode } from "@/utils/periodes";
import { construireClassementPeriode, ConseillerStats } from "@/services/classementService";
import { construireClassementTrophees, ConseillerTrophees } from "@/services/badgesManagerService";
import { getObjectifsSemaineFiges } from "@/services/objectifsSemaineFiges";
import { getJoursTravailPlageTous } from "@/services/planningService";
import type { ProduitCode } from "@/utils/produits";
import { getPhotosByIds } from "@/services/photoService";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import ClassementCourse from "@/components/classement/ClassementCourse";
import PodiumsThematiques from "@/components/classement/PodiumsThematiques";
import { supabase } from "@/lib/supabase";
import { getRealiseVentesComboParConseiller, getObjectifsComboParConseiller, RealiseVentesCombo } from "@/services/variableConseiller";
import { GROUPES, GroupeId, ComboCode } from "@/utils/classementGroupes";

const medals = ["🥇", "🥈", "🥉"];
const COMBO_VIDE: RealiseVentesCombo = { mcafee_mobile: 0, assurance_essentielle: 0, canal_plus: 0 };
const ONGLETS: { id: Periode | "trophees"; label: string }[] = [
    { id: "jour", label: PERIODE_LABELS.jour },
    { id: "semaine", label: PERIODE_LABELS.semaine },
    { id: "mois", label: PERIODE_LABELS.mois },
    { id: "trophees", label: "🏆 Trophées" },
];

function ClassementInner() {
    const searchParams  = useSearchParams();
    const conseillerId  = searchParams.get("id") ?? "";

    const [periode, setPeriode]             = useState<Periode>(() => (["jour", "semaine", "mois"].includes(searchParams.get("periode") ?? "") ? searchParams.get("periode") as Periode : "mois"));
    const [classement, setClassement]       = useState<ConseillerStats[]>([]);
    const [moisMap, setMoisMap]             = useState(new Map<string, ConseillerStats>());
    const [semaineMap, setSemaineMap]       = useState(new Map<string, ConseillerStats>());
    const [objSemaine, setObjSemaine]       = useState<Record<string, Record<ProduitCode, number>>>({});
    const [joursRestantsSemaine, setJoursRestantsSemaine] = useState<Record<string, number>>({});
    const [planifieAujourdhui, setPlanifieAujourdhui] = useState<Record<string, number>>({});
    const [photos, setPhotos]               = useState<Record<string, string | null>>({});
    const [loading, setLoading]             = useState(true);
    const [maj, setMaj]                     = useState("");

    const [ongletTrophees, setOngletTrophees] = useState(false);
    // Onglet "Podiums" : plusieurs podiums thématiques.
    const [ongletPodiums, setOngletPodiums]   = useState(() => searchParams.get("onglet") === "podiums");
    const onglets: { id: Periode | "trophees" | "podiums"; label: string }[] = [...ONGLETS.slice(0, 3), { id: "podiums", label: "🏅 Podiums" }, ...ONGLETS.slice(3)];
    const [trophees, setTrophees]             = useState<ConseillerTrophees[]>([]);
    const [photosTrophees, setPhotosTrophees] = useState<Record<string, string | null>>({});
    const [loadingTrophees, setLoadingTrophees] = useState(true);

    const [groupe, setGroupe]                     = useState<GroupeId>(() => (["core", "upsell", "quali"].includes(searchParams.get("groupe") ?? "") ? searchParams.get("groupe") as GroupeId : "core"));
    const [comboPeriode, setComboPeriode]         = useState<Record<string, RealiseVentesCombo>>({});
    const [comboSemaine, setComboSemaine]         = useState<Record<string, RealiseVentesCombo>>({});
    const [comboObjectifsMensuels, setComboObjectifsMensuels] = useState<Record<string, RealiseVentesCombo>>({});

    async function charger(p: Periode, opts?: { silencieux?: boolean }) {
        if (!opts?.silencieux) setLoading(true);
        try {
            const fetches = p === "mois"
                ? [construireClassementPeriode("mois"), Promise.resolve([] as ConseillerStats[])]
                : [construireClassementPeriode(p), construireClassementPeriode("mois")];

            const { debut: pDebut, fin: pFin } = joursPeriode(p);
            const [data, moisData, comboP, comboObj] = await Promise.all([
                ...fetches,
                getRealiseVentesComboParConseiller(pDebut, pFin),
                getObjectifsComboParConseiller(),
            ]) as [ConseillerStats[], ConseillerStats[], Record<string, RealiseVentesCombo>, Record<string, RealiseVentesCombo>];
            setClassement(data);
            setMoisMap(new Map((p === "mois" ? data : moisData).map(c => [c.id, c])));
            setComboPeriode(comboP);
            setComboObjectifsMensuels(comboObj);
            setMaj(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
            const ids = data.map(c => c.id);
            const avs = await getPhotosByIds(ids).catch(() => ({}));
            setPhotos(avs);

            // "semaine" et "jour" ont tous les deux besoin de l'objectif semaine figé (le jour s'y recale)
            if (p === "semaine" || p === "jour") {
                const { debut, fin } = periodeSemaineEffective();
                const figes = await getObjectifsSemaineFiges(ids, debut, fin).catch(() => ({}));
                setObjSemaine(figes);
            }

            // "jour" a en plus besoin du cumul de la semaine (avant aujourd'hui) et des jours
            // planifiés restants de la semaine, selon le planning réel de chaque conseiller
            if (p === "jour") {
                const { fin } = periodeSemaineEffective();
                const { debut: semDebutStr, fin: semFinStr } = joursPeriode("semaine");
                const [semaineData, joursRestants, comboSem, aujourdhui] = await Promise.all([
                    construireClassementPeriode("semaine").catch(() => [] as ConseillerStats[]),
                    getJoursTravailPlageTous(ids, new Date(), fin).catch(() => ({})),
                    getRealiseVentesComboParConseiller(semDebutStr, semFinStr).catch(() => ({} as Record<string, RealiseVentesCombo>)),
                    getJoursTravailPlageTous(ids, new Date(), new Date()).catch(() => ({} as Record<string, number>)),
                ]);
                setSemaineMap(new Map(semaineData.map(c => [c.id, c])));
                setJoursRestantsSemaine(joursRestants);
                setPlanifieAujourdhui(aujourdhui);
                setComboSemaine(comboSem);
            }
        } catch {}
        finally { if (!opts?.silencieux) setLoading(false); }
    }

    useEffect(() => {
        charger(periode);

        // Realtime : rafraîchit le classement à chaque nouvelle vente
        const channel = supabase
            .channel(`classement-conseiller-${periode}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ventes" }, () => {
                charger(periode, { silencieux: true });
            })
            .subscribe();

        // Filet de sécurité : si le canal live décroche (perte réseau, onglet resté ouvert
        // longtemps...), on ne reste jamais bloqué plus d'une minute sur un total périmé
        const interval = setInterval(() => charger(periode, { silencieux: true }), 60_000);

        return () => { supabase.removeChannel(channel); clearInterval(interval); };
    }, [periode]);

    // Trophées : lecture seule (conseiller_badges déjà débloqués), chargé une fois au montage
    // pour que le passage sur l'onglet soit instantané. Rafraîchi aussi sur nouveau badge.
    useEffect(() => {
        function chargerTrophees(opts?: { silencieux?: boolean }) {
            if (!opts?.silencieux) setLoadingTrophees(true);
            construireClassementTrophees()
                .then(async (data) => {
                    setTrophees(data);
                    const ids = data.map(c => c.id);
                    setPhotosTrophees(await getPhotosByIds(ids).catch(() => ({})));
                })
                .catch(() => {})
                .finally(() => { if (!opts?.silencieux) setLoadingTrophees(false); });
        }
        chargerTrophees();

        const channel = supabase
            .channel("classement-trophees")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "conseiller_badges" }, () => {
                chargerTrophees({ silencieux: true });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Objectif par conseiller × produit :
    // - "mois"    : fixé par le manager
    // - "semaine" : figé au premier calcul de la semaine (reste à faire du mois ÷ jours planifiés
    //               restants du mois × jours planifiés de la semaine), ne change plus ensuite
    // - "jour"    : dynamique, recalé sur l'objectif SEMAINE figé (jamais sur le mois) — reste à
    //               faire de la semaine ÷ jours planifiés restants de la semaine
    function getObjDynamic(c: ConseillerStats, key: ProduitCode): number {
        const objMois   = c.objectifs[key] ?? 0;
        if (periode === "mois") return objMois;
        if (periode === "semaine") return objSemaine[c.id]?.[key] ?? 0;
        // Pas planifié aujourd'hui (off, formation, congés...) : rien à faire aujourd'hui, le reste
        // de la semaine se répartit sur ses prochains jours planifiés.
        if (planifieAujourdhui[c.id] === 0) return 0;

        const objSemaineFixe = objSemaine[c.id]?.[key] ?? 0;
        const semaineStats   = semaineMap.get(c.id);
        const realiseSemaine = semaineStats?.produits[key] ?? 0;
        const realiseAujourdhui = c.produits[key] ?? 0;
        const realiseAvantAujourdhui = Math.max(realiseSemaine - realiseAujourdhui, 0);
        const reste = Math.max(objSemaineFixe - realiseAvantAujourdhui, 0);
        const joursRestants = joursRestantsSemaine[c.id] ?? 0;
        return joursRestants > 0 ? Math.ceil(reste / joursRestants) : reste;
    }

    // Même cascade que getObjDynamic, pour les 3 items "ventes combo" (McAfee Mobile, Assurance
    // essentielle, Canal+) dont le réalisé/objectif vient de variable_actes_jour.
    function objSemaineCombo(conseillerId: string, code: ComboCode): number {
        const figes = objSemaine[conseillerId] as unknown as Record<string, number> | undefined;
        return figes?.[code] ?? 0;
    }

    function getObjDynamicCombo(conseillerId: string, code: ComboCode): number {
        if (periode === "mois") return comboObjectifsMensuels[conseillerId]?.[code] ?? 0;
        if (periode === "semaine") return objSemaineCombo(conseillerId, code);
        if (planifieAujourdhui[conseillerId] === 0) return 0;

        const objSemaineFixe = objSemaineCombo(conseillerId, code);
        const realiseSemaine = comboSemaine[conseillerId]?.[code] ?? 0;
        const realiseAujourdhui = comboPeriode[conseillerId]?.[code] ?? 0;
        const realiseAvantAujourdhui = Math.max(realiseSemaine - realiseAujourdhui, 0);
        const reste = Math.max(objSemaineFixe - realiseAvantAujourdhui, 0);
        const joursRestants = joursRestantsSemaine[conseillerId] ?? 0;
        return joursRestants > 0 ? Math.ceil(reste / joursRestants) : reste;
    }

    const monRang = classement.findIndex(c => c.id === conseillerId) + 1;
    const monRangTrophees = trophees.findIndex(c => c.id === conseillerId) + 1;

    const groupeActif = GROUPES.find((g) => g.id === groupe) ?? GROUPES[0];

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600">Classement</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-900">Performance équipe</h1>
                    {maj && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Mis à jour à {maj}
                        </p>
                    )}
                </div>
                {ongletTrophees
                    ? monRangTrophees > 0 && (
                        <div className="rounded-2xl bg-amber-50 px-5 py-3 text-center">
                            <p className="text-xs font-bold text-amber-600">Ma position</p>
                            <p className="text-2xl font-black text-amber-700">#{monRangTrophees}</p>
                        </div>
                    )
                    : monRang > 0 && (
                        <div className="rounded-2xl bg-green-50 px-5 py-3 text-center">
                            <p className="text-xs font-bold text-green-600">Ma position</p>
                            <p className="text-2xl font-black text-green-700">#{monRang}</p>
                        </div>
                    )}
            </div>

            {/* Onglets + groupe de produits */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {onglets.map(o => {
                        const actif = o.id === "trophees" ? ongletTrophees
                            : o.id === "podiums" ? ongletPodiums
                            : (!ongletTrophees && !ongletPodiums && periode === o.id);
                        return (
                            <button
                                key={o.id}
                                onClick={() => {
                                    if (o.id === "trophees") { setOngletTrophees(true); setOngletPodiums(false); }
                                    else if (o.id === "podiums") { setOngletPodiums(true); setOngletTrophees(false); }
                                    else { setOngletTrophees(false); setOngletPodiums(false); setPeriode(o.id); }
                                }}
                                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
                                    actif
                                        ? o.id === "trophees" || o.id === "podiums" ? "bg-amber-500 text-white" : "bg-slate-900 text-white"
                                        : "bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                                }`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
                {!ongletTrophees && !ongletPodiums && (
                    <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm">
                        {GROUPES.map((g) => (
                            <button
                                key={g.id}
                                onClick={() => setGroupe(g.id)}
                                className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                                    groupe === g.id ? "bg-green-600 text-white shadow" : "text-slate-400 hover:bg-slate-50"
                                }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {ongletPodiums ? (
                <PodiumsThematiques conseillerId={conseillerId} />
            ) : ongletTrophees ? (
                loadingTrophees ? (
                    <div className="flex h-48 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_4px_24px_rgba(15,23,42,.07)]">
                        <div className="px-7 pt-7 pb-3">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">🏆 Classement trophées</p>
                        </div>
                        <div className="space-y-1.5 px-3 pb-5">
                            {trophees.map((c, idx) => {
                                const isMoi = c.id === conseillerId;
                                return (
                                    <div
                                        key={c.id}
                                        className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
                                            isMoi ? "bg-amber-50" : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="w-6 shrink-0 text-center">
                                            {idx < 3 ? <span className="text-xl">{medals[idx]}</span> : <span className="text-sm font-black text-slate-400">{idx + 1}</span>}
                                        </span>
                                        <div className="overflow-hidden rounded-full shrink-0">
                                            <PhotoAvatar nom={c.nom} photoUrl={photosTrophees[c.id]} size={36} />
                                        </div>
                                        <span className={`flex-1 truncate font-black text-sm ${isMoi ? "text-amber-700" : "text-slate-800"}`}>
                                            {c.nom} {isMoi && <span className="text-xs font-semibold text-amber-500">(moi)</span>}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-lg font-black text-amber-600">
                                            🏆 {c.total}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="px-7 pb-5 pt-2 text-xs text-slate-300">
                            Tous les trophées débloqués à vie : maîtrise produit, box &amp; 4P, défis, séries et jours parfaits.
                        </div>
                    </div>
                )
            ) : loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
                </div>
            ) : (
                <ClassementCourse
                    lignes={classement.map((c) => {
                        const combo = comboPeriode[c.id] ?? COMBO_VIDE;
                        const realise: Record<string, number> = { ...(c.produits as Record<string, number>), ...combo };
                        const objectif: Record<string, number> = {};
                        PRODUITS_CLASSEMENT.forEach((p) => { objectif[p.code] = getObjDynamic(c, p.key); });
                        (Object.keys(COMBO_VIDE) as ComboCode[]).forEach((code) => { objectif[code] = getObjDynamicCombo(c.id, code); });
                        return { id: c.id, nom: c.nom, realise, objectif };
                    })}
                    periode={periode}
                    groupe={groupe}
                    conseillerId={conseillerId}
                    photos={photos}
                />
            )}
        </div>
    );
}

export default function ClassementPage() {
    return <Suspense><ClassementInner /></Suspense>;
}
