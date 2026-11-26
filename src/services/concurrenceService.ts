/**
 * Concurrence : lecture automatique des offres publiques (nouveaux clients) box et mobile
 * d'Orange, Sosh, SFR, RED by SFR, Bouygues Telecom et B&You, sur leurs sites.
 *
 * Sources (vérifiées le 26/11/2026, robots.txt compatibles, accessibles depuis Vercel) :
 * - Orange / Sosh : API JSON de leur boutique (/api/showcase/{internet|mobile}/offers) ;
 * - SFR : données structurées schema.org de la page (nom, lien, prix) + texte pour les détails ;
 * - Bouygues / B&You : données de la page (flux Next.js : defaultPlans, forfaits du configurateur) ;
 * - RED by SFR : texte de la page.
 *
 * Chaque lecture est validée (nombre d'offres, prix plausibles). Une lecture invalide lève une
 * erreur : le cache garde alors la dernière version valide (voir concurrenceCache.ts).
 */

export type OperateurId = "orange" | "sosh" | "sfr" | "red" | "bt" | "byou";

export type OffreBoxConc = {
    nom: string;
    prix: number;           // prix mensuel affiché aujourd'hui (promo comprise)
    puis?: number;          // prix après la promo
    moisPromo?: number;     // durée de la promo
    engagement: number;     // mois, 0 = sans engagement
    debit?: string;
    wifi?: string;
    tv?: string;
    miseEnService?: string;
    fin?: string;           // offre limitée : « jusqu'au jj/mm »
    url: string;
};
export type OffreMobileConc = {
    nom: string;
    go: number;             // volume de data (Go), pour le rangement
    prix: number;
    puis?: number;
    moisPromo?: number;
    fin?: string;
    url: string;
};
export type ReleveOperateur = {
    op: OperateurId;
    box: OffreBoxConc[];
    mobile: OffreMobileConc[];
    releveLe: string;       // ISO
    source: { box?: string; mobile?: string };
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

async function lire(url: string, json = false): Promise<string> {
    const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", Accept: json ? "application/json" : "text/html" },
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
    return r.text();
}

/** Texte brut d'une page HTML (sans scripts ni styles), espaces normalisés. */
function texte(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;|&#160;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#x27;|&#39;|&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/[’]/g, "'")
        .replace(/\s+/g, " ");
}
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const arrondi = (n: number) => Math.round(n * 100) / 100;
const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Volume de data d'un libellé (« 130 Go », « 100Mo », « 1Go ») en Go. */
function volumeGo(s: string): number {
    const go = s.match(/(\d+(?:[.,]\d+)?)\s?Go/i);
    if (go) return nombre(go[1]);
    const mo = s.match(/(\d+)\s?Mo/i);
    return mo ? nombre(mo[1]) / 1000 : 0;
}

/** Offre à durée limitée annoncée près du nom : « jusqu'au 30/11 ». */
function finDe(txt: string, nom: string): string | undefined {
    const i = txt.indexOf(nom);
    if (i < 0) return undefined;
    const zone = txt.slice(Math.max(0, i - 120), i + nom.length + 200);
    return zone.match(/jusqu'au (\d{2}\/\d{2})/)?.[1];
}

/** Position du nom dans le texte, en ignorant les endroits où un nom plus long le contient
 *  (« SFR Fibre Power » ne doit pas tomber sur « SFR Fibre Power S »). */
function positionNom(txt: string, nom: string, tous: string[]): number {
    const plusLongs = tous.filter((n) => n !== nom && n.startsWith(nom));
    let i = -1;
    while ((i = txt.indexOf(`${nom} `, i + 1)) >= 0) {
        if (!plusLongs.some((n) => txt.startsWith(n, i))) return i;
    }
    return -1;
}

function detailsBox(s: string) {
    const debit = s.match(/(?:jusqu'à|Débit)\s*(?:jusqu'à\s*)?↓\s*([\d.,]+\s?[GM]bit\/s|[\d.,]+\s?[GM]b\/s)(\s*partagés)?/i)
        ?? s.match(/Jusqu'à\s*([\d.,]+\s?[GM]b\/s)\s*↓(\s*partagés)?/i);
    const wifi = s.match(/Wi-?Fi\s?(\d[E]?)(\s*tri-bande)?/i);
    const chaines = s.match(/(\d+)\s*chaînes/i);
    return {
        debit: debit ? `${debit[1].replace("bit/s", "b/s").replace(/\s/g, " ")}${debit[2] ? " partagés" : ""}` : undefined,
        wifi: wifi ? `WiFi ${wifi[1]}${wifi[2] ? " tri-bande" : ""}` : undefined,
        tv: chaines ? `${chaines[1]} chaînes` : undefined,
    };
}

/* ───────────── Orange / Sosh (API JSON) ───────────── */

type OffreOrange = {
    label: string; tag: string | null; isBlocked: boolean; isWithEquipment: boolean; isSubsidized: boolean;
    commitmentInMonths: number | null; detailPageUrl: string | null;
    price: { priceInCents: number; discountedPriceInCents: number; discounts: { durationInMonths: number | null }[] };
    shortAttributes: { textHtml: string | null }[];
};

async function lireOrangeSosh(op: "orange" | "sosh"): Promise<ReleveOperateur> {
    const hote = op === "orange" ? "https://boutique.orange.fr" : "https://shop.sosh.fr";
    const pageBox = op === "orange" ? "https://boutique.orange.fr/internet/offres-fibre" : "https://shop.sosh.fr/box-internet";
    const pageMob = op === "orange" ? "https://boutique.orange.fr/mobile/forfaits-orange" : "https://shop.sosh.fr/mobile/forfaits";
    const [jb, jm] = await Promise.all([lire(`${hote}/api/showcase/internet/offers`, true), lire(`${hote}/api/showcase/mobile/offers`, true)]);
    const offresBox = (JSON.parse(jb).offers ?? []) as OffreOrange[];
    const offresMob = (JSON.parse(jm).offers ?? []) as OffreOrange[];
    // Offres jeunes à libellé technique (« Cheat_Code… »), offres avec équipement et forfaits enfants exclus.
    const garder = (o: OffreOrange) => !o.isWithEquipment && !o.isSubsidized && !/cheat_code/i.test(o.label);
    const prix = (o: OffreOrange) => {
        const p = o.price;
        const mois = Math.max(0, ...p.discounts.map((d) => d.durationInMonths ?? 0));
        const actuel = p.discountedPriceInCents / 100, ensuite = p.priceInCents / 100;
        return mois > 0 && ensuite > actuel ? { prix: actuel, puis: ensuite, moisPromo: mois } : { prix: actuel };
    };
    const attributs = (o: OffreOrange) => texte(o.shortAttributes.map((a) => a.textHtml ?? "").join(" ; "));

    const box: OffreBoxConc[] = offresBox.filter(garder).map((o) => {
        const d = detailsBox(attributs(o));
        return {
            nom: o.label.trim(), ...prix(o), engagement: o.commitmentInMonths ?? 0, ...d,
            miseEnService: o.tag && /mise en service/i.test(o.tag) ? o.tag.replace(/^Exclu web\s*:\s*/i, "").replace(/frais de mise en service/i, "MES") : undefined,
            url: o.detailPageUrl ?? pageBox,
        };
    });
    const vus = new Set<string>();
    const mobile: OffreMobileConc[] = offresMob
        .filter((o) => garder(o) && !o.isBlocked && !/safer/i.test(o.label))
        .map((o) => ({ nom: o.label.replace(/^Forfait\s+/i, "").replace(/\s+/g, " ").trim(), go: volumeGo(o.label), ...prix(o), url: o.detailPageUrl ?? pageMob }))
        .filter((o) => (vus.has(o.nom) ? false : (vus.add(o.nom), true)));
    return { op, box, mobile, releveLe: new Date().toISOString(), source: { box: pageBox, mobile: pageMob } };
}

/* ───────────── SFR (schema.org + texte) ───────────── */

function itemsLdJson(html: string): { name: string; url: string; price?: number }[] {
    const res: { name: string; url: string; price?: number }[] = [];
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const j = JSON.parse(m[1]);
            const liste = j?.mainEntity?.itemListElement ?? j?.itemListElement;
            if (!Array.isArray(liste) || j["@type"] === "BreadcrumbList") continue;
            for (const x of liste) {
                const it = x.item ?? x;
                if (it?.name && it?.url) res.push({ name: String(it.name).trim(), url: String(it.url), price: it.offers?.price ? Number(it.offers.price) : undefined });
            }
        } catch { /* bloc illisible ignoré */ }
    }
    return res;
}

async function lireSfr(): Promise<ReleveOperateur> {
    const pageBox = "https://www.sfr.fr/offre-internet", pageMob = "https://www.sfr.fr/offre-mobile";
    const [hb, hm] = await Promise.all([lire(pageBox), lire(pageMob)]);
    const tb = texte(hb), tm = texte(hm);

    const itemsBox = itemsLdJson(hb);
    const box: OffreBoxConc[] = itemsBox.flatMap((it) => {
        const i = positionNom(tb, it.name, itemsBox.map((x) => x.name));
        const zone = i >= 0 ? tb.slice(i, i + 500) : "";
        const p = zone.match(/(\d+,\d{2}) €\/mois (Engagement (\d+) mois|Sans engagement)/);
        const prix = p ? nombre(p[1]) : it.price;
        if (!prix) return [];
        return [{ nom: it.name, prix, engagement: p?.[3] ? Number(p[3]) : 0, ...detailsBox(zone), fin: finDe(tb, it.name), url: it.url }];
    });
    const mobile: OffreMobileConc[] = itemsLdJson(hm).flatMap((it) => {
        const re = new RegExp(`${echapper(it.name)} (\\d+,\\d{2}) €\\/mois Sans engagement`);
        const p = tm.match(re);
        if (!p) return []; // offres avec engagement (pack téléphone) exclues
        return [{ nom: it.name.replace(/^2H/, "2h"), go: volumeGo(it.name), prix: nombre(p[1]), fin: finDe(tm, it.name), url: it.url }];
    });
    return { op: "sfr", box, mobile, releveLe: new Date().toISOString(), source: { box: pageBox, mobile: pageMob } };
}

/* ───────────── RED by SFR (texte) ───────────── */

async function lireRed(): Promise<ReleveOperateur> {
    const pageBox = "https://www.red-by-sfr.fr/offre-internet/", pageMob = "https://www.red-by-sfr.fr/forfaits-mobiles/";
    const [hb, hm] = await Promise.all([lire(pageBox), lire(pageMob)]);
    const tb = texte(hb), tm = texte(hm);

    const box: OffreBoxConc[] = [];
    const pb = tb.match(/Configurer mon offre Fibre (Sans engagement|Engagement (\d+) mois) (\d+,\d{2}) €\/mois/);
    if (pb) {
        const zone = tb.slice(pb.index ?? 0, (pb.index ?? 0) + 700);
        const chaines = zone.match(/(\d+) chaînes/) ?? tb.match(/(\d+) chaînes/);
        box.push({
            nom: "RED Box Fibre", prix: nombre(pb[3]), engagement: pb[2] ? Number(pb[2]) : 0,
            ...detailsBox(zone), tv: chaines ? `${chaines[1]} chaînes` : undefined,
            miseEnService: /Mise en service offerte/i.test(zone) ? "MES offerte sur demande" : undefined, url: pageBox,
        });
    }

    // Tableau « Quelles sont les configurations du forfait mobile RED ? Internet 1Go 40Go 250Go 5G … Tarif 1,99€/mois … »
    const mobile: OffreMobileConc[] = [];
    const conf = tm.match(/configurations du forfait mobile RED \? Internet (.+?) Sans engagement[\s\S]*?Tarif ((?:\d+,\d{2} ?€ ?\/ ?mois ?)+)/);
    if (conf) {
        // « 1Go 40Go 250Go 5G » → ["1Go", "40Go", "250Go 5G"] (« 5G » se rattache au volume qui précède)
        const volumes = conf[1].trim().split(/\s+(?=\d)/).reduce<string[]>((l, v) => {
            if (/Go|Mo/i.test(v) || l.length === 0) l.push(v.trim()); else l[l.length - 1] += ` ${v.trim()}`;
            return l;
        }, []);
        const tarifs = [...conf[2].matchAll(/(\d+,\d{2})/g)].map((m) => nombre(m[1]));
        const promo = tm.match(/forfait ([\d]+ ?Go[^!.]{0,30}?) passe à (\d+,\d{2}) ?€\/mois[^.!]*[.!] Offre à durée limitée, valable jusqu'au (\d{2}\/\d{2})/);
        volumes.forEach((v, i) => {
            if (tarifs[i] == null) return;
            const nom = v.replace(/(\d)Go/, "$1 Go");
            const enPromo = promo && volumeGo(promo[1]) === volumeGo(v);
            mobile.push({ nom, go: volumeGo(v), prix: tarifs[i], fin: enPromo ? promo![3] : undefined, url: pageMob });
        });
    }
    return { op: "red", box, mobile, releveLe: new Date().toISOString(), source: { box: pageBox, mobile: pageMob } };
}

/* ───────────── Bouygues / B&You (flux Next.js) ───────────── */

function fluxNext(html: string): string {
    let out = "";
    for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
        try { out += JSON.parse(m[1]); } catch { /* fragment ignoré */ }
    }
    return out;
}
function tableauJson<T>(s: string, cle: string): T[] | null {
    const i = s.indexOf(`"${cle}":[`);
    if (i < 0) return null;
    const j = s.indexOf("[", i);
    let prof = 0, k = j, ch = false;
    for (; k < s.length; k++) {
        const c = s[k];
        if (ch) { if (c === "\\") k++; else if (c === '"') ch = false; continue; }
        if (c === '"') ch = true; else if (c === "[") prof++; else if (c === "]") { prof--; if (!prof) break; }
    }
    try { return JSON.parse(s.slice(j, k + 1)); } catch { return null; }
}

type PlanBt = {
    name: string; categories: string[]; technology: string; obligation: string; downRates: string; rentalFees: number;
    detailsUrl: string | null; details: { price: { initial: number }; discounts: { value: number; duration: number; isIncitation: boolean }[] };
};

async function lireBouyguesBox(): Promise<{ bt: OffreBoxConc[]; byou: OffreBoxConc[]; page: string }> {
    const page = "https://www.bouyguestelecom.fr/offres-internet";
    const html = await lire(page);
    const t = texte(html);
    const plans = tableauJson<PlanBt>(fluxNext(html), "defaultPlans") ?? [];
    const bt: OffreBoxConc[] = [], byou: OffreBoxConc[] = [];
    const vus = new Set<string>();
    for (const p of plans) {
        // Offres grand public affichées sur la page (fibre), sans les séries partenaires, -26 ans, Smart TV, packs.
        if (p.technology !== "FTTH" || !p.categories.includes("fai-home") || /banque|smart tv|one|-26/i.test(p.name) || vus.has(p.name)) continue;
        vus.add(p.name);
        // Prix public = abonnement + location de la box, remises sans condition (les remises « incitation »
        // demandent un forfait Bouygues et ne sont pas comptées).
        const plein = arrondi(p.details.price.initial + (p.rentalFees ?? 0));
        const remises = (p.details.discounts ?? []).filter((d) => !d.isIncitation);
        const remiseTemp = remises.filter((d) => d.duration > 0).reduce((s, d) => s + d.value, 0);
        const remiseFixe = remises.filter((d) => !d.duration).reduce((s, d) => s + d.value, 0);
        const apres = arrondi(plein - remiseFixe);
        const mois = Math.max(0, ...remises.map((d) => d.duration ?? 0));
        // WiFi et TV : lus sur la carte de l'offre dans la page (nom suivi de son accroche).
        // La carte s'arrête à « Ajouter au comparateur » ; sans carte reconnue, pas de détail (plutôt qu'un faux).
        const iTxt = positionNom(t, p.name, plans.map((x) => x.name));
        const finCarte = iTxt >= 0 ? t.indexOf("Ajouter au comparateur", iTxt) : -1;
        const zoneCarte = finCarte > iTxt && finCarte - iTxt < 900 ? t.slice(iTxt, finCarte) : "";
        const carte: { debit?: string; wifi?: string; tv?: string } = zoneCarte ? detailsBox(zoneCarte) : {};
        const mes = zoneCarte.match(/Frais de mise en service (\d+) ?€ offerts/);
        const offre: OffreBoxConc = {
            nom: p.name.replace(/^B&YOU/, "B&You"),
            prix: arrondi(apres - remiseTemp),
            ...(remiseTemp > 0 ? { puis: apres, moisPromo: mois } : {}),
            engagement: /monthly(\d+)/.exec(p.obligation)?.[1] ? Number(/monthly(\d+)/.exec(p.obligation)![1]) : 0,
            debit: p.downRates ? p.downRates.replace(/Gbit\/s|Gbs|Gb\/s/i, " Gb/s").replace(/\s+/g, " ").trim() : carte.debit,
            wifi: carte.wifi,
            tv: carte.tv,
            miseEnService: mes ? `${mes[1]}€ de MES offerts` : undefined,
            fin: finDe(t, p.name),
            url: p.detailsUrl ? (p.detailsUrl.startsWith("http") ? p.detailsUrl : `https://www.bouyguestelecom.fr${p.detailsUrl}`) : page,
        };
        (/^B&YOU/i.test(p.name) ? byou : bt).push(offre);
    }
    return { bt, byou, page };
}

type PlanByou = { name: string; dataEnvelope: string; url?: string; prices: { initial: number; final: number; duration: number; pricesWithBboxIncentive?: unknown } };

async function lireByouMobile(): Promise<{ mobile: OffreMobileConc[]; page: string }> {
    const page = "https://www.bouyguestelecom.fr/forfaits-mobiles/sans-engagement";
    const html = await lire(page);
    const mobile: OffreMobileConc[] = [];
    const vus = new Set<string>();
    // Forfaits du configurateur de la page (« products », ceux qui portent pricesWithBboxIncentive).
    for (const plan of tableauJson<PlanByou>(fluxNext(html), "products") ?? []) {
        if (!plan?.dataEnvelope || !plan.prices?.pricesWithBboxIncentive || vus.has(plan.name)) continue;
        vus.add(plan.name);
        const nom = plan.name.replace(/^S[ée]rie sp[ée]ciale\s+/i, "").replace(/^B&YOU\s+/i, "").replace(/(\d)Go/, "$1 Go").trim();
        mobile.push({ nom, go: volumeGo(plan.dataEnvelope), prix: plan.prices.final, url: page });
    }
    return { mobile, page };
}

/* ───────────── Validation & point d'entrée ───────────── */

function valider(r: ReleveOperateur, attendu: { box: boolean; mobile: boolean }): ReleveOperateur {
    const ok = (p: number) => Number.isFinite(p) && p >= 0.5 && p <= 150;
    r.box = r.box.filter((o) => ok(o.prix) && (o.puis == null || ok(o.puis)));
    r.mobile = r.mobile.filter((o) => ok(o.prix) && (o.puis == null || ok(o.puis)));
    if (attendu.box && r.box.length === 0) throw new Error(`${r.op} : aucune offre box lue`);
    if (attendu.mobile && r.mobile.length === 0) throw new Error(`${r.op} : aucun forfait mobile lu`);
    r.box.sort((a, b) => a.prix - b.prix);
    r.mobile.sort((a, b) => a.go - b.go || a.prix - b.prix);
    return r;
}

export const OPERATEURS: OperateurId[] = ["orange", "sosh", "sfr", "red", "bt", "byou"];

export async function lireOperateur(op: OperateurId): Promise<ReleveOperateur> {
    const maintenant = new Date().toISOString();
    switch (op) {
        case "orange":
        case "sosh":
            return valider(await lireOrangeSosh(op), { box: true, mobile: true });
        case "sfr":
            return valider(await lireSfr(), { box: true, mobile: true });
        case "red":
            return valider(await lireRed(), { box: true, mobile: true });
        case "bt": {
            const { bt, page } = await lireBouyguesBox();
            return valider({ op, box: bt, mobile: [], releveLe: maintenant, source: { box: page } }, { box: true, mobile: false });
        }
        case "byou": {
            const [{ byou, page }, mob] = await Promise.all([lireBouyguesBox(), lireByouMobile()]);
            return valider({ op, box: byou, mobile: mob.mobile, releveLe: maintenant, source: { box: page, mobile: mob.page } }, { box: true, mobile: true });
        }
    }
}
