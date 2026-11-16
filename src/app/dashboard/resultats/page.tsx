"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MesObjectifsV3 from "@/components/objectifs/MesObjectifsV3";

function ResultatsInner() {
    const searchParams = useSearchParams();
    return <MesObjectifsV3 conseillerId={searchParams.get("id") ?? ""} nom={searchParams.get("nom") ?? "Conseiller"} />;
}

export default function ResultatsPage() {
    return <Suspense><ResultatsInner /></Suspense>;
}
