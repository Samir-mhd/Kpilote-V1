import { supabase } from "@/lib/supabase";

const BUCKET = "photos";

/**
 * Upload une photo de profil dans Supabase Storage et sauvegarde l'URL
 * dans conseillers.avatar.
 * Le bucket "photos" doit exister et être public dans Supabase Storage.
 */
export async function uploadPhoto(conseillerId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${conseillerId}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // On ajoute un timestamp pour forcer le navigateur à recharger l'image
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error } = await supabase
        .from("conseillers")
        .update({ avatar: url })
        .eq("id", conseillerId);

    if (error) throw new Error(error.message);

    return url;
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
        const url = row.avatar;
        result[row.id] = url && url.startsWith("http") ? url : null;
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

    const url = data?.avatar;
    return url && url.startsWith("http") ? url : null;
}
