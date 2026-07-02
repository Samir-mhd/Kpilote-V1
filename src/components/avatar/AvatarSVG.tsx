// ─── KPILOTE FACES — SVG Renderer ────────────────────────────────────────────
// Design system original. ViewBox 200×200. Portrait : visage + col visible.
// Philosophie : profondeur par gradients, pas de contours noirs épais.
// Éclairage clé haut-gauche cohérent sur tous les éléments.

import type {
    AvatarConfig,
    SkinTone,
    HairColor,
    HairStyle,
    EyeShape,
    EyeColor,
    Expression,
    BeardStyle,
    Accessory,
    AvatarBackground,
    ShirtStyle,
    ShirtColor,
} from "@/types/avatar";
import {
    skinPalette,
    hairPalette,
    eyeColorPalette,
    backgroundPalette,
} from "@/types/avatar";

type Props = { config: AvatarConfig; size?: number };

// ─── Color helpers ─────────────────────────────────────────────────────────────

function sk(skin: SkinTone) {
    return skinPalette.find((s) => s.value === skin) ?? skinPalette[3];
}
function hr(hairColor: HairColor) {
    return hairPalette.find((h) => h.value === hairColor) ?? hairPalette[1];
}
function ir(eyeColor: EyeColor) {
    return eyeColorPalette.find((e) => e.value === eyeColor) ?? eyeColorPalette[0];
}
function bg(background: AvatarBackground) {
    return backgroundPalette.find((b) => b.value === background) ?? backgroundPalette[0];
}

const shirtColors: Record<ShirtColor, { base: string; shadow: string; collar: string }> = {
    white:  { base: "#F4F4F8", shadow: "#D8D8E0", collar: "#FFFFFF" },
    navy:   { base: "#1A2A44", shadow: "#0E1A2C", collar: "#24386A" },
    slate:  { base: "#344454", shadow: "#202E3C", collar: "#445468" },
    black:  { base: "#101018", shadow: "#060608", collar: "#1C1C28" },
    sage:   { base: "#44624C", shadow: "#2C4034", collar: "#587860" },
    blush:  { base: "#7C3E50", shadow: "#542838", collar: "#9A5268" },
};

// ─── Background ────────────────────────────────────────────────────────────────

function Background({ background, uid }: { background: AvatarBackground; uid: string }) {
    const p = bg(background);
    return (
        <>
            <defs>
                <radialGradient id={`bg-${uid}`} cx="38%" cy="28%" r="75%">
                    <stop offset="0%" stopColor={p.from} />
                    {p.mid && <stop offset="45%" stopColor={p.mid} />}
                    <stop offset="100%" stopColor={p.to} />
                </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="100" fill={`url(#bg-${uid})`} />
            {/* Ambient glow top-left */}
            <ellipse cx="55" cy="45" rx="50" ry="38" fill="white" opacity="0.06" />
        </>
    );
}

// ─── Shirt & Collar ───────────────────────────────────────────────────────────

function Shirt({
    style,
    shirtColor,
    skinBase,
    uid,
}: {
    style: ShirtStyle;
    shirtColor: ShirtColor;
    skinBase: string;
    uid: string;
}) {
    const c = shirtColors[shirtColor] ?? shirtColors.navy;

    return (
        <>
            <defs>
                <radialGradient id={`shirt-${uid}`} cx="50%" cy="0%" r="80%">
                    <stop offset="0%" stopColor={c.collar} />
                    <stop offset="100%" stopColor={c.shadow} />
                </radialGradient>
            </defs>

            {/* Shirt body */}
            <path
                d="M 0 200 L 0 178 C 20 168, 50 162, 72 166 L 80 172 L 80 176 L 120 176 L 120 172 L 128 166 C 150 162, 180 168, 200 178 L 200 200 Z"
                fill={`url(#shirt-${uid})`}
            />

            {/* Neck */}
            <rect x="84" y="172" width="32" height="30" rx="4" fill={skinBase} />
            <rect x="90" y="172" width="20" height="6" fill={skinBase} opacity="0.5" />

            {/* Collar based on style */}
            {style === "crew" && (
                <path
                    d="M 80 176 C 86 170, 94 168, 100 168 C 106 168, 114 170, 120 176"
                    fill="none"
                    stroke={c.collar}
                    strokeWidth="5"
                    strokeLinecap="round"
                />
            )}
            {style === "vneck" && (
                <>
                    <path
                        d="M 80 176 L 100 192 L 120 176"
                        fill="none"
                        stroke={c.collar}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            )}
            {style === "polo" && (
                <>
                    <path
                        d="M 82 175 C 88 168, 96 165, 100 166 C 104 165, 112 168, 118 175"
                        fill="none"
                        stroke={c.collar}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Polo button */}
                    <rect x="97" y="170" width="6" height="10" rx="2" fill={c.base} />
                    <circle cx="100" cy="174" r="1.5" fill={c.shadow} />
                    <circle cx="100" cy="178" r="1.5" fill={c.shadow} />
                </>
            )}
            {style === "hoodie" && (
                <>
                    <path
                        d="M 74 178 C 72 168, 80 160, 92 160 L 100 164 L 108 160 C 120 160, 128 168, 126 178"
                        fill={c.base}
                    />
                    <path
                        d="M 92 160 L 100 180 L 108 160"
                        fill={c.shadow}
                    />
                    {/* Hood rim */}
                    <path
                        d="M 74 178 C 72 168, 80 160, 92 160"
                        fill="none"
                        stroke={c.collar}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 108 160 C 120 160, 128 168, 126 178"
                        fill="none"
                        stroke={c.collar}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </>
            )}
        </>
    );
}

