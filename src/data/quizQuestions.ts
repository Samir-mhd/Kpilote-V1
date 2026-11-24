/**
 * Banque de questions du Quiz (rubrique conseiller).
 * Sources : free.fr, mobile.free.fr, assistance.free.fr (relevées le 24/11/2026) + infos boutique.
 * Chaque question : la 1re réponse de `r` est la bonne (l'ordre est mélangé à l'affichage).
 * Niveau 1 = les bases · 2 = confirmé · 3 = expert (pièges, calculs, conditions).
 * Les prix et promos changent : relire ce fichier à chaque changement d'offre Free.
 */

export type ThemeQuiz = "box" | "mobile" | "gestion";
export type NiveauQuiz = 1 | 2 | 3;
export type QuestionQuiz = {
    id: string;
    theme: ThemeQuiz;
    niveau: NiveauQuiz;
    q: string;
    r: [string, string, string, string];
    expl: string;
    src: keyof typeof SOURCES_QUIZ;
};

export const QUIZ_VERIFIE_LE = "24/11/2026";

export const SOURCES_QUIZ = {
    freebox: { label: "free.fr · offres Freebox", url: "https://www.free.fr/freebox/" },
    ultra: { label: "free.fr · Freebox Ultra", url: "https://www.free.fr/freebox/freebox-ultra/" },
    ultraEss: { label: "free.fr · Freebox Ultra Essentiel", url: "https://www.free.fr/freebox/freebox-ultra-essentiel/" },
    pop: { label: "free.fr · Freebox Pop", url: "https://www.free.fr/freebox/freebox-pop/" },
    popS: { label: "free.fr · Freebox Pop S", url: "https://www.free.fr/freebox/freebox-pop-s/" },
    mobile: { label: "mobile.free.fr · forfaits", url: "https://mobile.free.fr/" },
    fiche5g: { label: "mobile.free.fr · Forfait Free 5G+", url: "https://mobile.free.fr/fiche-forfait-free" },
    family: { label: "free.fr · Free Family", url: "https://www.free.fr/freebox/free-family" },
    a923: { label: "Assistance · résilier mon mobile", url: "https://assistance.free.fr/articles/923" },
    a287: { label: "Assistance · résilier ma Freebox", url: "https://assistance.free.fr/articles/287" },
    a891: { label: "Assistance · portabilité", url: "https://assistance.free.fr/articles/891" },
    a885: { label: "Assistance · porter sur une ligne existante", url: "https://assistance.free.fr/articles/885" },
    a1462: { label: "Assistance · eSIM", url: "https://assistance.free.fr/articles/1462" },
    resil: { label: "free.fr · résiliez votre FAI", url: "https://www.free.fr/freebox/resiliez-votre-fai" },
    demenag: { label: "free.fr · déménagement", url: "https://www.free.fr/freebox/demenagement" },
    boutique: { label: "Info boutique", url: "" },
} as const;

type Def = [string, NiveauQuiz, string, [string, string, string, string], string, keyof typeof SOURCES_QUIZ];
const fab = (theme: ThemeQuiz, defs: Def[]): QuestionQuiz[] =>
    defs.map(([id, niveau, q, r, expl, src]) => ({ id, theme, niveau, q, r, expl, src }));

