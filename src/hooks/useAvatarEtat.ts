"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AvatarEtat } from "@/components/avatar/CartoonAvatar";

/** Horodatage de la première connexion du jour pour ce conseiller (localStorage). */
function getSessionStart(conseillerId: string): number {
    if (typeof window === "undefined") return Date.now();
    const today = new Date().toDateString();
    const key   = `kpilote_session_${conseillerId}`;
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.date === today) return parsed.time as number;
        }
        const now = Date.now();
        localStorage.setItem(key, JSON.stringify({ date: today, time: now }));
        return now;
    } catch {
        return Date.now();
    }
}

/**
 * Règles d'état de l'avatar :
 *
 * Aucune vente aujourd'hui :
 *   - session < 1h  → souriant_main  (accueil du matin)
 *   - session 1-2h  → glacon
 *   - session > 2h  → endormi
 *
 * Ventes présentes :
 *   - 2+ ventes en 30 min     → en_feu
 *   - dernière vente > 2h     → endormi
 *   - dernière vente > 1h     → glacon
 *   - dernière vente < 1h     → souriant_main  (actif normal)
 */
function computeEtat(timestamps: number[], sessionStart: number): AvatarEtat {
    const now     = Date.now();
    const il30min = now - 30 * 60 * 1000;
    const il1h    = now - 60 * 60 * 1000;
    const il2h    = now - 2  * 60 * 60 * 1000;

    if (timestamps.length === 0) {
        if (sessionStart >= il1h)  return "souriant_main";
        if (sessionStart < il2h)   return "endormi";
        return "glacon";
    }

    const lastSale = Math.max(...timestamps);

    if (timestamps.filter(t => t >= il30min).length >= 2) return "en_feu";
    if (lastSale < il2h) return "endormi";
    if (lastSale < il1h) return "glacon";
    return "souriant_actif";
}

export function useAvatarEtat(conseillerId: string): { etat: AvatarEtat; refresh: () => void } {
    const [etat, setEtat] = useState<AvatarEtat>("souriant_main");
    const sessionStartRef = useRef<number>(0);

    useEffect(() => {
        if (conseillerId) sessionStartRef.current = getSessionStart(conseillerId);
    }, [conseillerId]);

    const refresh = useCallback(async () => {
        if (!conseillerId) return;

        const debut = new Date();
        debut.setHours(0, 0, 0, 0);

        const { data } = await supabase
            .from("ventes")
            .select("created_at")
            .eq("conseiller_id", conseillerId)
            .or("source.neq.cerebro_check,source.is.null")
            .gte("created_at", debut.toISOString());

        const timestamps = (data ?? []).map((v: any) => new Date(v.created_at).getTime());
        setEtat(computeEtat(timestamps, sessionStartRef.current));
    }, [conseillerId]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 60_000);
        return () => clearInterval(id);
    }, [refresh]);

    return { etat, refresh };
}
