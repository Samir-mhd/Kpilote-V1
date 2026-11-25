"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import KPIIcon from "@/components/ui/KPIIcon";
import ManagerAuthGate from "@/components/manager/ManagerAuthGate";
import MenuCompact from "@/components/ui/MenuCompact";
import { useModeSombre } from "@/components/ui/modeSombre";

const menu = [
    {
        label: "Dashboard",
        href: "/manager/dashboard",
        icon: "trend" as const,
    },
    {
        label: "Classement",
        href: "/manager/classement",
        icon: "trophy" as const,
    },
    {
        label: "Objectifs conseiller",
        href: "/manager/objectifs-conseiller",
        icon: "target" as const,
    },
    {
        label: "Matrice objectifs",
        href: "/manager/matrice-objectifs",
        icon: "grid" as const,
    },
    {
        label: "Défis & Challenges",
        href: "/manager/defis",
        icon: "challenge" as const,
    },
    {
        label: "Trophées",
        href: "/manager/badges",
        icon: "flame" as const,
    },
    {
        label: "Variable",
        href: "/manager/variable",
        icon: "euro" as const,
    },
    {
        label: "Outils",
        href: "/manager/outils",
        icon: "wrench" as const,
    },
    {
        label: "Historique",
        href: "/manager/historique",
        icon: "bell" as const,
    },
    {
        label: "Entretiens",
        href: "/manager/entretien",
        icon: "users" as const,
    },
    {
        label: "Gestion équipe",
        href: "/manager/gestion",
        icon: "settings" as const,
    },
];

export default function ManagerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [ouvert, setOuvert] = useState(false);
    useEffect(() => { setOuvert(false); }, [pathname]);
    const [sombre, basculerSombre] = useModeSombre("manager");

    return (
        <ManagerAuthGate>
        <div data-sombre={sombre ? "1" : undefined} className="flex min-h-screen bg-slate-50">
            <MenuCompact
                ouvert={ouvert}
                setOuvert={setOuvert}
                items={menu.map((item) => ({
                    label: item.label,
                    href: item.href,
                    icon: <KPIIcon name={item.icon} size={16} />,
                    active: pathname === item.href || pathname.startsWith(item.href + "/"),
                }))}
                pied={<>
                    <button onClick={basculerSombre} className="mb-1 flex w-full items-center justify-center rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">{sombre ? "☀️ Mode clair" : "🌙 Mode sombre"}</button>
                    <Link href="/" className="block rounded-lg px-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-300">← Accueil KPILOTE</Link>
                </>}
            />
            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl py-7 pl-20 pr-6">
                    {children}
                </div>
            </main>
        </div>
        </ManagerAuthGate>
    );
}
