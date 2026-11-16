"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MesStatsV2 from "@/components/stats/MesStatsV2";

function StatsInner() {
    const conseillerId = useSearchParams().get("id") ?? "";
    return (
        <div className="space-y-7">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">Analytics</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Mes stats</h1>
                <p className="mt-1 text-sm text-slate-400">Tes habitudes de vente, tes progrès et tes records</p>
            </div>
            <MesStatsV2 conseillerId={conseillerId} />
        </div>
    );
}

export default function StatsPage() {
    return <Suspense><StatsInner /></Suspense>;
}
