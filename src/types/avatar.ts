// ─── KPILOTE FACES — Design System ───────────────────────────────────────────
// Version 2.0 — Identité visuelle originale KPILOTE

export type SkinTone =
    | "porcelain"
    | "ivory"
    | "sand"
    | "honey"
    | "caramel"
    | "bronze"
    | "espresso"
    | "ebony";

export type HairStyle =
    | "short-classic"
    | "medium-parted"
    | "long-straight"
    | "curly-natural"
    | "afro"
    | "bun-high"
    | "buzz"
    | "wavy-beach"
    | "braids"
    | "pixie";

export type HairColor =
    | "jet"
    | "espresso"
    | "auburn"
    | "copper"
    | "honey"
    | "platinum"
    | "silver"
    | "white"
    | "indigo"
    | "rose";

export type EyeShape = "almond" | "round" | "hooded" | "upturned";
export type EyeColor = "obsidian" | "hazel" | "amber" | "jade" | "sky" | "slate";

export type Expression = "calm" | "smile" | "bright" | "confident";

export type BeardStyle = "none" | "stubble" | "goatee" | "full";

export type Accessory =
    | "none"
    | "glasses-thin"
    | "glasses-bold"
    | "sunglasses"
    | "headphones"
    | "cap";

export type AvatarBackground =
    | "cosmos"
    | "dusk"
    | "ocean"
    | "forest"
    | "ember"
    | "midnight"
    | "rose"
    | "slate";

export type ShirtStyle = "crew" | "polo" | "vneck" | "hoodie";
export type ShirtColor = "white" | "navy" | "slate" | "black" | "sage" | "blush";

export type AvatarConfig = {
    skin: SkinTone;
    hairStyle: HairStyle;
    hairColor: HairColor;
    eyeShape: EyeShape;
    eyeColor: EyeColor;
    expression: Expression;
    beard: BeardStyle;
    accessory: Accessory;
    background: AvatarBackground;
    shirt: ShirtStyle;
    shirtColor: ShirtColor;
};

export const defaultAvatarConfig: AvatarConfig = {
    skin: "honey",
    hairStyle: "short-classic",
    hairColor: "espresso",
    eyeShape: "almond",
    eyeColor: "obsidian",
    expression: "calm",
    beard: "none",
    accessory: "none",
    background: "cosmos",
    shirt: "crew",
    shirtColor: "navy",
};

// ─── Palette data ──────────────────────────────────────────────────────────────

export const skinPalette: {
    value: SkinTone;
    label: string;
    base: string;
    light: string;
    dark: string;
    lip: string;
}[] = [
    { value: "porcelain",  label: "Porcelaine", base: "#FCEEE4", light: "#FFFAF6", dark: "#E8C5A8", lip: "#D4847A" },
    { value: "ivory",      label: "Ivoire",     base: "#F5D9BB", light: "#FFF0DC", dark: "#D4A875", lip: "#C87068" },
    { value: "sand",       label: "Sable",      base: "#ECC99A", light: "#FAE2C0", dark: "#C89A60", lip: "#C06560" },
    { value: "honey",      label: "Miel",       base: "#DFAD76", light: "#F0CC9A", dark: "#B87838", lip: "#B86058" },
    { value: "caramel",    label: "Caramel",    base: "#C88A50", light: "#DEB07A", dark: "#9C5E28", lip: "#A05050" },
    { value: "bronze",     label: "Bronze",     base: "#A8662E", light: "#C88E50", dark: "#7C4218", lip: "#903840" },
    { value: "espresso",   label: "Espresso",   base: "#7C4220", light: "#A86440", dark: "#502010", lip: "#7A3030" },
    { value: "ebony",      label: "Ébène",      base: "#3E1E08", light: "#6A3218", dark: "#200A00", lip: "#5A2020" },
];

export const hairPalette: {
    value: HairColor;
    label: string;
    base: string;
    dark: string;
    light: string;
}[] = [
    { value: "jet",       label: "Noir jais",   base: "#111118", dark: "#060609", light: "#2A2A38" },
    { value: "espresso",  label: "Châtain",     base: "#3A2010", dark: "#1E0E06", light: "#6A3E20" },
    { value: "auburn",    label: "Auburn",      base: "#7A2810", dark: "#4A1400", light: "#B04020" },
    { value: "copper",    label: "Cuivré",      base: "#B04818", dark: "#7A2C08", light: "#D87030" },
    { value: "honey",     label: "Miel doré",   base: "#C09030", dark: "#886010", light: "#DEBA60" },
    { value: "platinum",  label: "Platine",     base: "#DADAE0", dark: "#B0B0BC", light: "#F4F4F8" },
    { value: "silver",    label: "Argenté",     base: "#A0A8B0", dark: "#707880", light: "#C8D0D8" },
    { value: "white",     label: "Blanc",       base: "#F0F0F4", dark: "#D0D0D8", light: "#FFFFFF" },
    { value: "indigo",    label: "Indigo",      base: "#2E2880", dark: "#160E58", light: "#5848B8" },
    { value: "rose",      label: "Rose",        base: "#C04878", dark: "#882048", light: "#E070A0" },
];

