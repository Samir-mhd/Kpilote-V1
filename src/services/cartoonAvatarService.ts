/**
 * Avatars (6 expressions) par conseiller — gérables depuis KPILOTE (Gestion équipe),
 * en remplacement des fichiers statiques /public/avatar/{Prenom}/*.png. Stockés en base64 PNG
 * directement dans une table (même approche que la photo de profil, pas de bucket Storage).
 * Clé de lecture = prénom normalisé (comme le système de fichiers historique) car CartoonAvatar
 * n'est appelé qu'avec un nom, jamais un conseillerId, sur tous ses points d'usage.
 */
import { supabase } from "@/lib/supabase";

// Copie locale (évite un import circulaire avec CartoonAvatar.tsx, qui importe ce service).
function normPrenom(nom: string): string {
    return nom.split(" ")[0]
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
}

export const ETATS_AVATAR: { code: string; label: string; emoji: string }[] = [
    { code: "souriant_main",    label: "Souriant (accueil)",       emoji: "🙂" },
    { code: "en_feu",           label: "En feu (série de ventes)", emoji: "🔥" },
    { code: "glacon",           label: "Glaçon (inactif 1h)",      emoji: "🧊" },
    { code: "endormi",          label: "Endormi (inactif 2h)",     emoji: "😴" },
    { code: "heureux_gagne",    label: "Victoire (défi gagné)",    emoji: "🏆" },
    { code: "malheureux_perdu", label: "Défaite (défi perdu)",     emoji: "😢" },
];

/** Redimensionne côté client en préservant la transparence (PNG, pas de JPEG). */
function compresserImagePng(file: File, maxPx = 400): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Image invalide."));
            img.onload = () => {
                const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
                const w = Math.round(img.width * ratio);
                const h = Math.round(img.height * ratio);
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = e.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
}

// ─── Cache partagé (lecture par prénom normalisé, utilisé par CartoonAvatar) ──────

let cachePromise: Promise<Record<string, Record<string, string>>> | null = null;

async function chargerTousLesCartoonAvatars(): Promise<Record<string, Record<string, string>>> {
    const { data } = await supabase.from("conseiller_avatars_cartoon").select("*");
    const map: Record<string, Record<string, string>> = {};
    (data ?? []).forEach((row: any) => {
        const etats: Record<string, string> = {};
        ETATS_AVATAR.forEach((e) => { if (row[e.code]) etats[e.code] = row[e.code]; });
        map[row.prenom_normalise] = etats;
    });
    return map;
}

export function getTousLesCartoonAvatarsParPrenom(): Promise<Record<string, Record<string, string>>> {
    if (!cachePromise) cachePromise = chargerTousLesCartoonAvatars();
    return cachePromise;
}

export function invaliderCacheCartoonAvatars(): void {
    cachePromise = null;
}

// ─── Gestion (Gestion équipe) ─────────────────────────────────────────────────

export async function getCartoonAvatarsConseiller(conseillerId: string): Promise<Record<string, string | null>> {
    const { data } = await supabase
        .from("conseiller_avatars_cartoon")
        .select("*")
        .eq("conseiller_id", conseillerId)
        .maybeSingle();

    const result: Record<string, string | null> = {};
    ETATS_AVATAR.forEach((e) => { result[e.code] = (data as any)?.[e.code] ?? null; });
    return result;
}

export async function uploadCartoonAvatar(conseillerId: string, nom: string, etat: string, file: File): Promise<string> {
    const base64 = await compresserImagePng(file);
    const { error } = await supabase
        .from("conseiller_avatars_cartoon")
        .upsert(
            { conseiller_id: conseillerId, prenom_normalise: normPrenom(nom), [etat]: base64, updated_at: new Date().toISOString() },
            { onConflict: "conseiller_id" }
        );
    if (error) throw new Error(error.message);
    invaliderCacheCartoonAvatars();
    return base64;
}

export async function supprimerCartoonAvatarEtat(conseillerId: string, etat: string): Promise<void> {
    const { error } = await supabase
        .from("conseiller_avatars_cartoon")
        .update({ [etat]: null, updated_at: new Date().toISOString() })
        .eq("conseiller_id", conseillerId);
    if (error) throw new Error(error.message);
    invaliderCacheCartoonAvatars();
}
