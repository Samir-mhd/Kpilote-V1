"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
    Home, BarChart3, Swords, Trophy, Bell, Brain, User, LineChart,
} from "lucide-react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotoUrl } from "@/services/photoService";
import { readTheme, applyTheme } from "@/components/dashboard/ThemePicker";

const menus = [
    { label: "Accueil",       href: "/dashboard",              Icon: Home },
    { label: "Classement",    href: "/dashboard/classement",    Icon: Trophy },
    { label: "Mes stats",     href: "/dashboard/stats",          Icon: LineChart },
    { label: "Mes objectifs", href: "/dashboard/resultats",     Icon: BarChart3 },
    { label: "Challenges",    href: "/dashboard/challenges",    Icon: Swords },
    { label: "Notifications", href: "/dashboard/notifications", Icon: Bell },
    { label: "Coach IA",      href: "/dashboard/coach",         Icon: Brain },
    { label: "Profil",        href: "/dashboard/profil",        Icon: User },
];

// Sidebar isolée pour que son useSearchParams soit wrappé dans Suspense
function SidebarInner() {
    const pathname = usePathname();
    const params = useSearchParams();
    const id = params.get("id") ?? "";
    const nom = params.get("nom") ?? "Conseiller";
    const qs = id ? `?id=${id}&nom=${encodeURIComponent(nom)}` : "";

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!id) return;
        getPhotoUrl(id).then(setPhotoUrl).catch(() => {});
    }, [id]);

    return (
        <aside className="sticky top-0 flex h-screen w-[245px] flex-col bg-slate-950 px-5 py-7 text-white">

            <Link href="/" className="mb-10 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black">
                    K
                </div>
                <span className="text-lg font-black tracking-tight">KPILOTE</span>
            </Link>

            <nav className="flex flex-1 flex-col gap-2">
                {menus.map(({ label, href, Icon }) => {
                    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                    const to = `${href}${qs}`;
                    return (
                        <Link
                            key={href}
                            href={to}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                                active
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-3">
                    <PhotoAvatar nom={nom} photoUrl={photoUrl} size={34} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{nom}</p>
                        <p className="text-xs text-slate-400">Conseiller</p>
                    </div>
                </div>
                <Link href="/choix" className="mt-3 block text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    ← Changer de conseiller
                </Link>
            </div>

        </aside>
    );
}

// Fallback sidebar pendant le chargement (évite le layout shift)
function SidebarFallback() {
    return <aside className="sticky top-0 h-screen w-[245px] flex-shrink-0 bg-slate-950" />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        applyTheme(readTheme());
        const handler = (e: Event) => {
            document.documentElement.setAttribute("data-theme", (e as CustomEvent<string>).detail);
        };
        window.addEventListener("kpilote-theme", handler);
        return () => window.removeEventListener("kpilote-theme", handler);
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Suspense fallback={<SidebarFallback />}>
                <SidebarInner />
            </Suspense>
            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-6 py-7">
                    <Suspense fallback={
                        <div className="flex h-64 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                        </div>
                    }>
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
