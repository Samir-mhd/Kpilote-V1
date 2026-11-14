"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
    Home, BarChart3, Swords, Trophy, User, LineChart, Euro, Award, Menu, X,
} from "lucide-react";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotoUrl } from "@/services/photoService";
import { readTheme, applyTheme } from "@/components/dashboard/ThemePicker";
import { supabase } from "@/lib/supabase";

const menus = [
    { label: "Accueil",       href: "/dashboard",              Icon: Home },
    { label: "Classement",    href: "/dashboard/classement",    Icon: Trophy },
    { label: "Mes objectifs", href: "/dashboard/resultats",     Icon: BarChart3 },
    { label: "Mes stats",     href: "/dashboard/stats",          Icon: LineChart },
    { label: "Ma variable",   href: "/dashboard/variable",      Icon: Euro },
    { label: "Challenges",    href: "/dashboard/challenges",    Icon: Swords },
    { label: "Trophées",      href: "/dashboard/badges",        Icon: Award },
    { label: "Profil",        href: "/dashboard/profil",        Icon: User },
];

// Sidebar isolée pour que son useSearchParams soit wrappé dans Suspense
function SidebarInner() {
    const pathname = usePathname();
    const params = useSearchParams();
    const id = params.get("id") ?? "";
    const nom = params.get("nom") ?? "Conseiller";
    // Menu replié derrière un bouton par défaut ; l'ancien menu fixe reste accessible quelque
    // temps avec &layout=v1 (conservé d'une page à l'autre).
    const repliable = params.get("layout") !== "v1";
    const qs = id ? `?id=${id}&nom=${encodeURIComponent(nom)}${repliable ? "" : "&layout=v1"}` : "";
    const [ouvert, setOuvert] = useState(false);
    useEffect(() => { setOuvert(false); }, [pathname]);
    useEffect(() => {
        if (!ouvert) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [ouvert]);

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!id) return;
        getPhotoUrl(id).then(setPhotoUrl).catch(() => {});
    }, [id]);

    const [variableActivee, setVariableActivee] = useState(true);
    const [profilActif, setProfilActif] = useState(true);
    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const { data } = await supabase.from("conseillers").select("variable_activee, profil_actif").eq("id", id).maybeSingle();
                setVariableActivee(data?.variable_activee !== false);
                setProfilActif(data?.profil_actif !== false);
            } catch { /* défaut : variable activée, profil actif */ }
        })();
    }, [id]);

    // Profil désactivé : espace restreint (accueil, stats, variable, profil uniquement)
    const HREFS_RESTREINT = ["/dashboard", "/dashboard/stats", "/dashboard/variable", "/dashboard/profil"];
    const menusBase = profilActif ? menus : menus.filter((m) => HREFS_RESTREINT.includes(m.href));
    const menusAffiches = variableActivee ? menusBase : menusBase.filter((m) => m.href !== "/dashboard/variable");

    const classeAside = repliable
        ? `fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-slate-950 px-5 py-7 text-white transition-transform duration-300 ${ouvert ? "translate-x-0 shadow-[8px_0_40px_rgba(0,0,0,.35)]" : "-translate-x-full"}`
        : "sticky top-0 flex h-screen w-[245px] flex-col bg-slate-950 px-5 py-7 text-white";

    return (
        <>
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
                <span className="text-lg font-black tracking-tight">KPILOTE</span>
            </Link>

            <nav className="flex flex-1 flex-col gap-2">
                {menusAffiches.map(({ label, href, Icon }) => {
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
        </>
    );
}

// Fallback sidebar pendant le chargement (évite le layout shift)
function SidebarFallback() {
    return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Lu depuis l'URL côté navigateur (le layout n'est pas sous Suspense pour useSearchParams).
    const pathname = usePathname();
    const [repliable, setRepliable] = useState(true);
    useEffect(() => {
        setRepliable(new URLSearchParams(window.location.search).get("layout") !== "v1");
    }, [pathname]);
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("id") ?? "";
        applyTheme(readTheme(id));
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
                <div className={`mx-auto py-7 ${repliable ? "max-w-7xl pl-20 pr-6" : "max-w-6xl px-6"}`}>
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