/* ═══════════════════════════ 💻 BOX ═══════════════════════════ */
const BOX = fab("box", [
    // ── Niveau 1 : les bases ──
    ["b101", 1, "Combien coûte la Freebox Ultra la 1re année ?", ["49,99 €/mois", "39,99 €/mois", "59,99 €/mois", "44,99 €/mois"], "49,99 €/mois la 1re année, puis 59,99 €/mois.", "ultra"],
    ["b102", 1, "Combien coûte la Freebox Pop la 1re année ?", ["29,99 €/mois", "24,99 €/mois", "34,99 €/mois", "39,99 €/mois"], "29,99 €/mois la 1re année, puis 39,99 €/mois.", "pop"],
    ["b103", 1, "Combien coûte la Freebox Ultra Essentiel la 1re année ?", ["39,99 €/mois", "34,99 €/mois", "49,99 €/mois", "29,99 €/mois"], "39,99 €/mois la 1re année, puis 49,99 €/mois.", "ultraEss"],
    ["b104", 1, "Combien coûte la Freebox Pop S la 1re année ?", ["24,99 €/mois", "19,99 €/mois", "29,99 €/mois", "22,99 €/mois"], "24,99 €/mois la 1re année, puis 29,99 €/mois.", "boutique"],
    ["b105", 1, "Quelle est la durée d'engagement des Freebox Pop, Ultra Essentiel et Ultra ?", ["Sans engagement", "12 mois", "24 mois", "6 mois"], "Toutes les Freebox actuelles sont sans engagement.", "freebox"],
    ["b106", 1, "Quel est le montant des frais de mise en service d'une Freebox ?", ["49 €", "29 €", "39 €", "59 €"], "49 € de frais de mise en service (MES), offerts sur demande lors des promotions.", "ultra"],
    ["b107", 1, "Laquelle de ces plateformes est incluse dans la Freebox Ultra ?", ["Netflix Standard avec pub", "beIN Sports", "HBO Max", "YouTube Premium"], "L'Ultra inclut Netflix et Disney+ Standard avec pub, Prime Video, CANAL+ La Chaîne, Universal+, Cafeyn et Freebox Files.", "ultra"],
    ["b108", 1, "Quelle box ne comprend aucun service TV ?", ["Freebox Pop S", "Freebox Pop", "Freebox Ultra Essentiel", "Freebox Ultra"], "La Pop S n'a ni TV ni plateforme de streaming : c'est une offre internet + téléphone fixe.", "popS"],
    ["b109", 1, "Quelle technologie Wi-Fi équipe la Freebox Pop ?", ["Wi-Fi 7", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 5"], "La Pop est en Wi-Fi 7 (bi-bande). L'Ultra est en Wi-Fi 7 quadri-bande.", "pop"],
    ["b110", 1, "Combien coûte la Freebox Ultra à partir de la 2e année ?", ["59,99 €/mois", "49,99 €/mois", "54,99 €/mois", "64,99 €/mois"], "Le prix passe de 49,99 € à 59,99 €/mois après 12 mois.", "ultra"],
    ["b111", 1, "Jusqu'à combien Free rembourse-t-il les frais de résiliation de l'ancien opérateur pour une Freebox ?", ["151 €", "100 €", "50 €", "200 €"], "Jusqu'à 151 € pour une offre Freebox (50 € pour une Box 5G).", "resil"],
    ["b112", 1, "Combien coûte l'installation de la fibre par un technicien Free ?", ["Elle est gratuite", "49 €", "99 €", "Ça dépend de la box"], "L'installation fibre est gratuite, quelle que soit la Freebox choisie.", "resil"],
    ["b113", 1, "Avec une Freebox Pop, combien de temps CANAL+ est-il inclus ?", ["3 mois", "1 mois", "6 mois", "12 mois"], "3 mois inclus, puis 15,99 €/mois (option sans engagement).", "pop"],
    ["b114", 1, "Combien coûte un 2e Player TV ?", ["4,99 €/mois", "Gratuit", "2,99 €/mois", "9,99 €/mois"], "Le 2e Player TV (Multi-TV) est à 4,99 €/mois.", "ultra"],
    ["b115", 1, "Quel est le débit maximal théorique de la Freebox Ultra ?", ["8 Gbit/s", "1 Gbit/s", "5 Gbit/s", "10 Gbit/s"], "Jusqu'à 8 Gbit/s en descendant comme en montant (débit théorique).", "ultra"],
    ["b116", 1, "Combien de chaînes TV sont incluses avec la Freebox Ultra ?", ["Plus de 340", "Plus de 100", "Plus de 200", "Plus de 500"], "Plus de 340 chaînes et services, dont 40 chaînes TV by CANAL.", "ultra"],
    ["b117", 1, "Quel Player TV est fourni avec la Freebox Pop ?", ["Player TV Free 4K sous Android TV", "Player HD sans Android", "Aucun player", "Apple TV"], "Player TV Free 4K HDR Dolby Vision, sous Android TV.", "pop"],
    ["b118", 1, "Combien coûte l'option Disney+ avec une Freebox Pop après la période offerte ?", ["6,99 €/mois", "4,99 €/mois", "9,99 €/mois", "11,99 €/mois"], "Disney+ : 3 mois inclus, puis 6,99 €/mois.", "pop"],

    // ── Niveau 2 : confirmé ──
    ["b201", 2, "Combien coûte la Freebox Pop à partir de la 2e année ?", ["39,99 €/mois", "29,99 €/mois", "34,99 €/mois", "44,99 €/mois"], "29,99 € la 1re année, puis 39,99 €/mois.", "pop"],
    ["b202", 2, "Combien coûte l'Ultra Essentiel à partir de la 2e année ?", ["49,99 €/mois", "39,99 €/mois", "44,99 €/mois", "59,99 €/mois"], "39,99 € la 1re année, puis 49,99 €/mois.", "ultraEss"],
    ["b203", 2, "Un client Ultra veut Netflix Standard sans pub. Combien paie-t-il en plus ?", ["9 €/mois", "5 €/mois", "7,99 €/mois", "14,99 €/mois"], "Netflix Standard : +9 €/mois. Premium : +16 €/mois.", "ultra"],
    ["b204", 2, "Un client Ultra veut Disney+ Standard sans pub. Combien paie-t-il en plus ?", ["5 €/mois", "9 €/mois", "6,99 €/mois", "10 €/mois"], "Disney+ Standard : +5 €/mois. Premium : +10 €/mois.", "ultra"],
    ["b205", 2, "Combien de répéteurs Wi-Fi 7 au maximum peut-on avoir avec une Freebox Ultra ?", ["4", "2", "3", "6"], "Jusqu'à 4 répéteurs par logement : 1 inclus sur demande, puis 20 € chacun.", "ultra"],
    ["b206", 2, "Combien coûte un répéteur Wi-Fi 7 supplémentaire ?", ["20 € l'unité", "4,99 €/mois", "49 € l'unité", "Gratuit"], "Le 1er est inclus sur demande, les suivants coûtent 20 € chacun.", "ultra"],
    ["b207", 2, "Combien d'heures d'enregistrement dans le cloud sont incluses avec l'Ultra ?", ["320 heures", "100 heures", "200 heures", "Illimité"], "320 h incluses avec l'Ultra et l'Ultra Essentiel (100 h avec la Pop).", "ultra"],
    ["b208", 2, "Combien d'heures d'enregistrement cloud sont incluses avec la Pop ?", ["100 heures", "320 heures", "50 heures", "Aucune"], "100 h d'enregistrement cloud avec la Pop, 320 h avec les Ultra.", "pop"],
    ["b209", 2, "Que contient l'Ultra Essentiel que la Pop n'a pas ?", ["Les chaînes TV by CANAL", "Netflix", "Amazon Prime", "Disney+"], "L'Ultra Essentiel inclut plus de 340 chaînes dont 40 TV by CANAL, sans plateforme de streaming.", "ultraEss"],
    ["b210", 2, "Quel port spécial trouve-t-on sur le serveur Freebox Ultra ?", ["Un port SFP 10G", "Un port HDMI", "Un port VGA", "Un port Thunderbolt"], "1 port SFP LAN 10G, 4 ports Ethernet 2,5 Gbit/s, 1 port USB 3.0.", "ultra"],
    ["b211", 2, "Quel est le débit maximal théorique de la Freebox Pop ?", ["5 Gbit/s partagés", "8 Gbit/s", "1 Gbit/s", "2,5 Gbit/s"], "Jusqu'à 5 Gbit/s partagés en descendant (8 Gbit/s pour l'Ultra).", "pop"],
    ["b212", 2, "Quel débit montant maximal annonce la Freebox Pop S ?", ["900 Mbit/s", "8 Gbit/s", "300 Mbit/s", "5 Gbit/s"], "Pop S : jusqu'à 5 Gbit/s partagés en descendant et 900 Mbit/s en montant.", "popS"],
    ["b213", 2, "Combien coûte l'option YouTube Premium après la période offerte ?", ["11,99 €/mois", "6,99 €/mois", "7,99 €/mois", "9,99 €/mois"], "YouTube Premium : 2 mois offerts, puis 11,99 €/mois.", "pop"],
    ["b214", 2, "Avec la Pop, à partir de combien coûte Netflix ?", ["7,99 €/mois", "Inclus", "5,99 €/mois", "9 €/mois"], "Netflix n'est pas inclus dans la Pop : à partir de 7,99 €/mois.", "pop"],
    ["b215", 2, "Vers combien de destinations les appels vers les fixes sont-ils inclus avec la Pop et l'Ultra ?", ["Plus de 110", "Plus de 50", "Plus de 200", "France uniquement"], "Appels inclus vers les fixes de plus de 110 destinations.", "pop"],
    ["b216", 2, "Quelle option Paramount+ est proposée ?", ["1 mois d'essai puis 7,99 €/mois", "Incluse dans l'Ultra", "3 mois offerts puis 4,99 €", "Elle n'existe pas chez Free"], "Paramount+ : 1 mois d'essai, puis 7,99 €/mois.", "pop"],

    // ── Niveau 3 : expert ──
    ["b301", 3, "Un client Ultra veut Netflix Premium. Combien paie-t-il au total par mois la 1re année (box + Netflix) ?", ["65,99 €", "57,99 €", "71,98 €", "49,99 €"], "49,99 € (Ultra) + 16 € (Premium) = 65,99 €/mois.", "ultra"],
    ["b302", 3, "Un client prend la Pop avec CANAL+, Prime et Disney+. Combien paie-t-il au 4e mois pour ces 3 options ?", ["29,97 €", "0 €", "15,99 €", "22,98 €"], "Après 3 mois inclus : 15,99 + 6,99 + 6,99 = 29,97 €/mois.", "pop"],
    ["b303", 3, "Piège : un client Pop S veut garder Netflix inclus dans sa box. Que lui dis-tu ?", ["La Pop S n'inclut aucun service TV ni streaming", "Netflix est inclus 3 mois", "Netflix est inclus avec pub", "Il faut payer 4,99 €"], "La Pop S n'a ni TV ni streaming. Pour Netflix inclus, il faut l'Ultra.", "popS"],
    ["b304", 3, "Un client compare : Ultra Essentiel + Netflix Standard, ou Ultra avec Netflix Standard. Quel est le coût mensuel de l'Ultra la 1re année ?", ["58,99 €", "54,98 €", "49,99 €", "64,98 €"], "Ultra 49,99 € + supplément Netflix Standard 9 € = 58,99 €. Avec l'Essentiel : 39,99 € + 14,99 € = 54,98 €, mais sans Prime, Disney+ ni CANAL+ La Chaîne.", "ultra"],
    ["b305", 3, "Combien coûte au total la 1re année d'une Freebox Ultra, MES comprise (sans option) ?", ["648,88 €", "599,88 €", "719,88 €", "548,88 €"], "49,99 € × 12 = 599,88 € + 49 € de MES = 648,88 €.", "ultra"],
    ["b306", 3, "Quel est le surcoût annuel de la 2e année d'une Pop par rapport à la 1re (hors MES) ?", ["120 €", "60 €", "100 €", "0 €"], "(39,99 − 29,99) × 12 = 120 € de plus la 2e année.", "pop"],
    ["b307", 3, "Piège : un client Ultra demande si CANAL+ La Chaîne s'arrête au bout de 3 mois. Que réponds-tu ?", ["Non, elle reste incluse tant qu'il garde l'Ultra", "Oui, puis 15,99 €/mois", "Oui, puis 7 €/mois", "Elle n'est pas incluse"], "Avec l'Ultra, CANAL+ La Chaîne est incluse sans limite de durée. Les 3 mois, c'est pour la Pop et l'Ultra Essentiel.", "ultra"],
    ["b308", 3, "Avec l'Ultra, quelle offre CANAL+ est proposée à 7 €/mois au lieu de 22 € ?", ["Une offre CANAL+ réservée à l'Ultra, sans engagement", "CANAL+ Sport", "100 % CANAL+", "Aucune, c'est une rumeur"], "Offre CANAL+ à 7 € au lieu de 22 €, réservée à l'Ultra et sans engagement.", "boutique"],
    ["b309", 3, "Quel est le prix de l'offre CANAL+ Sport pour un abonné Freebox ?", ["19,99 €/mois", "7 €/mois", "34,99 €/mois", "15,99 €/mois"], "CANAL+ Sport à 19,99 €/mois pour les abonnés Freebox.", "boutique"],
    ["b310", 3, "Combien d'heures cloud au-delà de 320 h coûte l'Ultra Essentiel ?", ["0,02 €/heure/mois", "1 €/heure", "Impossible d'en ajouter", "0,50 €/heure/mois"], "Au-delà des 320 h incluses : 0,02 €/heure/mois.", "ultraEss"],
    ["b311", 3, "Combien consomme la Freebox Ultra en mode veille, contre 12,9 W allumée ?", ["0,56 W", "5 W", "2,5 W", "0 W"], "En veille, la consommation passe de 12,9 W à 0,56 W, soit jusqu'à 95 % d'économie.", "ultra"],
    ["b312", 3, "Piège : un client Pop S demande les appels vers les mobiles. Que dit l'offre ?", ["Elle inclut les appels vers les fixes en France et DOM, pas de mention des mobiles", "Mobiles illimités en France", "Mobiles et fixes dans 110 destinations", "Aucun appel inclus"], "La Pop S indique les appels illimités vers les fixes de France et des DOM. Les mobiles ne sont pas mentionnés.", "popS"],
    ["b313", 3, "Le répéteur inclus de la Pop S : comment l'obtient-on ?", ["Sur demande depuis l'Espace Abonné, après activation", "Il est livré d'office avec la box", "En boutique uniquement", "Il est payant (20 €)"], "Inclus sur demande, à commander depuis l'Espace Abonné une fois l'offre activée.", "popS"],
    ["b314", 3, "Combien coûte la Pop S sur 2 ans (24 mois), hors MES ?", ["659,76 €", "599,76 €", "719,76 €", "539,76 €"], "24,99 € × 12 + 29,99 € × 12 = 299,88 € + 359,88 € = 659,76 €.", "boutique"],
]);

/* ═══════════════════════════ 📶 MOBILE ═══════════════════════════ */
const MOBILE = fab("mobile", [
    // ── Niveau 1 ──
    ["m101", 1, "Quel est le prix public du Forfait Free 5G+ ?", ["19,99 €/mois", "15,99 €/mois", "24,99 €/mois", "29,99 €/mois"], "19,99 €/mois sans engagement.", "fiche5g"],
    ["m102", 1, "Quel est le prix public du Forfait Free Max ?", ["29,99 €/mois", "19,99 €/mois", "24,99 €/mois", "34,99 €/mois"], "29,99 €/mois, 19,99 € pour un abonné Freebox.", "mobile"],
    ["m103", 1, "Combien coûte la Série Free la 1re année ?", ["12,99 €/mois", "9,99 €/mois", "15,99 €/mois", "8,99 €/mois"], "12,99 €/mois pendant 1 an, puis elle devient un Forfait Free 5G+.", "mobile"],
    ["m104", 1, "Combien coûte le Forfait 2 € pour un abonné Freebox ?", ["0 €/mois", "2 €/mois", "1 €/mois", "0,99 €/mois"], "Le Forfait 2 € est à 0 € pour un abonné Freebox (sur un seul forfait).", "mobile"],
    ["m105", 1, "Les forfaits mobiles Free ont-ils un engagement ?", ["Non, ils sont tous sans engagement", "12 mois", "24 mois", "Seulement le Free Max"], "Free 5G+, Free Max, Série Free et Forfait 2 € sont sans engagement.", "mobile"],
    ["m106", 1, "Combien de data en France inclut le Forfait Free 5G+ ?", ["350 Go", "150 Go", "210 Go", "Illimité pour tous"], "350 Go en France (débit réduit au-delà).", "fiche5g"],
    ["m107", 1, "Quelle est la data en France du Forfait Free Max ?", ["Illimitée en 5G+", "350 Go", "500 Go", "250 Go"], "Data illimitée en France en 5G+.", "mobile"],
    ["m108", 1, "Combien d'heures d'appel inclut le Forfait 2 € ?", ["2 heures", "1 heure", "Illimité", "30 minutes"], "2 h d'appels en France, SMS et MMS illimités.", "mobile"],
    ["m109", 1, "Le Forfait 2 € donne-t-il accès à la 5G ?", ["Non, il est en 4G", "Oui", "Oui, en 5G+", "Seulement avec une Freebox"], "Le Forfait 2 € reste en 4G.", "mobile"],
    ["m110", 1, "Combien de lignes mobiles au maximum profitent des remises Free Family ?", ["4", "2", "3", "5"], "Jusqu'à 4 forfaits parmi Free Max, Free 5G+ et Forfait 2 €.", "family"],
    ["m111", 1, "Combien coûte le Free Max pour un abonné Freebox ?", ["19,99 €/mois", "29,99 €/mois", "24,99 €/mois", "14,99 €/mois"], "10 € de remise : 19,99 € au lieu de 29,99 €.", "family"],
    ["m112", 1, "Que devient la Série Free au bout d'un an ?", ["Elle devient un Forfait Free 5G+", "Elle est résiliée", "Elle devient un Forfait 2 €", "Elle reste à 12,99 €"], "Après 1 an, la Série Free devient un Forfait Free 5G+.", "mobile"],
    ["m113", 1, "Combien coûte une eSIM Free ?", ["10 €", "Gratuit", "5 €", "20 €"], "L'eSIM est facturée 10 €, comme une carte SIM classique.", "a1462"],
    ["m114", 1, "Quel numéro appeler pour obtenir son code RIO ?", ["3179", "3244", "3000", "118 218"], "Le 3179, depuis la ligne concernée. Le RIO arrive par SMS.", "a923"],
    ["m115", 1, "Combien de data depuis l'Europe et les DOM inclut le Forfait Free 5G+ ?", ["35 Go", "350 Go", "Illimité", "10 Go"], "35 Go par mois en 4G/5G depuis l'Europe et les DOM.", "fiche5g"],
    ["m116", 1, "Quelle option du Forfait Free 5G+ permet d'utiliser une montre connectée ?", ["L'option eSIM Watch", "Free mVPN", "Free TV", "McAfee"], "L'option eSIM Watch fait partie des services du Forfait Free 5G+.", "fiche5g"],

    // ── Niveau 2 ──
    ["m201", 2, "Un abonné Ultra prend un Forfait Free 5G+. Combien le paie-t-il ?", ["9,99 € la 1re année, puis 15,99 €", "9,99 € pour toujours", "15,99 € dès le départ", "19,99 €"], "Avec une Freebox (hors Pop) : −10 € pendant 1 an, puis −4 €.", "family"],
    ["m202", 2, "Avec quelle Freebox la remise de 10 € reste-t-elle sans limite de durée sur un Forfait Free 5G+ ?", ["La Pop, sur un seul forfait", "L'Ultra", "L'Ultra Essentiel", "La Pop S"], "Avec la Pop, la 1re ligne Free 5G+ reste à 9,99 €. Les autres lignes passent à 15,99 € après 1 an.", "pop"],
    ["m203", 2, "Quelle condition est obligatoire pour la remise Freebox sur un forfait ?", ["Même RIB et même adresse que la Freebox", "12 mois d'engagement", "Un téléphone acheté chez Free", "Être client depuis 1 an"], "C'est l'offre multiligne : même RIB et même adresse.", "family"],
    ["m204", 2, "Une Série Free peut-elle cumuler la remise Freebox ?", ["Non, ce n'est pas cumulable", "Oui, toujours", "Oui, après 6 mois", "Seulement avec l'Ultra"], "Les remises Freebox ne se cumulent pas avec la Série Free.", "mobile"],
    ["m205", 2, "Un client a droit à plusieurs remises sur un même forfait. Laquelle s'applique ?", ["La plus avantageuse", "Toutes", "La plus ancienne", "Aucune"], "Les remises ne se cumulent pas : seule la plus avantageuse s'applique.", "mobile"],
    ["m206", 2, "Quand perd-on les remises Free Family ?", ["Si la Freebox est résiliée ou si le forfait est détaché du compte", "Au bout de 2 ans", "Si on change de téléphone", "Jamais"], "Perte des remises en cas de résiliation ou de détachement de la Freebox ou du forfait.", "family"],
    ["m207", 2, "Combien de data depuis l'Europe et les DOM inclut la Série Free ?", ["30 Go", "35 Go", "Illimité", "10 Go"], "30 Go depuis l'Europe et les DOM, en 4G.", "mobile"],
    ["m208", 2, "Quelle data à l'étranger offre le Free Max ?", ["Illimitée dans de nombreuses destinations", "35 Go", "100 Go", "Aucune"], "Data illimitée en 5G/4G dans plus de 100 destinations, dont l'Europe et les États-Unis.", "mobile"],
    ["m209", 2, "Combien de chiffres compte un code RIO ?", ["12", "8", "10", "16"], "Le RIO compte 12 chiffres.", "resil"],
    ["m210", 2, "Vers quels pays les appels sont-ils illimités avec le Forfait Free 5G+ (en plus de l'Europe) ?", ["États-Unis, Canada, Chine…", "Maroc et Tunisie seulement", "Aucun", "Le monde entier"], "Appels illimités vers les États-Unis, le Canada, l'Alaska, Hawaï, la Chine, les DOM et les fixes de 100 destinations.", "fiche5g"],
    ["m211", 2, "Comment commander une eSIM depuis l'Espace Abonné ?", ["Dépannage et services > Commander une nouvelle SIM > format eSIM", "Mon offre > Changer de forfait", "Il faut aller en boutique", "Factures > eSIM"], "Rubrique « Dépannage et services », puis « Commander une nouvelle SIM » et choix eSIM.", "a1462"],
    ["m212", 2, "Pour transférer une eSIM sur un nouveau téléphone (hors transfert rapide iPhone), que faut-il faire d'abord ?", ["Supprimer l'eSIM du premier appareil", "Résilier la ligne", "Commander une SIM physique", "Rien, les deux restent actives"], "Il faut supprimer l'eSIM du premier appareil, puis l'activer sur le second (passer d'abord par l'Espace Abonné).", "a1462"],
    ["m213", 2, "Avec un abonnement Freebox, combien coûte le 1er Forfait Free 5G+ pour un abonné Pop ?", ["9,99 €/mois sans limite de durée", "9,99 € pendant 1 an", "15,99 €/mois", "0 €"], "Pop : la remise de 10 € s'applique durablement sur un seul Forfait Free 5G+.", "pop"],
    ["m214", 2, "Le Forfait Free 2 € à 0 € pour un abonné Freebox s'applique sur combien de lignes ?", ["Une seule", "Deux", "Quatre", "Toutes"], "La remise de 2 € ne vaut que pour un seul Forfait 2 €.", "family"],
    ["m215", 2, "Quel débit en 5G permet le Forfait Free Max ?", ["5G+", "4G seulement", "5G limitée à 100 Mbit/s", "3G"], "Le Free Max est en 5G+, avec une data illimitée en France.", "mobile"],

    // ── Niveau 3 : expert ──
    ["m301", 3, "Un client Pop prend 2 Forfaits Free 5G+. Combien paie-t-il pour les 2 lignes la 2e année ?", ["25,98 €/mois", "19,98 €/mois", "31,98 €/mois", "39,98 €/mois"], "1re ligne à 9,99 € (remise durable Pop) + 2e ligne à 15,99 € après 1 an = 25,98 €.", "pop"],
    ["m302", 3, "Un client Ultra prend 3 Forfaits Free 5G+. Combien paie-t-il pour les 3 lignes la 2e année ?", ["47,97 €/mois", "29,97 €/mois", "59,97 €/mois", "35,97 €/mois"], "Hors Pop : 15,99 € × 3 = 47,97 € à partir de la 2e année.", "family"],
    ["m303", 3, "Piège : un client a résilié sa ligne Free il y a 15 jours et resouscrit avec sa Freebox. A-t-il la remise ?", ["Non, pas de remise si une ligne Free a été résiliée dans les 30 jours", "Oui, comme tout le monde", "Oui, mais seulement 4 €", "Oui, au bout d'un mois"], "Pas de remise si une ligne mobile Free a été résiliée dans les 30 jours précédant la nouvelle souscription.", "family"],
    ["m304", 3, "Un Forfait Free 5G+ souscrit avant le 01/10/2024 avec une Freebox : quel prix ?", ["15,99 €/mois (−4 €)", "9,99 €/mois", "19,99 €/mois", "12,99 €/mois"], "Pour les 5G+ souscrits avant le 01/10/2024 : −4 €, soit 15,99 €/mois.", "mobile"],
    ["m305", 3, "La remise de 10 € pendant 1 an sur le 5G+ : quelle condition de délai faut-il respecter ?", ["La Freebox doit être rattachée dans l'année suivant la souscription du 5G+", "Aucune", "Le forfait doit avoir 6 mois", "Elle n'est valable qu'en boutique"], "Valable une seule fois, si l'offre Freebox est rattachée dans l'année suivant la souscription du Forfait Free 5G+.", "mobile"],
    ["m306", 3, "Piège : un client Freebox avec un Forfait Free 5G+ veut aussi le Forfait 2 € à 0 €. Est-ce possible ?", ["Non : le 0 € est réservé à ceux qui n'ont ni 5G+ ni Max remisé, et ne se cumule pas", "Oui, sans condition", "Oui, mais à 1 €", "Seulement avec l'Ultra"], "Le Forfait 2 € à 0 € ne se cumule pas avec les remises 5G+/Max : la plus avantageuse s'applique.", "family"],
    ["m307", 3, "Combien économise par an un abonné Freebox sur un Free Max, par rapport au prix public ?", ["120 €", "60 €", "100 €", "48 €"], "10 € de remise × 12 mois = 120 € par an.", "family"],
    ["m308", 3, "Un abonné Ultra prend un Free 5G+ : combien économise-t-il la 1re année par rapport au prix public ?", ["120 €", "48 €", "96 €", "60 €"], "−10 € × 12 mois = 120 € la 1re année (puis 48 €/an avec −4 €).", "family"],
    ["m309", 3, "Dans un compte multiligne Free Family, quelle ligne est rattachée directement à la Freebox ?", ["La ligne principale seulement", "Toutes les lignes", "La dernière souscrite", "Aucune"], "Seule la ligne principale est rattachée à la Freebox. Les autres profitent de l'avantage via le compte multiligne.", "family"],
    ["m310", 3, "Une ligne mobile rattachée à une Freebox : que récupère-t-elle ?", ["L'adresse de la Freebox (titulaire et RIB inchangés)", "Le RIB de la Freebox", "Le nom du titulaire de la Freebox", "Rien"], "La ligne récupère l'adresse de la Freebox. Le nom du titulaire et le RIB ne changent pas.", "family"],
    ["m311", 3, "Piège : une Série Free souscrite par un abonné Freebox. Prix la 1re année ?", ["12,99 € (pas de remise Freebox en plus)", "2,99 €", "9,99 €", "0 €"], "La Série Free ne cumule pas les remises Freebox : 12,99 € la 1re année.", "mobile"],
    ["m312", 3, "Quel avantage data le Forfait Free 5G+ offre-t-il aux abonnés Freebox qui rattachent leur abonnement ?", ["La data illimitée en France au lieu de 350 Go", "1 To", "Rien de plus", "500 Go"], "350 Go pour tous, illimité pour les abonnés Freebox qui rattachent leur abonnement.", "fiche5g"],
    ["m313", 3, "Un client a 4 forfaits Free 5G+ et une Ultra. Combien économise-t-il la 1re année ?", ["480 €", "192 €", "240 €", "120 €"], "4 lignes × 10 € × 12 mois = 480 € (l'avantage affiché par Free).", "freebox"],
]);

/* ═══════════════════════════ 🧾 GESTION & PROCESS ═══════════════════════════ */
const GESTION = fab("gestion", [
    // ── Niveau 1 ──
    ["g101", 1, "Comment un client obtient-il son code RIO mobile ?", ["En appelant le 3179 depuis sa ligne", "Au 3244", "Dans son contrat papier", "Uniquement en boutique"], "3179 depuis la ligne concernée : le RIO arrive par SMS immédiatement.", "a923"],
    ["g102", 1, "La portabilité du numéro est-elle payante ?", ["Non, elle est gratuite", "Oui, 10 €", "Oui, 49 €", "Seulement pour un fixe"], "La procédure de portabilité est gratuite.", "a891"],
    ["g103", 1, "En cas de portabilité vers Free, qui résilie l'ancien abonnement ?", ["Free s'en occupe", "Le client, par courrier", "La boutique", "Personne, il faut payer deux fois"], "La résiliation de l'ancien abonnement est prise en charge par Free.", "a891"],
    ["g104", 1, "Un client Freebox déménage. Doit-il résilier ?", ["Non, Free transfère l'abonnement sans frais", "Oui, puis se réabonner", "Oui, avec 49 € de frais", "Il doit changer de box"], "Pas besoin de résilier : Free transfère l'abonnement à la nouvelle adresse, sans frais.", "a287"],
    ["g105", 1, "Quel numéro appeler pour une demande de résiliation ?", ["3244", "3179", "3000", "1018"], "Le 3244, option « Information sur la résiliation de votre abonnement ».", "a287"],
    ["g106", 1, "Sous combien de temps une résiliation Freebox prend-elle effet ?", ["Sous 10 jours après réception de la demande", "Immédiatement", "Sous 30 jours", "À la fin du mois"], "La résiliation prend effet sous 10 jours à compter de la réception de la demande.", "a287"],
    ["g107", 1, "Dans quel délai le matériel Freebox doit-il être retourné ?", ["15 jours après la prise d'effet de la résiliation", "7 jours", "30 jours", "2 mois"], "Au plus tard 15 jours après la prise d'effet, avec le bon de retour de l'Espace Abonné.", "a287"],
    ["g108", 1, "Un client garde son numéro et part chez un autre opérateur. Doit-il résilier chez Free ?", ["Non, il donne son RIO au nouvel opérateur", "Oui, au 3244", "Oui, par courrier", "Oui, en boutique"], "Avec le RIO, la résiliation chez Free est automatique.", "a923"],
    ["g109", 1, "Peut-on garder son numéro fixe en changeant pour une Freebox ?", ["Oui, gratuitement, en demandant la portabilité", "Non", "Oui, pour 10 €", "Seulement en 09"], "Oui, gratuitement : il suffit de demander la portabilité à la souscription.", "resil"],
    ["g110", 1, "Pourquoi le client ne doit-il pas résilier lui-même son ancien opérateur en cas de portabilité ?", ["Il risquerait de perdre son numéro", "Ça coûte plus cher", "Ce n'est pas autorisé", "Ça n'a aucune importance"], "Free le prévient : contacter l'ancien opérateur fait risquer de perdre le numéro.", "a891"],
    ["g111", 1, "Où le client retrouve-t-il ses factures après une résiliation mobile ?", ["Dans l'Espace Abonné Mobile", "Elles sont supprimées", "Par courrier uniquement", "En boutique"], "Les factures restent consultables dans l'Espace Abonné Mobile.", "a923"],
    ["g112", 1, "Combien coûte l'appel au 3244 depuis une ligne Freebox ?", ["Il est inclus", "0,80 €/min", "Surtaxé", "Il est impossible"], "L'appel au 3244 est inclus depuis une ligne Freebox ou Free.", "a287"],
    ["g113", 1, "Que reçoit le client après sa demande de résiliation mobile ?", ["Un SMS de confirmation", "Rien", "Un appel", "Un colis"], "Un SMS confirme la demande.", "a923"],
    ["g114", 1, "Combien de jours avant d'emménager faut-il déclarer son déménagement ?", ["Environ 20 jours", "La veille", "2 mois", "Après l'emménagement"], "Free conseille de déclarer le déménagement environ 20 jours avant.", "demenag"],
    ["g115", 1, "Jusqu'à combien Free rembourse-t-il les frais de résiliation pour une Box 5G ?", ["50 €", "151 €", "100 €", "0 €"], "Jusqu'à 50 € pour une Box 5G (151 € pour une Freebox).", "resil"],
    ["g116", 1, "Un client perd sa carte SIM. Quelle est la première chose à faire ?", ["Prévenir Free pour suspendre la ligne", "Attendre 48 h", "Racheter un téléphone", "Changer de numéro"], "Il faut prévenir Free tout de suite. Une nouvelle SIM ou eSIM est ensuite envoyée.", "mobile"],

    // ── Niveau 2 ──
    ["g201", 2, "Un client veut résilier son mobile Free sans garder son numéro. Quelle procédure ?", ["3244, puis lettre recommandée avec AR", "3179", "SMS au 3244", "En boutique, immédiatement"], "3244, puis lettre recommandée avec accusé de réception à l'adresse donnée pendant l'appel.", "a923"],
    ["g202", 2, "Où résilier sa Freebox en ligne ?", ["Espace Abonné > Mon Abonnement > « Plus besoin de mon abonnement »", "Espace Abonné > Factures", "Sur l'appli Free TV", "On ne peut pas en ligne"], "Depuis l'Espace Abonné Freebox, rubrique « Mon Abonnement ».", "a287"],
    ["g203", 2, "Un client peut-il annuler sa demande de résiliation Freebox ?", ["Oui, depuis l'Espace Abonné tant qu'elle n'est pas effective", "Non, jamais", "Oui, en payant 49 €", "Seulement en boutique"], "L'annulation est possible tant que la résiliation n'a pas pris effet.", "a287"],
    ["g204", 2, "Après une résiliation mobile avec engagement, que se passe-t-il pour les mois restants ?", ["Ils sont facturés en une seule fois sur la facture suivante", "Ils sont annulés", "Ils sont étalés", "Ils sont remboursés"], "Les mois restants sont facturés en une fois.", "a923"],
    ["g205", 2, "Que contient la dernière facture après une résiliation mobile ?", ["Les consommations du mois précédent", "Rien", "Un remboursement automatique", "Des frais de 49 €"], "Une facture finale peut arriver avec les consommations du mois précédent.", "a923"],
    ["g206", 2, "Peut-on porter un numéro sur une ligne Free déjà existante ?", ["Oui, depuis l'Espace Abonné, si la ligne chez l'ancien opérateur n'est pas résiliée", "Non, jamais", "Oui, seulement en boutique", "Seulement pour un fixe"], "Possible depuis l'Espace Abonné, tant que l'ancien abonnement est actif.", "a885"],
    ["g207", 2, "Quels justificatifs envoyer pour le remboursement des frais de l'ancien opérateur ?", ["L'email de confirmation de souscription imprimé et la facture de clôture", "Une pièce d'identité", "Le RIB uniquement", "Rien, c'est automatique"], "L'email de souscription imprimé et la facture de clôture qui montre les frais.", "resil"],
    ["g208", 2, "Dans quel délai envoyer ces justificatifs ?", ["Dans les 2 mois suivant l'activation de la ligne", "15 jours", "6 mois", "Sans limite"], "Par courrier, dans les 2 mois suivant l'activation.", "resil"],
    ["g209", 2, "Lors d'un déménagement, quels numéros fixes peut-on garder gratuitement ?", ["Les numéros géographiques (01 à 05) et les 09", "Seulement les 09", "Aucun", "Seulement les 01"], "On peut garder son numéro géographique (01 à 05) ou en 09, sans frais.", "demenag"],
    ["g210", 2, "Après un déménagement, si le logement est éligible à la fibre, que se passe-t-il ?", ["Un technicien passe sur rendez-vous", "Le client installe tout seul", "Il faut une nouvelle box payante", "Rien"], "Si le logement est éligible à la Fibre Free, un technicien intervient sur rendez-vous.", "demenag"],
    ["g211", 2, "Comment le client valide-t-il son déménagement ?", ["Une fois les clés en main, via l'email reçu ou l'Espace Abonné", "En boutique", "Par courrier", "Automatiquement"], "Il valide le déménagement quand il a les clés, via l'email ou l'Espace Abonné.", "demenag"],
    ["g212", 2, "Où le client suit-il l'avancement de son déménagement ?", ["Dans « Suivi de commande » de l'Espace Abonné", "Au 3179", "Sur free.fr/demenagement", "Il ne peut pas"], "Rubrique « Suivi de commande », avec des notifications par email.", "demenag"],
    ["g213", 2, "Comment est retourné le matériel Freebox après résiliation ?", ["Avec le bon de retour disponible dans l'Espace Abonné", "En le déposant en mairie", "Il n'est pas à retourner", "Par le technicien"], "Le bon de retour se trouve dans l'Espace Abonné.", "a287"],
    ["g214", 2, "En cas de force majeure (par exemple un décès), comment résilier une Freebox ?", ["En contactant le 3244", "Par SMS", "Ce n'est pas possible", "En boutique uniquement"], "Il faut contacter le 3244, option information sur la résiliation.", "a287"],
    ["g215", 2, "Un client sans portabilité veut résilier son ancien FAI. Que propose Free ?", ["Une lettre de résiliation personnalisée, gratuite", "Rien", "Un appel à l'ancien opérateur", "Un remboursement de 200 €"], "Free propose gratuitement une lettre de résiliation personnalisée.", "resil"],

    // ── Niveau 3 : expert ──
    ["g301", 3, "Une résiliation Freebox est reçue le 1er du mois. Au plus tard, quand le matériel doit-il être rendu ?", ["Vers le 26 (10 jours d'effet + 15 jours de retour)", "Le 1er du mois suivant", "Le 15", "Le 11"], "Effet sous 10 jours, puis 15 jours pour retourner le matériel : environ 25 jours au total.", "a287"],
    ["g302", 3, "Piège : un client veut garder son numéro mobile et appelle le 3244 pour résilier avant de partir. Bon réflexe ?", ["Non : il donne son RIO au nouvel opérateur, la résiliation est automatique", "Oui, c'est obligatoire", "Oui, sinon il paie deux fois", "Oui, par recommandé"], "En gardant son numéro, il n'a rien à résilier : le RIO suffit.", "a923"],
    ["g303", 3, "À quelle adresse envoyer les justificatifs de remboursement des frais de résiliation ?", ["Offre préférentielle Free – 75371 Paris Cedex 08", "Free – 75008 Paris", "Free Mobile – 75371 Paris Cedex 08", "Dans l'Espace Abonné"], "Courrier à « Offre préférentielle Free – 75 371 Paris Cedex 08 ».", "resil"],
    ["g304", 3, "Condition pour obtenir le remboursement des frais de l'ancien opérateur ?", ["Les services Freebox doivent être activés (ou la Box 5G reçue)", "Être client depuis 1 an", "Avoir pris l'Ultra", "Aucune"], "Les services Freebox doivent être activés, ou la Box 5G reçue.", "resil"],
    ["g305", 3, "Piège : un client a déjà résilié son ancien opérateur mobile, puis veut porter le numéro sur sa ligne Free existante. Possible ?", ["Non : la portabilité sur ligne existante exige que l'ancien abonnement ne soit pas résilié", "Oui, toujours", "Oui, sous 30 jours", "Oui, en boutique"], "La portabilité vers une ligne existante n'est possible que si l'ancien abonnement est encore actif.", "a885"],
    ["g306", 3, "Lors d'un déménagement, la technologie n'est pas disponible à la nouvelle adresse. Que fait Free ?", ["Il propose une solution alternative selon l'éligibilité", "Il résilie avec frais", "Rien, le client perd le service", "Il facture 49 €"], "Free propose une alternative selon la technologie disponible à la nouvelle adresse.", "demenag"],
    ["g307", 3, "Un déménagement peut-il entraîner une coupure de service ?", ["Oui, selon la date de la demande et la technologie aux deux adresses", "Jamais", "Toujours 1 mois", "Seulement en fibre"], "Une interruption est possible selon le moment de la demande et la technologie (ADSL, VDSL, fibre).", "demenag"],
    ["g308", 3, "Piège : un client Freebox veut résilier pour déménager. Que lui conseilles-tu ?", ["De ne pas résilier : le déménagement est transféré sans frais", "De résilier au 3244", "De résilier et reprendre une offre", "De payer la MES"], "Pas besoin de résilier pour déménager : Free transfère l'abonnement.", "a287"],
    ["g309", 3, "Une lettre de résiliation mobile Free : quelle information est indispensable ?", ["Le numéro de la ligne concernée", "Le code RIO", "Le modèle du téléphone", "La date d'anniversaire"], "La lettre recommandée doit préciser le numéro de la ligne concernée.", "a923"],
    ["g310", 3, "Un client a résilié sa ligne Free il y a 10 jours. Il revient avec une Freebox. Que lui expliques-tu ?", ["Les remises Free Family ne s'appliquent pas (résiliation de moins de 30 jours)", "Il a la remise normale", "Il a une remise doublée", "Il doit payer 49 €"], "Remises non applicables si une ligne mobile Free a été résiliée dans les 30 jours.", "family"],
    ["g311", 3, "Le RIO fixe : comment l'obtenir ?", ["Au 3179 depuis la ligne fixe de l'ancien opérateur", "Au 3244", "Dans l'Espace Abonné Free", "Il n'existe pas"], "Le RIO fixe (12 chiffres) s'obtient au 3179 depuis la ligne fixe de l'ancien opérateur.", "resil"],
    ["g312", 3, "En cas de déménagement d'un non-abonné qui garde son numéro fixe, qui résilie l'ancien FAI ?", ["Free, grâce à la portabilité", "Le client", "Le propriétaire", "Personne"], "Avec la portabilité, Free résilie l'ancien fournisseur.", "demenag"],
]);

export const QUESTIONS: QuestionQuiz[] = [...BOX, ...MOBILE, ...GESTION];

export const THEMES_QUIZ: { id: ThemeQuiz; emoji: string; titre: string; sous: string; grad: string }[] = [
    { id: "box", emoji: "💻", titre: "Box", sous: "Offres, prix, inclus, options TV", grad: "from-slate-800 to-slate-950" },
    { id: "mobile", emoji: "📶", titre: "Mobile", sous: "Forfaits, remises Free Family, eSIM", grad: "from-[#cd1e25] to-[#9e161c]" },
    { id: "gestion", emoji: "🧾", titre: "Gestion & process", sous: "Portabilité, résiliation, déménagement", grad: "from-slate-500 to-slate-700" },
];

export const NIVEAUX_QUIZ: Record<NiveauQuiz, { label: string; points: number }> = {
    1: { label: "Les bases", points: 10 },
    2: { label: "Confirmé", points: 20 },
    3: { label: "Expert", points: 30 },
};