// ─── Hair layers ───────────────────────────────────────────────────────────────

function HairBack({ style, hairColor, uid }: { style: HairStyle; hairColor: HairColor; uid: string }) {
    const h = hr(hairColor);

    const gradId = `hair-${uid}`;

    const grad = (
        <defs>
            <linearGradient id={gradId} x1="30%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor={h.light} />
                <stop offset="40%" stopColor={h.base} />
                <stop offset="100%" stopColor={h.dark} />
            </linearGradient>
        </defs>
    );

    const fill = `url(#${gradId})`;

    switch (style) {
        case "buzz":
            return (
                <>
                    {grad}
                    <ellipse cx="100" cy="52" rx="62" ry="22" fill={fill} opacity="0.92" />
                </>
            );

        case "short-classic":
            return (
                <>
                    {grad}
                    <path
                        d="M 36 108 C 36 64 60 44 100 44 C 140 44 164 64 164 108 C 158 82 140 58 100 58 C 60 58 42 82 36 108 Z"
                        fill={fill}
                    />
                </>
            );

        case "medium-parted":
            return (
                <>
                    {grad}
                    <path
                        d="M 32 108 C 32 58 58 40 100 40 C 142 40 168 58 168 108 C 162 78 140 54 100 54 C 60 54 38 78 32 108 Z"
                        fill={fill}
                    />
                    <path d="M 32 108 C 24 124 22 145 26 164 L 36 162 C 32 144 34 124 40 112 Z" fill={fill} />
                    <path d="M 168 108 C 176 124 178 145 174 164 L 164 162 C 168 144 166 124 160 112 Z" fill={fill} />
                </>
            );

        case "long-straight":
            return (
                <>
                    {grad}
                    <path
                        d="M 30 108 C 30 56 56 38 100 38 C 144 38 170 56 170 108 C 164 76 142 52 100 52 C 58 52 36 76 30 108 Z"
                        fill={fill}
                    />
                    <path d="M 30 108 L 22 200 L 38 200 L 44 112 Z" fill={fill} />
                    <path d="M 170 108 L 178 200 L 162 200 L 156 112 Z" fill={fill} />
                </>
            );

        case "wavy-beach":
            return (
                <>
                    {grad}
                    <path
                        d="M 32 108 C 32 58 58 40 100 40 C 142 40 168 58 168 108 C 162 78 140 54 100 54 C 60 54 38 78 32 108 Z"
                        fill={fill}
                    />
                    {/* Wavy left side */}
                    <path
                        d="M 32 108 C 24 120 28 132 24 145 C 20 158 26 168 24 178 L 34 176 C 32 166 26 156 30 144 C 34 132 30 120 38 110 Z"
                        fill={fill}
                    />
                    {/* Wavy right side */}
                    <path
                        d="M 168 108 C 176 120 172 132 176 145 C 180 158 174 168 176 178 L 166 176 C 168 166 174 156 170 144 C 166 132 170 120 162 110 Z"
                        fill={fill}
                    />
                </>
            );

        case "curly-natural":
            return (
                <>
                    {grad}
                    <circle cx="100" cy="38" r="20" fill={fill} />
                    <circle cx="72" cy="46" r="19" fill={fill} />
                    <circle cx="128" cy="46" r="19" fill={fill} />
                    <circle cx="54" cy="62" r="17" fill={fill} />
                    <circle cx="146" cy="62" r="17" fill={fill} />
                    <circle cx="60" cy="44" r="16" fill={fill} />
                    <circle cx="140" cy="44" r="16" fill={fill} />
                    <ellipse cx="100" cy="56" rx="34" ry="22" fill={fill} />
                </>
            );

        case "afro":
            return (
                <>
                    {grad}
                    <circle cx="100" cy="68" r="64" fill={fill} />
                    {/* Volume variations */}
                    <ellipse cx="68" cy="48" rx="28" ry="20" fill={h.dark} opacity="0.25" />
                    <ellipse cx="136" cy="54" rx="22" ry="18" fill={h.light} opacity="0.2" />
                </>
            );

        case "braids":
            return (
                <>
                    {grad}
                    <path
                        d="M 36 108 C 36 62 60 42 100 42 C 140 42 164 62 164 108 C 160 82 140 60 100 60 C 60 60 40 82 36 108 Z"
                        fill={fill}
                    />
                    {/* Braid strands visible on sides */}
                    {[0, 1, 2, 3].map((i) => (
                        <path
                            key={i}
                            d={`M ${26 - i * 2} ${118 + i * 12} C ${22 - i} ${130 + i * 14}, ${28 + i * 2} ${142 + i * 12}, ${24 + i} ${154 + i * 10}`}
                            stroke={h.dark}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                            opacity="0.85"
                        />
                    ))}
                    {[0, 1, 2, 3].map((i) => (
                        <path
                            key={i}
                            d={`M ${174 + i * 2} ${118 + i * 12} C ${178 + i} ${130 + i * 14}, ${172 - i * 2} ${142 + i * 12}, ${176 - i} ${154 + i * 10}`}
                            stroke={h.dark}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                            opacity="0.85"
                        />
                    ))}
                </>
            );

        case "bun-high":
            return (
                <>
                    {grad}
                    {/* Sides close to head */}
                    <path
                        d="M 38 108 C 38 68 62 48 100 48 C 138 48 162 68 162 108 C 158 84 140 62 100 62 C 60 62 42 84 38 108 Z"
                        fill={fill}
                    />
                    {/* Bun */}
                    <circle cx="100" cy="24" r="22" fill={fill} />
                    <ellipse cx="100" cy="46" rx="16" ry="9" fill={fill} />
                    {/* Bun shadow */}
                    <ellipse cx="106" cy="30" rx="10" ry="8" fill={h.dark} opacity="0.3" />
                </>
            );

        case "pixie":
            return (
                <>
                    {grad}
                    {/* Very short, textured */}
                    <path
                        d="M 42 108 C 42 70 64 50 100 50 C 136 50 158 70 158 108 C 154 86 138 64 100 64 C 62 64 46 86 42 108 Z"
                        fill={fill}
                    />
                    {/* Side sweep */}
                    <path
                        d="M 42 100 C 38 95 36 88 40 82 C 44 76 52 72 60 74 C 56 78 50 84 48 92 Z"
                        fill={fill}
                    />
                </>
            );

        default:
            return null;
    }
}

