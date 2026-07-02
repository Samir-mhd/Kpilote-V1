// Placeholder avatar — couleur dérivée du prénom, initiale centrée.
// Remplace AvatarSVG tant que le système d'avatars n'est pas finalisé.

const GRADIENTS = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-green-600",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-teal-500 to-emerald-600",
    "from-fuchsia-500 to-violet-600",
];

function gradient(nom: string): string {
    let h = 0;
    for (const c of nom) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return GRADIENTS[h % GRADIENTS.length];
}

type Props = { nom: string; size?: number };

export default function InitialesAvatar({ nom, size = 40 }: Props) {
    const initiale = (nom ?? "?").charAt(0).toUpperCase();
    const fontSize = Math.round(size * 0.4);

    return (
        <div
            className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient(nom)} font-black text-white select-none`}
            style={{ width: size, height: size, fontSize }}
        >
            {initiale}
        </div>
    );
}
