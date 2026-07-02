import { supabase } from "@/lib/supabase";
import { AvatarConfig, defaultAvatarConfig } from "@/types/avatar";

// Fusionne un config partiel (ancien schéma) avec les valeurs par défaut
// pour garantir que tous les champs requis sont présents.
function mergeWithDefaults(raw: unknown): AvatarConfig {
    if (!raw || typeof raw !== "object") return { ...defaultAvatarConfig };
    return { ...defaultAvatarConfig, ...(raw as Partial<AvatarConfig>) };
}

export async function getAvatar(conseillerId: string): Promise<AvatarConfig> {
    const { data, error } = await supabase
        .from("conseillers")
        .select("avatar_config")
        .eq("id", conseillerId)
        .single();

    if (error || !data?.avatar_config) {
        return { ...defaultAvatarConfig };
    }

    return mergeWithDefaults(data.avatar_config);
}

export async function saveAvatar(
    conseillerId: string,
    config: AvatarConfig
): Promise<void> {
    const { error } = await supabase
        .from("conseillers")
        .update({ avatar_config: config })
        .eq("id", conseillerId);

    if (error) throw error;
}

export async function getAvatarsByIds(
    ids: string[]
): Promise<Record<string, AvatarConfig>> {
    if (ids.length === 0) return {};

    const { data, error } = await supabase
        .from("conseillers")
        .select("id, avatar_config")
        .in("id", ids);

    if (error) return {};

    const result: Record<string, AvatarConfig> = {};

    (data ?? []).forEach((row: any) => {
        result[row.id] = mergeWithDefaults(row.avatar_config);
    });

    return result;
}