function HairFront({ style, hairColor, uid }: { style: HairStyle; hairColor: HairColor; uid: string }) {
    const h = hr(hairColor);
    const gradId = `hair-front-${uid}`;

    switch (style) {
        case "medium-parted":
            return (
                <>
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="50%">
                            <stop offset="0%" stopColor={h.base} />
                            <stop offset="100%" stopColor={h.dark} />
                        </linearGradient>
                    </defs>
                    {/* Side part fringe */}
                    <path
                        d="M 40 60 C 46 52 60 50 72 54 C 64 58 52 62 44 68 Z"
                        fill={`url(#${gradId})`}
                    />
                </>
            );

        case "long-straight":
        case "wavy-beach":
            return (
                <>
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={h.base} />
                            <stop offset="100%" stopColor={h.dark} />
                        </linearGradient>
                    </defs>
                    {/* Fringe/face-framing */}
                    <path
                        d="M 44 62 C 52 52 68 50 80 56 C 72 60 56 64 48 72 Z"
                        fill={`url(#${gradId})`}
                    />
                </>
            );

        case "curly-natural":
            return (
                <>
                    <defs>
                        <radialGradient id={gradId} cx="50%" cy="30%" r="60%">
                            <stop offset="0%" stopColor={h.light} />
                            <stop offset="100%" stopColor={h.base} />
                        </radialGradient>
                    </defs>
                    {/* Curls spilling forward */}
                    <circle cx="64" cy="54" r="13" fill={`url(#${gradId})`} />
                    <circle cx="80" cy="44" r="11" fill={`url(#${gradId})`} />
                </>
            );

        default:
            return null;
    }
}

function HairHighlight({ style, hairColor }: { style: HairStyle; hairColor: HairColor }) {
    const h = hr(hairColor);
    if (style === "buzz" || style === "afro") return null;
    return (
        <ellipse
            cx="70"
            cy={style === "bun-high" ? 54 : 58}
            rx="22"
            ry="10"
            fill={h.light}
            opacity="0.28"
            transform={`rotate(-18 70 ${style === "bun-high" ? 54 : 58})`}
        />
    );
}

// ─── Ears ──────────────────────────────────────────────────────────────────────

function Ears({ skinBase, skinDark }: { skinBase: string; skinDark: string }) {
    return (
        <>
            {/* Left ear */}
            <ellipse cx="35" cy="104" rx="9" ry="12" fill={skinBase} />
            <path
                d="M 38 98 C 40 103 40 110 38 114 C 36 112 35 108 35 104 Z"
                fill={skinDark}
                opacity="0.25"
            />
            {/* Right ear */}
            <ellipse cx="165" cy="104" rx="9" ry="12" fill={skinBase} />
            <path
                d="M 162 98 C 160 103 160 110 162 114 C 164 112 165 108 165 104 Z"
                fill={skinDark}
                opacity="0.25"
            />
        </>
    );
}

