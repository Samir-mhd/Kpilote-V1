"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import KPIIcon from "@/components/ui/KPIIcon";
import ManagerAuthGate from "@/components/manager/ManagerAuthGate";

const menu = [
    {
        label: "Dashboard",
        href: "/manager/dashboard",
        icon: "trend" as const,
    },
    {
        label: "Brief du matin",
        href: "/manager/brief",
        icon: "brain" as const,
    },
    {
        label: "Classement",
        href: "/manager/classement",
        icon: "trophy" as const,
    },
    {
        label: "Objectifs",
        href: "/manager/objectifs",
        icon: "target" as const,
    },
    {
        label: "Défis & Challenges",
        href: "/manager/defis",
        icon: "challenge" as const,
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

    return (
        <ManagerAuthGate>
        <div className="flex min-h-screen bg-slate-50">

            <aside className="sticky top-0 flex h-screen w-[245px] flex-col bg-slate-950 px-5 py-7 text-white">

                <Link href="/" className="mb-10 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
                        K
                    </div>
                    <span className="text-lg font-black tracking-tight">
                        KPILOTE
                    </span>
                </Link>

                <nav className="flex flex-1 flex-col gap-2">
                    {menu.map((item) => {

                        const active =
                            pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                                    active
                                        ? "bg-white/10 text-white"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                <KPIIcon
                                    name={item.icon}
                                    size={18}
                                />
                                {item.label}
                            </Link>
                        );

                    })}
                </nav>

                <div className="mt-auto rounded-2xl bg-white/5 p-4 text-xs text-slate-400">
                    KPILOTE Manager
                    <br />
                    Version Bêta
                </div>

            </aside>

            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-6 py-7">
                    {children}
                </div>
            </main>

        </div>
        </ManagerAuthGate>
    );
}