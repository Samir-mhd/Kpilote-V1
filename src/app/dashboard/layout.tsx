"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
    Home, BarChart3, Swords, Trophy, User, LineChart, Euro, Award, Moon, Wrench,
} from "lucide-react";
import ValiderJourneeModal from "@/components/dashboard/ValiderJourneeModal";
import PhotoAvatar from "@/components/avatar/PhotoAvatar";
import { getPhotoUrl } from "@/services/photoService";
import { readTheme, applyTheme } from "@/components/dashboard/ThemePicker";
import { supabase } from "@/lib/supabase";
import MenuCompact from "@/components/ui/MenuCompact";
import { useModeSombre } from "@/components/ui/modeSombre";
import BoutonModeSombre from "@/components/ui/BoutonModeSombre";

const menus = [
    { label: "Accueil",       href: "/dashboard",              Icon: Home },
    { label: "Classement",    href: "/dashboard/classement",    Icon: Trophy },
    { label: "Mes objectifs", href: "/dashboard/resultats",     Icon: BarChart3 },
    { label: "Mes stats",     href: "/dashboard/stats",          Icon: LineChart },
    { label: "Ma variable",   href: "/dashboard/variable",      Icon: Euro },
    { label: "Challenges",    href: "/dashboard/challenges",    Icon: Swords },
    { label: "Trophées",      href: "/dashboard/badges",        Icon: Award },
    { label: "Profil",        href: "/dashboard/profil",        Icon: User },
    { label: "Outils",        href: "/dashboard/outils",        Icon: Wrench },
    { label: "Bilan du soir", href: "/dashboard/bilan",         Icon: Moon },
];

// Menu isolé pour que son useSearchParams soit wrappé dans Suspense
function SidebarInner() {
    const pathname = usePathname();
    const params = useSearchParams();
    const id = params.get("id") ?? "";
    const nom = params.get("nom") ?? "Conseiller";
    const qs = id ? `?id=${id}&nom=${encodeURIComponent(nom)}` : "";
    const [ouvert, setOuvert] = useState(false);
    const [validation, setValidation] = useState(false);
    useEffect(() => { setOuvert(false); }, [pathname]);

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

    return (
        <>
        {validation && id && <ValiderJourneeModal conseillerId={id} nom={nom} qs={qs} onClose={() => setValidation(false)} />}
        <MenuCompact
            ouvert={ouvert}
            setOuvert={setOuvert}
            items={menusAffiches.map(({ label, href, Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return { label, href: `${href}${qs}`, icon: <Icon size={16} strokeWidth={active ? 2.5 : 2} />, active };
            })}
            pied={
                <>
                {id && (
                    <button
                        onClick={() => { setOuvert(false); setValidation(true); }}
                        className="mb-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-black text-white transition-all hover:brightness-110 active:scale-[0.98]"
                    >
                        🌙 Valider ma journée
                    </button>
                )}
                <div className="flex items-center gap-2 py-1">
                    <PhotoAvatar nom={nom} photoUrl={photoUrl} size={26} />
                    <p className="min-w-0 flex-1 truncate text-xs font-black text-white">{nom}</p>
                    <Link href="/" className="shrink-0 text-[11px] text-slate-500 hover:text-slate-300">Changer</Link>
                </div>
                </>
            }
        />
        </>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [profilId, setProfilId] = useState("");
    useEffect(() => { setProfilId(new URLSearchParams(window.location.search).get("id") ?? ""); }, []);
    const [sombre, basculerSombre] = useModeSombre(`conseiller-${profilId}`);
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
        <div data-sombre={sombre ? "1" : undefined} className="flex min-h-screen bg-slate-50">
            <BoutonModeSombre sombre={sombre} basculer={basculerSombre} />
            <Suspense fallback={null}>
                <SidebarInner />
            </Suspense>
            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl py-7 pl-20 pr-6">
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