// ─── Face base ─────────────────────────────────────────────────────────────────

function Face({
    skin,
    uid,
}: {
    skin: SkinTone;
    uid: string;
}) {
    const s = sk(skin);
    const gradId = `face-${uid}`;
    const shId = `face-sh-${uid}`;

    return (
        <>
            <defs>
                {/* Skin gradient: keylight top-left */}
                <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
                    <stop offset="0%" stopColor={s.light} />
                    <stop offset="50%" stopColor={s.base} />
                    <stop offset="100%" stopColor={s.dark} />
                </radialGradient>
                {/* Chin shadow */}
                <radialGradient id={shId} cx="50%" cy="95%" r="50%">
                    <stop offset="0%" stopColor={s.dark} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={s.dark} stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Main face — KPILOTE FACES signature shape: wide cheekbones, elegant jaw */}
            <path
                d="M 100 46
                   C 140 46, 164 72, 164 108
                   C 164 145, 136 173, 100 173
                   C 64 173, 36 145, 36 108
                   C 36 72, 60 46, 100 46 Z"
                fill={`url(#${gradId})`}
            />

            {/* Chin shadow */}
            <path
                d="M 100 46
                   C 140 46, 164 72, 164 108
                   C 164 145, 136 173, 100 173
                   C 64 173, 36 145, 36 108
                   C 36 72, 60 46, 100 46 Z"
                fill={`url(#${shId})`}
            />

            {/* Cheekbone highlights — signature KPILOTE FACES element */}
            <ellipse cx="52" cy="108" rx="14" ry="9" fill="white" opacity="0.07" transform="rotate(-20 52 108)" />
            <ellipse cx="148" cy="108" rx="14" ry="9" fill="white" opacity="0.07" transform="rotate(20 148 108)" />

            {/* Temple shadow */}
            <ellipse cx="44" cy="80" rx="10" ry="16" fill={s.dark} opacity="0.1" />
            <ellipse cx="156" cy="80" rx="10" ry="16" fill={s.dark} opacity="0.1" />

            {/* Cheeks blush */}
            <ellipse cx="54" cy="118" rx="15" ry="9" fill="#FF7070" opacity="0.1" transform="rotate(-10 54 118)" />
            <ellipse cx="146" cy="118" rx="15" ry="9" fill="#FF7070" opacity="0.1" transform="rotate(10 146 118)" />
        </>
    );
}

// ─── Eyebrows ─────────────────────────────────────────────────────────────────

function Eyebrows({
    hairColor,
    expression,
}: {
    hairColor: HairColor;
    expression: Expression;
}) {
    const h = hr(hairColor);
    // Use darker shade for brows even with light hair
    const browColor = hairColor === "platinum" || hairColor === "white" || hairColor === "silver"
        ? "#808090"
        : h.dark;
    const sw = "4.5";

    const raised = expression === "bright" ? -3 : expression === "confident" ? 2 : 0;

    return (
        <>
            {/* Left brow */}
            <path
                d={`M 52 ${80 + raised} C 62 ${70 + raised} 74 ${70 + raised} 88 ${76 + raised}`}
                stroke={browColor}
                strokeWidth={sw}
                fill="none"
                strokeLinecap="round"
            />
            {/* Right brow */}
            <path
                d={`M 112 ${76 + raised} C 126 ${70 + raised} 138 ${70 + raised} 148 ${80 + raised}`}
                stroke={browColor}
                strokeWidth={sw}
                fill="none"
                strokeLinecap="round"
            />
            {/* Confident: slight inner frown */}
            {expression === "confident" && (
                <>
                    <path d="M 52 82 C 56 78 62 76 68 77" stroke={browColor} strokeWidth="1.5" fill="none" opacity="0.5" />
                    <path d="M 132 77 C 138 76 144 78 148 82" stroke={browColor} strokeWidth="1.5" fill="none" opacity="0.5" />
                </>
            )}
        </>
    );
}

// ─── Eyes ─────────────────────────────────────────────────────────────────────

