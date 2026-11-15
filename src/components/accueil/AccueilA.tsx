import Link from "next/link";

/** Proposition A — « Écran partagé » : deux grandes moitiés pleine hauteur, l'une pour le
 *  manager (sombre), l'autre pour les conseillers (lumineuse). Un geste, une destination. */
export default function AccueilA() {
    return (
        <main className="relative flex min-h-screen flex-col bg-[#0a0a0f] md:flex-row">
            {/* Logo centré par-dessus les deux moitiés */}
            <div className="pointer-events-none absolute inset-x-0 top-8 z-10 flex justify-center">
                <div className="flex items-center gap-3 rounded-2xl bg-black/30 px-4 py-2 backdrop-blur">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 font-black text-white">K</span>
                    <span className="text-lg font-black tracking-[0.25em] text-white"><span className="text-violet-300">KPI</span>LOTE</span>
                </div>
            </div>

            <Link href="/manager/dashboard" className="group relative flex flex-1 flex-col justify-end overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#0a0a0f] p-10 pt-32 transition-[flex] duration-500 md:hover:flex-[1.25] md:p-16">
                <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-60" />
                <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-violet-300">Espace</p>
                    <h2 className="mt-2 text-5xl font-black text-white md:text-7xl">Manager</h2>
                    <p className="mt-4 max-w-sm text-lg text-violet-200/80">Pilote la boutique, fixe les objectifs, suis l&apos;équipe en temps réel.</p>
                    <span className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3 font-black text-violet-900 transition-transform group-hover:translate-x-1">
                        Entrer <span aria-hidden="true">→</span>
                    </span>
                </div>
            </Link>

            <Link href="/choix" className="group relative flex flex-1 flex-col justify-end overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-10 pt-32 transition-[flex] duration-500 md:hover:flex-[1.25] md:p-16">
                <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-white/25 blur-3xl" />
                <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-white/80">Espace</p>
                    <h2 className="mt-2 text-5xl font-black text-white md:text-7xl">Conseiller</h2>
                    <p className="mt-4 max-w-sm text-lg text-white/85">Tes objectifs du jour, ton classement, tes trophées.</p>
                    <span className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-6 py-3 font-black text-white transition-transform group-hover:translate-x-1">
                        C&apos;est parti <span aria-hidden="true">→</span>
                    </span>
                </div>
            </Link>

            <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-xs font-bold uppercase tracking-[0.4em] text-white/40">Piloter · Optimiser · Performer</p>
        </main>
    );
}
