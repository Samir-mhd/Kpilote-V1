/**
 * Catalogue des téléphones Free Mobile, lu directement sur mobile.free.fr (côté serveur uniquement).
 * Source : la page « comparez-nos-telephones » (liste des modèles), puis chaque fiche produit
 * (caractéristiques + prix par capacité). Les données sont dans le JSON `__NEXT_DATA__` des pages.
 *
 * Profils de prix chez Free : shopId "1" = prospect (nouveau client), "2" = déjà abonné.
 */

const BASE = "https://mobile.free.fr";
const PROSPECT = "1";
const ABONNE = "2";

export type PrixFlex = { premierLoyer: number; mensuel: number; duree: number; optionAchat: number | null; total: number };
export type OffreTel = { titre: string; montant: number; fin: string | null };
export type VarianteTel = {
    stockage: number;                     // Go
    comptant: number | null;              // prix comptant (avant remboursements)
    comptantApresRemb: number | null;     // prix comptant après remboursements
    flexProspect: PrixFlex | null;
    flexAbonne: PrixFlex | null;
    offres: OffreTel[];
};
export type TelephoneFree = {
    id: number;
    marque: string;
    nom: string;
    image: string;
    url: string;
    nouveau: boolean;
    reconditionne: boolean;
    couleurs: { nom: string; code: string }[];
    variantes: VarianteTel[];
    carac: {
        ecran: string | null;          // ex. « 6,7" Dynamic AMOLED 120 Hz »
        puce: string | null;
        ram: number | null;
        batterie: number | null;       // mAh
        photo: string | null;          // ex. « 50 + 12 + 8 Mpx »
        selfie: number | null;
        poids: number | null;
        os: string | null;
        fiveG: boolean;
        esim: boolean;
        etanche: boolean;
        recharge: string | null;
        dasTete: number | null;
        dasTronc: number | null;
        indiceEnergie: string | null;
    };
};
export type CatalogueTelephones = { majLe: string; telephones: TelephoneFree[]; erreurs: number };

/* eslint-disable @typescript-eslint/no-explicit-any */

async function lireNextData(chemin: string): Promise<any> {
    const r = await fetch(BASE + chemin, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "fr-FR" },
        signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`${chemin} → HTTP ${r.status}`);
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error(`${chemin} → données introuvables`);
    return JSON.parse(m[1]).props.pageProps;
}

const num = (v: any): number | null => (typeof v === "number" && isFinite(v) ? v : null);

function flex(p: any): PrixFlex | null {
    if (!p || num(p.rent?.monthlyPrice) === null) return null;
    return {
        premierLoyer: num(p.firstPaymentAfterDiscount) ?? num(p.firstPayment) ?? 0,
        mensuel: p.rent.monthlyPrice,
        duree: num(p.duration) ?? 24,
        optionAchat: num(p.purchaseOption),
        total: num(p.totalPrice) ?? 0,
    };
}

function offres(p: any): OffreTel[] {
    return ((p?.offers ?? []) as any[])
        .filter((o) => o?.title)
        .map((o) => ({ titre: String(o.title), montant: num(o.amount) ?? 0, fin: o.endDate ?? null }));
}

function carac(m: any): TelephoneFree["carac"] {
    const c = m.characteristics ?? {};
    const s = c.screen ?? {}, perf = c.performances ?? {}, ph = c.photo ?? {}, g = c.general ?? {}, a = c.autonomy ?? {};
    const ecran = s.screenSize
        ? [`${String(s.screenSize).replace(".", ",")}"`, s.screenType, s.maxRefreshingRate ? `${s.maxRefreshingRate} Hz` : null].filter(Boolean).join(" ")
        : null;
    const capteurs = [ph.mainResolution, ph.wideAngleResolution, ph.telephotoResolution, ph.macroResolution].filter((x) => num(x));
    const pack = c.packaging ?? {};
    return {
        ecran,
        puce: perf.chip ?? null,
        ram: num(perf.RAM),
        batterie: num(a.batteryCapacity),
        photo: capteurs.length ? `${capteurs.join(" + ")} Mpx` : null,
        selfie: num(ph.frontResolution),
        poids: num(g.weight),
        os: perf.OS
            ? (perf.OS_Version && String(perf.OS_Version).toLowerCase().startsWith(String(perf.OS).toLowerCase())
                ? String(perf.OS_Version)
                : [perf.OS, perf.OS_Version].filter(Boolean).join(" "))
            : null,
        fiveG: !!(m.is5G ?? c.network?.is5G),
        esim: !!(m.esim || [g.simType1, g.simType2, g.simType3].includes("eSIM")),
        etanche: !!g.waterResistance,
        recharge: [num(pack.maxW) ? `jusqu'à ${pack.maxW} W` : null, a.wirelessCharge ? "sans fil" : null].filter(Boolean).join(", ") || null,
        dasTete: num(m.das?.head ?? g.headDAS),
        dasTronc: num(m.das?.trunk ?? g.trunkDAS),
        indiceEnergie: m.energy?.index ?? c.energy?.index ?? null,
    };
}

async function lireTelephone(liste: any): Promise<TelephoneFree> {
    const p = await lireNextData(liste.path);
    const m = p.model ?? {};
    const refs: any[] = m.references ?? [];
    // Une variante par capacité (le prix ne dépend pas de la couleur).
    const parStockage = new Map<number, any>();
    for (const r of refs) {
        const st = num(r.storage?.value);
        if (st !== null && !parStockage.has(st)) parStockage.set(st, r);
    }
    const variantes: VarianteTel[] = [...parStockage.entries()].sort((a, b) => a[0] - b[0]).map(([stockage, r]) => {
        const cash = r.priceCash?.[PROSPECT] ?? r.priceCash?.[ABONNE];
        return {
            stockage,
            comptant: num(cash?.firstPaymentAfterDiscount) ?? num(cash?.firstPayment),
            comptantApresRemb: num(cash?.totalPrice),
            flexProspect: flex(r.priceFlex?.[PROSPECT]),
            flexAbonne: flex(r.priceFlex?.[ABONNE]),
            offres: offres(cash ?? r.priceFlex?.[PROSPECT]),
        };
    });
    return {
        id: liste.id,
        marque: liste.brand ?? m.brand ?? "",
        nom: liste.name ?? m.name ?? "",
        image: liste.image ?? "",
        url: BASE + liste.path,
        nouveau: !!m.isNew,
        reconditionne: !!m.isRefurbished,
        couleurs: ((liste.colors ?? []) as any[]).map((c) => ({ nom: c.colorName, code: c.colorCode })),
        variantes,
        carac: carac(m),
    };
}

/** Lit tout le catalogue (≈ 80 pages, 8 en parallèle). Les fiches en erreur sont ignorées. */
export async function lireCatalogueFree(): Promise<CatalogueTelephones> {
    const liste: any[] = (await lireNextData("/comparez-nos-telephones")).modelsList ?? [];
    const telephones: TelephoneFree[] = [];
    let erreurs = 0;
    for (let i = 0; i < liste.length; i += 8) {
        const lot = await Promise.allSettled(liste.slice(i, i + 8).filter((l) => l?.path).map(lireTelephone));
        for (const r of lot) {
            if (r.status === "fulfilled" && r.value.variantes.length) telephones.push(r.value);
            else erreurs++;
        }
    }
    if (!telephones.length) throw new Error("Catalogue Free vide");
    return { majLe: new Date().toISOString(), telephones, erreurs };
}