function Eyes({
    eyeShape,
    eyeColor,
    expression,
    skin,
    uid,
}: {
    eyeShape: EyeShape;
    eyeColor: EyeColor;
    expression: Expression;
    skin: SkinTone;
    uid: string;
}) {
    const ir_data = ir(eyeColor);
    const sk_data = sk(skin);

    const clipL = `eye-clip-L-${uid}`;
    const clipR = `eye-clip-R-${uid}`;
    const irisGrad = `iris-${uid}`;

    if (expression === "bright") {
        // Happy squint eyes
        return (
            <>
                <path d="M 54 96 Q 76 82 98 96" stroke="#1A1A28" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M 102 96 Q 124 82 146 96" stroke="#1A1A28" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                {/* Subtle cheek crinkle */}
                <path d="M 52 100 Q 54 104 56 100" stroke={sk_data.dark} strokeWidth="1" fill="none" opacity="0.4" />
                <path d="M 144 100 Q 146 104 148 100" stroke={sk_data.dark} strokeWidth="1" fill="none" opacity="0.4" />
            </>
        );
    }

    // Eye shapes: define outer contour path
    const eyePaths: Record<EyeShape, { L: string; R: string }> = {
        almond: {
            L: "M 54 96 C 56 84 67 80 76 81 C 85 80 96 85 98 96 C 95 106 84 110 75 109 C 66 110 53 103 54 96 Z",
            R: "M 146 96 C 147 103 134 110 125 109 C 116 110 105 106 102 96 C 104 85 115 80 124 81 C 133 80 144 84 146 96 Z",
        },
        round: {
            L: "M 54 95 C 54 82 66 76 76 77 C 86 76 98 82 98 95 C 98 108 86 114 76 113 C 66 114 54 108 54 95 Z",
            R: "M 146 95 C 146 108 134 114 124 113 C 114 114 102 108 102 95 C 102 82 114 76 124 77 C 134 76 146 82 146 95 Z",
        },
        hooded: {
            L: "M 54 97 C 55 87 66 82 76 83 C 86 82 96 88 97 97 C 94 104 83 106 75 106 C 67 106 54 103 54 97 Z",
            R: "M 146 97 C 146 103 133 106 125 106 C 117 106 106 104 103 97 C 104 88 114 82 124 83 C 134 82 145 87 146 97 Z",
        },
        upturned: {
            L: "M 54 99 C 54 86 65 79 76 80 C 85 79 96 84 99 93 C 96 104 84 109 75 108 C 65 109 52 104 54 99 Z",
            R: "M 146 99 C 148 104 135 109 125 108 C 116 109 104 104 101 93 C 104 84 115 79 124 80 C 135 79 146 86 146 99 Z",
        },
    };

    const paths = eyePaths[eyeShape];

    // Eye centers
    const lx = 76, ly = 95;
    const rx = 124, ry = 95;
    const irisR = 9;
    const pupilR = 5.5;

    return (
        <>
            <defs>
                <clipPath id={clipL}><path d={paths.L} /></clipPath>
                <clipPath id={clipR}><path d={paths.R} /></clipPath>
                <radialGradient id={irisGrad} cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor={ir_data.irisLight} />
                    <stop offset="60%" stopColor={ir_data.iris} />
                    <stop offset="100%" stopColor={ir_data.iris} stopOpacity="0.7" />
                </radialGradient>
            </defs>

            {/* === Left eye === */}
            {/* White */}
            <path d={paths.L} fill="white" />
            {/* Iris + pupil clipped to eye shape */}
            <g clipPath={`url(#${clipL})`}>
                <circle cx={lx} cy={ly} r={irisR} fill={`url(#${irisGrad})`} />
                <circle cx={lx} cy={ly} r={pupilR} fill="#0C0C14" />
                {/* Primary catchlight */}
                <circle cx={lx + 3} cy={ly - 3.5} r={2.5} fill="white" />
                {/* Secondary catchlight */}
                <circle cx={lx - 2} cy={ly + 2.5} r={1.2} fill="white" opacity="0.55" />
                {/* Iris ring */}
                <circle cx={lx} cy={ly} r={irisR} fill="none" stroke={ir_data.iris} strokeWidth="1" opacity="0.4" />
            </g>
            {/* Upper lid shadow */}
            <path
                d={`M 54 96 C 56 84 67 80 76 81 C 85 80 96 85 98 96`}
                stroke="#1A1A28"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
            />
            {/* Lower lash line */}
            <path
                d={`M 56 102 Q 76 112 96 102`}
                stroke="#1A1A28"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.5"
            />

            {/* === Right eye === */}
            <path d={paths.R} fill="white" />
            <g clipPath={`url(#${clipR})`}>
                <circle cx={rx} cy={ry} r={irisR} fill={`url(#${irisGrad})`} />
                <circle cx={rx} cy={ry} r={pupilR} fill="#0C0C14" />
                <circle cx={rx + 3} cy={ry - 3.5} r={2.5} fill="white" />
                <circle cx={rx - 2} cy={ry + 2.5} r={1.2} fill="white" opacity="0.55" />
                <circle cx={rx} cy={ry} r={irisR} fill="none" stroke={ir_data.iris} strokeWidth="1" opacity="0.4" />
            </g>
            <path
                d={`M 102 96 C 104 85 115 80 124 81 C 133 80 144 84 146 96`}
                stroke="#1A1A28"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
            />
            <path
                d={`M 104 102 Q 124 112 144 102`}
                stroke="#1A1A28"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.5"
            />
        </>
    );
}

// ─── Nose ─────────────────────────────────────────────────────────────────────
// Signature KPILOTE FACES : 3-point minimal nose

