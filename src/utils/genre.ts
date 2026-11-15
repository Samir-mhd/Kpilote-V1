/**
 * Accords en genre dans toute l'app, d'après le genre saisi par le manager (Réglages → Gestion
 * des conseillers : "H" / "F"). Genre inconnu = masculin (forme par défaut historique).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Genre = "H" | "F" | null;

/** Forme masculine ou féminine selon le genre. */
export function accord(genre: Genre | undefined, masculin: string, feminin: string): string {
    return genre === "F" ? feminin : masculin;
}

/** Remplace les jetons d'accord des phrases : `{e}` ("Prêt{e}") → "e" / "", `{ne}` ("Champion{ne}") → "ne" / "". */
export function accorderPhrase(phrase: string, genre: Genre | undefined): string {
    const f = genre === "F";
    return phrase.replace(/\{e\}/g, f ? "e" : "").replace(/\{ne\}/g, f ? "ne" : "");
}

/** "1er" / "1re". */
export function premier(genre: Genre | undefined): string {
    return genre === "F" ? "1re" : "1er";
}

let cache: Promise<Record<string, Genre>> | null = null;

/** Genre de chaque conseiller (id → genre), chargé une seule fois par session. */
export function getGenres(): Promise<Record<string, Genre>> {
    if (!cache) {
        cache = Promise.resolve(supabase.from("conseillers").select("id, genre"))
            .then(({ data }) => Object.fromEntries((data ?? []).map((c: { id: string; genre: string | null }) => [c.id, (c.genre === "F" || c.genre === "H" ? c.genre : null) as Genre])))
            .catch(() => { cache = null; return {}; });
    }
    return cache;
}

/** Hook : genres de toute l'équipe (vide tant que non chargé → masculin par défaut). */
export function useGenres(): Record<string, Genre> {
    const [genres, setGenres] = useState<Record<string, Genre>>({});
    useEffect(() => { getGenres().then(setGenres); }, []);
    return genres;
}
