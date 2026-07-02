"use client";

import { useState } from "react";
import AvatarSVG from "./AvatarSVG";
import {
    AvatarConfig,
    SkinTone,
    HairStyle,
    HairColor,
    EyeShape,
    EyeColor,
    Expression,
    BeardStyle,
    Accessory,
    AvatarBackground,
    ShirtStyle,
    ShirtColor,
    skinPalette,
    hairPalette,
    eyeColorPalette,
    backgroundPalette,
    hairStyleOptions,
    expressionOptions,
    beardOptions,
    accessoryOptions,
    shirtStyleOptions,
    shirtColorOptions,
} from "@/types/avatar";

type Props = {
    initial: AvatarConfig;
    onSave: (config: AvatarConfig) => Promise<void>;
    saving?: boolean;
};

type Section =
    | "background"
    | "skin"
    | "hair"
    | "hairColor"
    | "eyes"
    | "eyeColor"
    | "expression"
    | "beard"
    | "accessory"
    | "outfit";

const sections: { key: Section; label: string; icon: string }[] = [
    { key: "background", label: "Fond",       icon: "🌌" },
    { key: "skin",       label: "Teint",       icon: "🧴" },
    { key: "hair",       label: "Coiffure",    icon: "✂️" },
    { key: "hairColor",  label: "Couleur",     icon: "🎨" },
    { key: "eyes",       label: "Yeux",        icon: "👁️" },
    { key: "eyeColor",   label: "Iris",        icon: "🌈" },
    { key: "expression", label: "Expression",  icon: "😊" },
    { key: "beard",      label: "Barbe",       icon: "🧔" },
    { key: "accessory",  label: "Accessoire",  icon: "✨" },
    { key: "outfit",     label: "Tenue",       icon: "👕" },
];

const eyeShapeOptions: { value: EyeShape; label: string; desc: string }[] = [
    { value: "almond",   label: "Amande",    desc: "Élégant, naturel" },
    { value: "round",    label: "Rond",      desc: "Expressif, ouvert" },
    { value: "hooded",   label: "Tombant",   desc: "Mystérieux" },
    { value: "upturned", label: "Relevé",    desc: "Confiant, vif" },
];

