"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardManagerData } from "@/types/dashboard";

export function useManagerDashboard() {

    const [dashboard, setDashboard] =
        useState<DashboardManagerData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const refresh = useCallback(async () => {

        setLoading(true);

        try {

            const response =
                await fetch("/api/manager", {

                    cache: "no-store",

                });

            if (!response.ok) {

                throw new Error(
                    "Erreur de chargement du dashboard manager."
                );

            }

            const data =
                await response.json();

            setDashboard(data);

        } finally {

            setLoading(false);

        }

    }, []);

    useEffect(() => {

        refresh();

    }, [refresh]);

    return {

        dashboard,

        loading,

        refresh,

    };

}