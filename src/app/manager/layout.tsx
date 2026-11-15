"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import KPIIcon from "@/components/ui/KPIIcon";
import ManagerAuthGate from "@/components/manager/ManagerAuthGate";

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
    // Menu replié derrière un bouton (comme côté conseiller) ; l'ancien menu fixe reste
    // accessible avec ?layout=v1.
    const [repliable, setRepliable] = useState(true);
    const [ouvert, setOuvert] = useState(false);
    useEffect(() => { setRepliable(new URLSearchParams(window.location.search).get("layout") !== "v1"); }, [pathname]);
    useEffect(() => { setOuvert(false); }, [pathname]);
    useEffect(() => {
        if (!ouvert) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [ouvert]);

    const classeAside = repliable
        ? `fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-slate-950 px-5 py-7 text-white transition-transform duration-300 ${ouvert ? "translate-x-0 shadow-[8px_0_40px_rgba(0,0,0,.35)]" : "-translate-x-full"}`
        : "sticky top-0 flex h-screen w-[245px] flex-col bg-slate-950 px-5 py-7 text-white";

    return (
        <ManagerAuthGate>
        <div className="flex min-h-screen bg-slate-50">

            {repliable && (
                <>
                    <button
                        onClick={() => setOuvert(true)}
                        aria-label="Ouvrir le menu"
                        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,.35)] transition-transform hover:scale-105 active:scale-95"
                    >
                        <Menu size={20} />
                    </button>
                    <div
                        onClick={() => setOuvert(false)}
                        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${ouvert ? "opacity-100" : "pointer-events-none opacity-0"}`}
                    />
                </>
            )}

            <aside className={classeAside} aria-hidden={repliable && !ouvert}>
                {repliable && (
                    <button
                        onClick={() => setOuvert(false)}
                        aria-label="Fermer le menu"
                        className="absolute right-4 top-7 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                )}

                <Link href="/" className="mb-10 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
                        K
                    </div>
                    <span className="text-lg font-black tracking-tight">
                        KPILOTE
                    </span>
                </Link>

                <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
                    {menu.map((item) => {

                        const active =
                            pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={repliable ? item.href : `${item.href}?layout=v1`}
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
                <div className={`mx-auto py-7 ${repliable ? "max-w-7xl pl-20 pr-6" : "max-w-6xl px-6"}`}>
                    {children}
                </div>
            </main>

        </div>
        </ManagerAuthGate>
    );
}