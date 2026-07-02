import { NextResponse } from "next/server";
import { construireDashboardManager } from "@/services/managerDashboard";

export async function GET() {
    try {
        const dashboard = await construireDashboardManager();
        return NextResponse.json(dashboard);
    } catch (error) {
        console.error("[API MANAGER]", error);
        return NextResponse.json(
            { error: "Erreur lors de la construction du dashboard manager." },
            { status: 500 }
        );
    }
}