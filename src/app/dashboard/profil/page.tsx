"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProfilV2 from "@/components/profil/ProfilV2";

function ProfilInner() {
    const searchParams = useSearchParams();
    return <ProfilV2 conseillerId={searchParams.get("id") ?? ""} nom={searchParams.get("nom") ?? "Conseiller"} />;
}

export default function ProfilPage() {
    return <Suspense><ProfilInner /></Suspense>;
}
