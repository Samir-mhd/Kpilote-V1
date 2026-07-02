"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .catch(() => {
                // Silencieux en dev si le SW échoue (ex: HTTP)
            });
    }, []);

    return null;
}
