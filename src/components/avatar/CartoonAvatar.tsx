"use client";

import { useEffect, useState } from "react";
import InitialesAvatar from "./InitialesAvatar";
import { getTousLesCartoonAvatarsParPrenom } from "@/services/cartoonAvatarService";

export type AvatarEtat =
    | "souriant_main"
    | "souriant_actif"
    | "en_feu"
    | "glacon"
    | "endormi"
    | "heureux_gagne"
    | "malheureux_perdu";

/**
 * Dossier = premier mot ASCII-normalisé : "Andréa Dupont" → "Andrea"
 * Préfixe fichier = premier mot normalisé lowercase : "Andréa" → "andrea"
 * Chemin final : /avatar/Andrea/andrea_souriant_main.png
 */
function prenomDossier(nom: string): string {
    const p = nom.split(" ")[0]
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "");
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

export function normPrenom(nom: string): string {
    return nom.split(" ")[0]
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
}

interface Props {
    prenom: string;
    etat?: AvatarEtat;
    className?: string;
    size?: number;
}

export default function CartoonAvatar({ prenom, etat = "souriant_main", className = "", size }: Props) {
    const [error, setError] = useState(false);
    const [perso, setPerso] = useState<Record<string, string> | null>(null);
    const dossier   = prenomDossier(prenom);
    const prefix    = normPrenom(prenom);
    const imageEtat = etat === "souriant_actif" ? "souriant_main" : etat;

    useEffect(() => {
        let annule = false;
        getTousLesCartoonAvatarsParPrenom()
            .then((map) => { if (!annule) setPerso(map[prefix] ?? null); })
            .catch(() => { if (!annule) setPerso(null); });
        return () => { annule = true; };
    }, [prefix]);

    if (error) {
        return <InitialesAvatar nom={prenom} size={size ?? 64} />;
    }

    // Priorité à l'avatar uploadé depuis KPILOTE ; fallback sur le fichier statique historique.
    const src = perso?.[imageEtat] || `/avatar/${dossier}/${prefix}_${imageEtat}.png`;

    return (
        <img
            src={src}
            alt={prenom}
            className={className}
            style={size ? { width: size, height: size, objectFit: "contain" } : undefined}
            onError={() => { console.warn(`[CartoonAvatar] échec chargement → ${src.slice(0, 60)}`); setError(true); }}
        />
    );
}
