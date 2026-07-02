import InitialesAvatar from "./InitialesAvatar";

type Props = {
    nom: string;
    photoUrl?: string | null;
    size?: number;
};

/**
 * Affiche la photo de profil si disponible, sinon les initiales.
 * Remplace AvatarSVG partout dans l'app.
 */
export default function PhotoAvatar({ nom, photoUrl, size = 40 }: Props) {
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={nom}
                width={size}
                height={size}
                className="flex-shrink-0 rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        );
    }
    return <InitialesAvatar nom={nom} size={size} />;
}