export default function AvatarEditor({ initial, onSave, saving = false }: Props) {
    const [config, setConfig] = useState<AvatarConfig>(initial);
    const [activeSection, setActiveSection] = useState<Section>("background");
    const [hasChanges, setHasChanges] = useState(false);

    function set<K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) {
        setConfig((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    }

    return (
        <div className="flex flex-col gap-8 xl:flex-row">

            {/* ── Preview ── */}
            <div className="flex flex-col items-center gap-6 xl:w-64 xl:flex-shrink-0">

                {/* Avatar display */}
                <div
                    className="relative overflow-hidden rounded-full shadow-[0_24px_80px_rgba(0,0,0,.5)]"
                    style={{ width: 220, height: 220 }}
                >
                    <AvatarSVG config={config} size={220} />
                </div>

                {/* Second preview at smaller size */}
                <div className="flex items-end gap-4">
                    <div className="overflow-hidden rounded-full shadow-lg">
                        <AvatarSVG config={config} size={72} />
                    </div>
                    <div className="overflow-hidden rounded-full shadow-lg">
                        <AvatarSVG config={config} size={48} />
                    </div>
                    <div className="overflow-hidden rounded-full shadow-lg">
                        <AvatarSVG config={config} size={32} />
                    </div>
                </div>

                <button
                    onClick={() => onSave(config)}
                    disabled={saving}
                    className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-base font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? "Enregistrement..." : hasChanges ? "Enregistrer ✓" : "Enregistré"}
                </button>
            </div>

            {/* ── Editor ── */}
            <div className="flex-1 min-w-0">

                {/* Section tabs — scrollable on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {sections.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setActiveSection(s.key)}
                            className={`flex-shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                activeSection === s.key
                                    ? "bg-slate-900 text-white shadow"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            {s.icon} {s.label}
                        </button>
                    ))}
                </div>

                {/* Panel */}
                <div className="mt-4 rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.08)]">

                    {/* BACKGROUND */}
                    {activeSection === "background" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Arrière-plan</p>
                            <div className="grid grid-cols-4 gap-3">
                                {backgroundPalette.map((bg) => (
                                    <button
                                        key={bg.value}
                                        onClick={() => set("background", bg.value as AvatarBackground)}
                                        className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                                            config.background === bg.value
                                                ? "ring-2 ring-violet-600 bg-violet-50"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div
                                            className="h-14 w-14 rounded-2xl shadow-md"
                                            style={{ background: `linear-gradient(135deg, ${bg.from}, ${bg.to})` }}
                                        />
                                        <span className="text-xs font-semibold text-slate-500">{bg.label}</span>
                                        {config.background === bg.value && (
                                            <div className="absolute right-2 top-2 h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center">
                                                <svg width="8" height="8" viewBox="0 0 10 10" fill="white"><path d="M1 5l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SKIN */}
                    {activeSection === "skin" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Teinte de peau</p>
                            <div className="grid grid-cols-4 gap-4">
                                {skinPalette.map((skin) => (
                                    <button
                                        key={skin.value}
                                        onClick={() => set("skin", skin.value as SkinTone)}
                                        className={`relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                                            config.skin === skin.value
                                                ? "ring-2 ring-violet-600 bg-violet-50"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div
                                            className="h-14 w-14 rounded-full shadow-md"
                                            style={{ backgroundColor: skin.base }}
                                        />
                                        <span className="text-xs font-semibold text-slate-500">{skin.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HAIR STYLE */}
                    {activeSection === "hair" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Coiffure</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {hairStyleOptions.map((style) => (
                                    <button
                                        key={style.value}
                                        onClick={() => set("hairStyle", style.value as HairStyle)}
                                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                                            config.hairStyle === style.value
                                                ? "bg-violet-50 ring-2 ring-violet-600"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-2xl flex-shrink-0">{style.icon}</span>
                                        <span className="text-sm font-semibold text-slate-700">{style.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HAIR COLOR */}
                    {activeSection === "hairColor" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Couleur de cheveux</p>
                            <div className="grid grid-cols-5 gap-3">
                                {hairPalette.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => set("hairColor", color.value as HairColor)}
                                        className={`relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                                            config.hairColor === color.value
                                                ? "ring-2 ring-violet-600 bg-violet-50"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div
                                            className="h-12 w-12 rounded-full shadow-md"
                                            style={{ background: `linear-gradient(135deg, ${color.light}, ${color.dark})` }}
                                        />
                                        <span className="text-xs font-semibold text-slate-500 text-center">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EYES SHAPE */}
                    {activeSection === "eyes" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Forme des yeux</p>
                            <div className="grid grid-cols-2 gap-3">
                                {eyeShapeOptions.map((eye) => (
                                    <button
                                        key={eye.value}
                                        onClick={() => set("eyeShape", eye.value as EyeShape)}
                                        className={`flex flex-col gap-1 rounded-2xl px-5 py-4 text-left transition-all ${
                                            config.eyeShape === eye.value
                                                ? "bg-violet-50 ring-2 ring-violet-600"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-base font-black text-slate-800">{eye.label}</span>
                                        <span className="text-xs text-slate-400">{eye.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EYE COLOR */}
                    {activeSection === "eyeColor" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Couleur des iris</p>
                            <div className="grid grid-cols-3 gap-4">
                                {eyeColorPalette.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => set("eyeColor", color.value as EyeColor)}
                                        className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all ${
                                            config.eyeColor === color.value
                                                ? "ring-2 ring-violet-600 bg-violet-50"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div
                                            className="h-14 w-14 rounded-full shadow-md border-4 border-slate-100"
                                            style={{ backgroundColor: color.iris }}
                                        >
                                            <div
                                                className="h-6 w-6 rounded-full mt-2 ml-2 opacity-40"
                                                style={{ backgroundColor: color.irisLight }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-500">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EXPRESSION */}
                    {activeSection === "expression" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Expression</p>
                            <div className="grid grid-cols-2 gap-3">
                                {expressionOptions.map((exp) => (
                                    <button
                                        key={exp.value}
                                        onClick={() => set("expression", exp.value as Expression)}
                                        className={`flex items-center gap-3 rounded-2xl px-5 py-4 transition-all ${
                                            config.expression === exp.value
                                                ? "bg-violet-50 ring-2 ring-violet-600"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-2xl">{exp.icon}</span>
                                        <span className="text-base font-semibold text-slate-700">{exp.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BEARD */}
                    {activeSection === "beard" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Barbe</p>
                            <div className="grid grid-cols-2 gap-3">
                                {beardOptions.map((beard) => (
                                    <button
                                        key={beard.value}
                                        onClick={() => set("beard", beard.value as BeardStyle)}
                                        className={`flex items-center gap-3 rounded-2xl px-5 py-4 transition-all ${
                                            config.beard === beard.value
                                                ? "bg-violet-50 ring-2 ring-violet-600"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-2xl">{beard.icon}</span>
                                        <span className="text-base font-semibold text-slate-700">{beard.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ACCESSORY */}
                    {activeSection === "accessory" && (
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Accessoire</p>
                            <div className="grid grid-cols-3 gap-3">
                                {accessoryOptions.map((acc) => (
                                    <button
                                        key={acc.value}
                                        onClick={() => set("accessory", acc.value as Accessory)}
                                        className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all ${
                                            config.accessory === acc.value
                                                ? "bg-violet-50 ring-2 ring-violet-600"
                                                : "bg-slate-50 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="text-3xl">{acc.icon}</span>
                                        <span className="text-xs font-semibold text-slate-500">{acc.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OUTFIT */}
                    {activeSection === "outfit" && (
                        <div className="space-y-8">
                            <div>
                                <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Style de col</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {shirtStyleOptions.map((style) => (
                                        <button
                                            key={style.value}
                                            onClick={() => set("shirt", style.value as ShirtStyle)}
                                            className={`rounded-2xl px-5 py-3 text-center font-semibold transition-all ${
                                                config.shirt === style.value
                                                    ? "bg-violet-50 ring-2 ring-violet-600 text-violet-700"
                                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            }`}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Couleur de la tenue</p>
                                <div className="flex flex-wrap gap-3">
                                    {shirtColorOptions.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => set("shirtColor", color.value as ShirtColor)}
                                            className={`relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                                                config.shirtColor === color.value
                                                    ? "ring-2 ring-violet-600 bg-violet-50"
                                                    : "hover:bg-slate-50"
                                            }`}
                                        >
                                            <div
                                                className="h-12 w-12 rounded-full shadow-md"
                                                style={{ backgroundColor: color.hex }}
                                            />
                                            <span className="text-xs font-semibold text-slate-500">{color.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
