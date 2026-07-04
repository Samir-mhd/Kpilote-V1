"use client";

import { useState } from "react";
import InitialesAvatar from "./InitialesAvatar";

export type AvatarEtat =
    | "souriant_main"
    | "en_feu"
    | "glacon"
    | "endormi"
    | "heureux_gagne"
    | "malheureux_perdu";

/**
 * Dossier = premier mot du nom tel quel : "Andréa Dupont" → "Andréa"
 * Préfixe fichier = premier mot normalisé : "Andréa" → "andrea"
 * Chemin final : /avatar/Andréa/andrea_souriant_main.png
 */
function prenomDossier(nom: string): string {
    return nom.split(" ")[0];
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
    const dossier = prenomDossier(prenom);  // "Andréa"
    const prefix  = normPrenom(prenom);     // "andrea"

    if (error) {
        return <InitialesAvatar nom={prenom} size={size ?? 64} />;
    }

    return (
        <img
            src={`/avatar/${dossier}/${prefix}_${etat}.png`}
            alt={prenom}
            className={className}
            style={size ? { width: size, height: size, objectFit: "contain" } : undefined}
            onError={() => setError(true)}
        />
    );
}