function Nose({ skinDark }: { skinDark: string }) {
    return (
        <>
            {/* Bridge shadow */}
            <path
                d="M 98 103 C 95 112 92 118 93 124"
                stroke={skinDark}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.35"
            />
            <path
                d="M 102 103 C 105 112 108 118 107 124"
                stroke={skinDark}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.35"
            />
            {/* Nose tip */}
            <ellipse cx="100" cy="124" rx="10" ry="5" fill={skinDark} opacity="0.12" />
            {/* Nostrils — signature 3-point */}
            <ellipse cx="91" cy="126" rx="4.5" ry="3.5" fill={skinDark} opacity="0.28" />
            <ellipse cx="109" cy="126" rx="4.5" ry="3.5" fill={skinDark} opacity="0.28" />
            {/* Bridge highlight */}
            <ellipse cx="100" cy="110" rx="3" ry="7" fill="white" opacity="0.10" />
        </>
    );
}

// ─── Mouth ────────────────────────────────────────────────────────────────────

function Mouth({ expression, skin }: { expression: Expression; skin: SkinTone }) {
    const s = sk(skin);
    const lipTop = s.lip;
    const lipBot = s.lip + "CC"; // approximation — use base lip with slight lightening

    switch (expression) {
        case "smile":
            return (
                <>
                    {/* Philtrum shadow */}
                    <path
                        d="M 97 134 L 100 140 L 103 134"
                        stroke={s.dark}
                        strokeWidth="1"
                        fill="none"
                        opacity="0.25"
                    />
                    {/* Upper lip */}
                    <path
                        d="M 82 142 C 88 133 96 134 100 138 C 104 134 112 133 118 142 C 113 146 106 149 100 150 C 94 149 87 146 82 142 Z"
                        fill={lipTop}
                    />
                    {/* Smile line */}
                    <path
                        d="M 82 142 C 88 133 96 134 100 138 C 104 134 112 133 118 142"
                        stroke={s.dark}
                        strokeWidth="0.8"
                        fill="none"
                        opacity="0.5"
                    />
                    {/* Lower lip + teeth hint */}
                    <path
                        d="M 82 142 C 88 156 112 156 118 142 C 112 150 88 150 82 142 Z"
                        fill={s.dark}
                        opacity="0.15"
                    />
                    <path
                        d="M 86 142 C 90 151 110 151 114 142"
                        fill="white"
                        opacity="0.7"
                    />
                    <path
                        d="M 82 142 C 88 156 112 156 118 142 C 112 152 88 152 82 142 Z"
                        fill={lipTop}
                        opacity="0.7"
                    />
                    {/* Mouth corners */}
                    <circle cx="82" cy="142" r="2" fill={s.dark} opacity="0.25" />
                    <circle cx="118" cy="142" r="2" fill={s.dark} opacity="0.25" />
                </>
            );

        case "bright":
            return (
                <>
                    <path
                        d="M 80 143 C 86 133 114 133 120 143 C 114 157 86 157 80 143 Z"
                        fill={s.dark}
                        opacity="0.2"
                    />
                    <path
                        d="M 84 142 C 90 150 110 150 116 142"
                        fill="white"
                        opacity="0.8"
                    />
                    <path
                        d="M 80 143 C 86 158 114 158 120 143"
                        fill={lipTop}
                        opacity="0.7"
                    />
                    <path
                        d="M 80 143 C 86 133 100 132 100 138 C 100 132 114 133 120 143"
                        fill={lipTop}
                    />
                    <circle cx="80" cy="143" r="3" fill={s.dark} opacity="0.3" />
                    <circle cx="120" cy="143" r="3" fill={s.dark} opacity="0.3" />
                </>
            );

        case "confident":
            return (
                <>
                    {/* Subtle asymmetric smirk */}
                    <path
                        d="M 86 143 C 96 140 112 138 118 142 C 112 147 96 148 86 143 Z"
                        fill={lipTop}
                    />
                    <path
                        d="M 86 143 C 96 140 112 138 118 142"
                        stroke={s.dark}
                        strokeWidth="0.8"
                        fill="none"
                        opacity="0.4"
                    />
                    <path
                        d="M 86 143 C 90 150 110 151 118 142 C 112 148 92 149 86 143 Z"
                        fill={lipTop}
                        opacity="0.7"
                    />
                </>
            );

        default: // calm
            return (
                <>
                    {/* Philtrum */}
                    <path
                        d="M 97 135 L 100 141 L 103 135"
                        stroke={s.dark}
                        strokeWidth="0.8"
                        fill="none"
                        opacity="0.2"
                    />
                    {/* Upper lip */}
                    <path
                        d="M 84 143 C 89 135 96 136 100 139 C 104 136 111 135 116 143 C 111 147 104 149 100 150 C 96 149 89 147 84 143 Z"
                        fill={lipTop}
                    />
                    <path
                        d="M 84 143 C 89 135 96 136 100 139 C 104 136 111 135 116 143"
                        stroke={s.dark}
                        strokeWidth="0.7"
                        fill="none"
                        opacity="0.4"
                    />
                    {/* Lower lip */}
                    <path
                        d="M 84 143 C 89 151 111 151 116 143 C 111 148 89 148 84 143 Z"
                        fill={lipTop}
                        opacity="0.75"
                    />
                </>
            );
    }
}

