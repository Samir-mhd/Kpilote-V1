import { supabase } from "@/lib/supabase";

function isValidAvatar(url: string | null | undefined): url is string {
    return !!url && (url.startsWith("http") || url.startsWith("data:"));
}

/** Redimensionne et compresse l'image côté client, retourne un data URL JPEG. */
function compresserImage(file: File, maxPx = 320, qualite = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Image invalide."));
            img.onload = () => {
                const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
                const w = Math.round(img.width  * ratio);
                const h = Math.round(img.height * ratio);
                const canvas = document.createElement("canvas");
                canvas.width  = w;
                canvas.height = h;
                canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", qualite));
            };
            img.src = e.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Compresse la photo côté client et la sauvegarde directement dans
 * conseillers.avatar (base64 JPEG). Pas de dépendance au bucket Storage.
 */
export async function uploadPhoto(conseillerId: string, file: File): Promise<string> {
    const base64 = await compresserImage(file);

    const { error } = await supabase
        .from("conseillers")
        .update({ avatar: base64 })
        .eq("id", conseillerId);

    if (error) throw new Error(error.message);
    return base64;
}

/**
 * Charge les URLs de photos pour une liste de conseillers.
 * Retourne un map { id → url } — null si pas de photo.
 */
export async function getPhotosByIds(ids: string[]): Promise<Record<string, string | null>> {
    if (!ids.length) return {};

    const { data } = await supabase
        .from("conseillers")
        .select("id, avatar")
        .in("id", ids);

    const result: Record<string, string | null> = {};
    (data ?? []).forEach((row: any) => {
        result[row.id] = isValidAvatar(row.avatar) ? row.avatar : null;
    });
    return result;
}

/**
 * Charge l'URL de photo d'un seul conseiller.
 */
export async function getPhotoUrl(conseillerId: string): Promise<string | null> {
    const { data } = await supabase
        .from("conseillers")
        .select("avatar")
        .eq("id", conseillerId)
        .single();

    return isValidAvatar(data?.avatar) ? data!.avatar : null;
}
