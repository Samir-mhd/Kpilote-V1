import { supabase } from "@/lib/supabase";

export async function envoyerReaction(fromId: string, fromNom: string, toId: string, emoji: string) {
    await supabase.from("reactions").insert({ from_id: fromId, to_id: toId, from_nom: fromNom, emoji });
}
