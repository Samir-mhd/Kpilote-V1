"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Mode sombre des espaces conseiller et manager (clair par défaut).
 * Mémorisé par profil sur l'appareil ; `?sombre=1` / `?sombre=0` dans l'URL le force (et le mémorise).
 * Le rendu sombre est une couche CSS (globals.css, [data-sombre="1"]) posée sur la zone des pages.
 */
export function useModeSombre(profil: string): [boolean, () => void] {
    const cle = `kpilote-sombre-${profil || "defaut"}`;
    const [sombre, setSombre] = useState(false);

    useEffect(() => {
        let v = false;
        try {
            const force = new URLSearchParams(window.location.search).get("sombre");
            if (force === "1" || force === "0") { v = force === "1"; localStorage.setItem(cle, force); }
            else v = localStorage.getItem(cle) === "1";
        } catch { /* stockage indisponible : mode clair */ }
        setSombre(v);
    }, [cle]);

    const basculer = useCallback(() => {
        setSombre((s) => {
            try { localStorage.setItem(cle, s ? "0" : "1"); } catch { /* ignoré */ }
            return !s;
        });
    }, [cle]);

    return [sombre, basculer];
}