// ─── Beard ─────────────────────────────────────────────────────────────────────

function Beard({ style, hairColor, skinDark }: { style: BeardStyle; hairColor: HairColor; skinDark: string }) {
    const h = hr(hairColor);
    const beardColor = hairColor === "platinum" || hairColor === "white" || hairColor === "silver"
        ? "#B0B0B8"
        : h.dark;

    switch (style) {
        case "stubble":
            return (
                <ellipse
                    cx="100"
                    cy="148"
                    rx="28"
                    ry="22"
                    fill={beardColor}
                    opacity="0.18"
                />
            );

        case "goatee":
            return (
                <>
                    {/* Mustache */}
                    <path
                        d="M 86 145 C 90 140 100 142 100 142 C 100 142 110 140 114 145"
                        stroke={beardColor}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.75"
                    />
                    {/* Goatee */}
                    <path
                        d="M 90 154 C 90 162 94 170 100 172 C 106 170 110 162 110 154 C 106 158 94 158 90 154 Z"
                        fill={beardColor}
                        opacity="0.7"
                    />
                </>
            );

        case "full":
            return (
                <>
                    {/* Full beard coverage */}
                    <path
                        d="M 44 130 C 40 148 44 162 56 170 C 64 175 80 178 100 178 C 120 178 136 175 144 170 C 156 162 160 148 156 130 C 148 140 136 146 100 148 C 64 146 52 140 44 130 Z"
                        fill={beardColor}
                        opacity="0.72"
                    />
                    {/* Mustache */}
                    <path
                        d="M 82 143 C 88 137 96 138 100 141 C 104 138 112 137 118 143"
                        stroke={beardColor}
                        strokeWidth="5"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.8"
                    />
                    {/* Highlight strand */}
                    <path
                        d="M 60 140 C 64 155 68 165 72 170"
                        stroke={h.light}
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.2"
                        strokeLinecap="round"
                    />
                </>
            );

        default:
            return null;
    }
}

// ─── Accessories ───────────────────────────────────────────────────────────────