export const eyeColorPalette: {
    value: EyeColor;
    label: string;
    iris: string;
    irisLight: string;
}[] = [
    { value: "obsidian", label: "Obsidienne", iris: "#181818", irisLight: "#383838" },
    { value: "hazel",    label: "Noisette",  iris: "#7A5020", irisLight: "#B07838" },
    { value: "amber",    label: "Ambre",     iris: "#C07820", irisLight: "#E0A840" },
    { value: "jade",     label: "Jade",      iris: "#2A7848", irisLight: "#48A870" },
    { value: "sky",      label: "Ciel",      iris: "#2860B8", irisLight: "#5090D8" },
    { value: "slate",    label: "Ardoise",   iris: "#485870", irisLight: "#7088A0" },
];

export const backgroundPalette: {
    value: AvatarBackground;
    label: string;
    from: string;
    to: string;
    mid?: string;
}[] = [
    { value: "cosmos",   label: "Cosmos",  from: "#4C1B96", to: "#0D0828", mid: "#2D1060" },
    { value: "dusk",     label: "Crépusc.", from: "#8B2FC9", to: "#2C1654", mid: "#5C2090" },
    { value: "ocean",    label: "Océan",   from: "#0E4FA0", to: "#021830", mid: "#083070" },
    { value: "forest",   label: "Forêt",   from: "#1A6840", to: "#061C10", mid: "#0E4028" },
    { value: "ember",    label: "Braise",  from: "#C04010", to: "#400C00", mid: "#7C2008" },
    { value: "midnight", label: "Minuit",  from: "#1C1C2C", to: "#080810", mid: "#121220" },
    { value: "rose",     label: "Rose",    from: "#8C2858", to: "#280E1C", mid: "#5C1438" },
    { value: "slate",    label: "Slate",   from: "#2C3848", to: "#080E14", mid: "#182030" },
];

export const hairStyleOptions: { value: HairStyle; label: string; icon: string }[] = [
    { value: "short-classic", label: "Court classique", icon: "✂️" },
    { value: "medium-parted", label: "Mi-long séparé",  icon: "🌿" },
    { value: "long-straight", label: "Long lisse",      icon: "📏" },
    { value: "wavy-beach",    label: "Ondulé",          icon: "〰️" },
    { value: "curly-natural", label: "Bouclé naturel",  icon: "🌀" },
    { value: "afro",          label: "Afro",            icon: "☁️" },
    { value: "braids",        label: "Tresses",         icon: "🎋" },
    { value: "bun-high",      label: "Chignon haut",    icon: "🔮" },
    { value: "pixie",         label: "Pixie",           icon: "⚡" },
    { value: "buzz",          label: "Rasé court",      icon: "●" },
];

export const expressionOptions: { value: Expression; label: string; icon: string }[] = [
    { value: "calm",      label: "Calme",      icon: "😐" },
    { value: "smile",     label: "Souriant",   icon: "🙂" },
    { value: "bright",    label: "Joyeux",     icon: "😊" },
    { value: "confident", label: "Confiant",   icon: "😏" },
];

export const beardOptions: { value: BeardStyle; label: string; icon: string }[] = [
    { value: "none",    label: "Aucune",      icon: "○" },
    { value: "stubble", label: "3 jours",     icon: "·" },
    { value: "goatee",  label: "Bouc",        icon: "▼" },
    { value: "full",    label: "Complète",    icon: "▬" },
];

export const accessoryOptions: { value: Accessory; label: string; icon: string }[] = [
    { value: "none",           label: "Aucun",       icon: "✕" },
    { value: "glasses-thin",   label: "Lunettes fin", icon: "👓" },
    { value: "glasses-bold",   label: "Lunettes épai", icon: "🔲" },
    { value: "sunglasses",     label: "Soleil",      icon: "🕶️" },
    { value: "headphones",     label: "Casque",      icon: "🎧" },
    { value: "cap",            label: "Casquette",   icon: "🧢" },
];

export const shirtStyleOptions: { value: ShirtStyle; label: string }[] = [
    { value: "crew",   label: "Col rond" },
    { value: "polo",   label: "Polo" },
    { value: "vneck",  label: "Col V" },
    { value: "hoodie", label: "Hoodie" },
];

export const shirtColorOptions: { value: ShirtColor; label: string; hex: string }[] = [
    { value: "white", label: "Blanc",  hex: "#F8F8FA" },
    { value: "navy",  label: "Marine", hex: "#1E2E4A" },
    { value: "slate", label: "Ardoise", hex: "#3A4A5A" },
    { value: "black", label: "Noir",   hex: "#0E0E14" },
    { value: "sage",  label: "Sauge",  hex: "#4A6A54" },
    { value: "blush", label: "Rose",   hex: "#8A4858" },
];
