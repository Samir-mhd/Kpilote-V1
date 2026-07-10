"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import AvatarEditor from "@/components/avatar/AvatarEditor";
import { AvatarConfig, defaultAvatarConfig } from "@/types/avatar";
import { getAvatar, saveAvatar } from "@/services/avatarService";

function AvatarInner() {
    const searchParams = useSearchParams();
    const conseillerId = searchParams.get("id") ?? "";
    const prenom = searchParams.get("nom") ?? "Conseiller";

    const [config, setConfig] = useState<AvatarConfig>(defaultAvatarConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!conseillerId) return;

        getAvatar(conseillerId).then((cfg) => {
            setConfig(cfg);
            setLoading(false);
        });
    }, [conseillerId]);

    async function handleSave(newConfig: AvatarConfig) {
        if (!conseillerId) return;

        setSaving(true);
        setSaved(false);

        try {
            await saveAvatar(conseillerId, newConfig);
            setConfig(newConfig);
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-6 py-12">

                {/* Header */}
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-500">
                        KPILOTE
                    </p>

                    <h1 className="mt-3 text-4xl font-black text-slate-900">
                        Crée ton avatar, {prenom} 🎨
                    </h1>

                    <p className="mt-3 text-lg text-slate-400">
                        Personnalise ton personnage — il t'accompagnera tout au long de ta journée.
                    </p>
                </div>

                {saved && (
                    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center font-semibold text-emerald-700">
                        ✅ Avatar enregistré avec succès !
                    </div>
                )}

                <AvatarEditor
                    initial={config}
                    onSave={handleSave}
                    saving={saving}
                />

            </div>
        </main>
    );
}

export default function AvatarPage() {
    return <Suspense><AvatarInner /></Suspense>;
}