function Accessory({ type }: { type: Accessory }) {
    switch (type) {
        case "glasses-thin":
            return (
                <>
                    {/* Left lens */}
                    <rect x="52" y="87" width="40" height="24" rx="8" stroke="#282830" strokeWidth="1.5" fill="none" />
                    {/* Right lens */}
                    <rect x="108" y="87" width="40" height="24" rx="8" stroke="#282830" strokeWidth="1.5" fill="none" />
                    {/* Bridge */}
                    <line x1="92" y1="99" x2="108" y2="99" stroke="#282830" strokeWidth="1.5" />
                    {/* Temple left */}
                    <line x1="36" y1="96" x2="52" y2="96" stroke="#282830" strokeWidth="1.5" />
                    {/* Temple right */}
                    <line x1="148" y1="96" x2="164" y2="96" stroke="#282830" strokeWidth="1.5" />
                    {/* Lens shine */}
                    <path d="M 55 91 L 62 91 L 60 96 L 53 96 Z" fill="white" opacity="0.1" />
                    <path d="M 111 91 L 118 91 L 116 96 L 109 96 Z" fill="white" opacity="0.1" />
                </>
            );

        case "glasses-bold":
            return (
                <>
                    <rect x="50" y="85" width="44" height="27" rx="9" fill="#101018" />
                    <rect x="106" y="85" width="44" height="27" rx="9" fill="#101018" />
                    {/* Lens */}
                    <rect x="52" y="87" width="40" height="23" rx="8" fill="#202028" />
                    <rect x="108" y="87" width="40" height="23" rx="8" fill="#202028" />
                    {/* Bridge */}
                    <rect x="94" y="93" width="12" height="5" rx="2" fill="#101018" />
                    <line x1="34" y1="95" x2="50" y2="95" stroke="#101018" strokeWidth="3" strokeLinecap="round" />
                    <line x1="150" y1="95" x2="166" y2="95" stroke="#101018" strokeWidth="3" strokeLinecap="round" />
                    {/* Shine */}
                    <path d="M 54 89 L 64 89 L 62 95 L 52 95 Z" fill="white" opacity="0.07" />
                    <path d="M 110 89 L 120 89 L 118 95 L 108 95 Z" fill="white" opacity="0.07" />
                </>
            );

        case "sunglasses":
            return (
                <>
                    <rect x="50" y="85" width="44" height="24" rx="8" fill="#0A0A10" />
                    <rect x="106" y="85" width="44" height="24" rx="8" fill="#0A0A10" />
                    {/* Tint shine */}
                    <rect x="52" y="87" width="40" height="22" rx="7" fill="#1A2040" opacity="0.8" />
                    <rect x="108" y="87" width="40" height="22" rx="7" fill="#1A2040" opacity="0.8" />
                    {/* Highlight */}
                    <path d="M 54 89 L 70 89 L 68 96 L 52 96 Z" fill="white" opacity="0.08" />
                    <path d="M 110 89 L 126 89 L 124 96 L 108 96 Z" fill="white" opacity="0.08" />
                    <rect x="94" y="92" width="12" height="4" rx="2" fill="#0A0A10" />
                    <line x1="34" y1="94" x2="50" y2="94" stroke="#0A0A10" strokeWidth="3" strokeLinecap="round" />
                    <line x1="150" y1="94" x2="166" y2="94" stroke="#0A0A10" strokeWidth="3" strokeLinecap="round" />
                </>
            );

        case "headphones":
            return (
                <>
                    {/* Arc */}
                    <path
                        d="M 30 80 Q 30 26 100 24 Q 170 26 170 80"
                        stroke="#1C1C28"
                        strokeWidth="5"
                        fill="none"
                        strokeLinecap="round"
                    />
                    {/* Left cup */}
                    <rect x="20" y="74" width="18" height="26" rx="8" fill="#1C1C28" />
                    <rect x="23" y="77" width="9" height="14" rx="5" fill="#2C2C3C" />
                    {/* Right cup */}
                    <rect x="162" y="74" width="18" height="26" rx="8" fill="#1C1C28" />
                    <rect x="168" y="77" width="9" height="14" rx="5" fill="#2C2C3C" />
                </>
            );

        case "cap":
            return (
                <>
                    {/* Brim */}
                    <ellipse cx="100" cy="50" rx="68" ry="10" fill="#181820" />
                    {/* Visor */}
                    <path d="M 32 50 L 20 60 L 180 60 L 168 50 Z" fill="#0E0E16" />
                    {/* Cap dome */}
                    <path d="M 34 50 C 34 12 166 12 166 50 Z" fill="#202028" />
                    {/* Panel seams */}
                    <path d="M 100 12 L 100 50" stroke="#2A2A38" strokeWidth="1.5" />
                    <path d="M 56 16 C 64 30 72 44 68 50" stroke="#2A2A38" strokeWidth="1" opacity="0.6" />
                    <path d="M 144 16 C 136 30 128 44 132 50" stroke="#2A2A38" strokeWidth="1" opacity="0.6" />
                    {/* Logo button */}
                    <circle cx="100" cy="13" r="5" fill="#282830" />
                    {/* Brim highlight */}
                    <path d="M 28 58 L 40 56 L 160 56 L 172 58" stroke="#303040" strokeWidth="1.5" fill="none" />
                </>
            );

        default:
            return null;
    }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AvatarSVG({ config, size = 80 }: Props) {
    const s = sk(config.skin);
    const uid = `${config.skin}-${config.hairColor}-${config.eyeColor}-${config.background}`.replace(/[^a-z0-9]/gi, "");

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
        >
            <defs>
                <clipPath id={`clip-${uid}`}>
                    <circle cx="100" cy="100" r="100" />
                </clipPath>
            </defs>

            {/* Background */}
            <Background background={config.background} uid={uid} />

            <g clipPath={`url(#clip-${uid})`}>

                {/* Shirt / collar */}
                <Shirt
                    style={config.shirt}
                    shirtColor={config.shirtColor}
                    skinBase={s.base}
                    uid={uid}
                />

                {/* Hair — back layer */}
                <HairBack style={config.hairStyle} hairColor={config.hairColor} uid={uid} />

                {/* Ears */}
                <Ears skinBase={s.base} skinDark={s.dark} />

                {/* Face */}
                <Face skin={config.skin} uid={uid} />

                {/* Eyebrows */}
                <Eyebrows hairColor={config.hairColor} expression={config.expression} />

                {/* Eyes */}
                <Eyes
                    eyeShape={config.eyeShape}
                    eyeColor={config.eyeColor}
                    expression={config.expression}
                    skin={config.skin}
                    uid={uid}
                />

                {/* Nose */}
                <Nose skinDark={s.dark} />

                {/* Mouth */}
                <Mouth expression={config.expression} skin={config.skin} />

                {/* Beard */}
                {config.beard !== "none" && (
                    <Beard style={config.beard} hairColor={config.hairColor} skinDark={s.dark} />
                )}

                {/* Hair — front / top layer */}
                <HairFront style={config.hairStyle} hairColor={config.hairColor} uid={uid} />
                <HairHighlight style={config.hairStyle} hairColor={config.hairColor} />

                {/* Accessories */}
                {config.accessory !== "none" && <Accessory type={config.accessory} />}

            </g>
        </svg>
    );
}
