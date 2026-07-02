"use client";

import { Brain, Sparkles } from "lucide-react";

type Props = {

    open: boolean;

    emoji?: string;

    titre: string;

    message: string;

    onClose: () => void;

};

export default function KPILOTEPopup({

    open,

    titre,

    message,

    onClose,

}: Props) {

    if (!open) return null;

    return (

        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">

            <div className="relative w-full max-w-lg overflow-hidden rounded-[36px] bg-white shadow-[0_40px_120px_rgba(0,0,0,.35)]">

                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl"/>

                <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl"/>

                <div className="relative p-10">

                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl">

                        <Brain size={42} />

                    </div>

                    <h2 className="mt-8 text-center text-4xl font-black text-slate-900">

                        {titre}

                    </h2>

                    <p className="mt-6 text-center text-lg leading-8 text-slate-600">

                        {message}

                    </p>

                    <div className="mt-8 flex items-center justify-center gap-3 text-violet-600">

                        <Sparkles size={18} />

                        <span className="font-bold">

                            KPILOTE IA

                        </span>

                    </div>

                    <button

                        onClick={onClose}

                        className="mt-10 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-lg font-black text-white transition hover:scale-[1.02] active:scale-95"

                    >

                        Continuer

                    </button>

                </div>

            </div>

        </div>

    );

}