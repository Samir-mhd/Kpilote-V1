import Link from "next/link";

/** Proposition C — « Vitrine » : fond sombre profond avec halo animé, grand titre éditorial,
 *  deux cartes en verre dépoli avec icône, description et aperçu de ce qu'on y trouve. */
export default function AccueilC() {
    const cartes = [
        {
            href: "/choix", titre: "Espace conseiller", emoji: "⚡",
            texte: "Mes objectifs, ma cagnotte, mon classement.",
            puces: ["Défi du jour", "Classement en direct", "Trophées"],
            accent: "from-fuchsia-500 to-orange-400",
        },
        {
            href: "/manager/dashboard", titre: "Espace manager", emoji: "📊",
            texte: "La boutique et l'équipe en un coup d'œil.",
            puces: ["Objectifs & planning", "Classement équipe", "Variable"],
            accent: "from-violet-500 to-indigo-500",
        },
    ];
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#07060d] px-6 py-16">
            <div className="pointer-events-none absolute left-1/2 top-[-20%] h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/40 via-fuchsia-600/25 to-transparent blur-3xl motion-safe:animate-pulse" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />

            <div className="relative flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-black text-white shadow-[0_0_40px_rgba(168,85,247,.5)]">K</span>
                <span className="text-xl font-black tracking-[0.25em] text-white"><span className="text-violet-300">KPI</span>LOTE</span>
            </div>

            <h1 className="relative mt-10 max-w-3xl text-center text-5xl font-black leading-[1.05] text-white sm:text-7xl">
                Chaque vente <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">compte.</span>
            </h1>
            <p className="relative mt-5 text-center text-lg text-white/55">Piloter · Optimiser · Performer</p>

            <div className="relative mt-14 grid w-full max-w-4xl gap-5 md:grid-cols-2">
                {cartes.map((c) => (
                    <Link key={c.href} href={c.href} className="group relative overflow-hidden rounded-[28px] bg-white/[0.05] p-7 ring-1 ring-white/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/[0.08] hover:ring-white/25">
                        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${c.accent} opacity-25 blur-3xl transition-opacity group-hover:opacity-50`} />
                        <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.accent} text-2xl shadow-lg`}>{c.emoji}</span>
                        <h2 className="relative mt-6 text-3xl font-black text-white">{c.titre}</h2>
                        <p className="relative mt-2 text-white/60">{c.texte}</p>
                        <div className="relative mt-6 flex flex-wrap gap-2">
                            {c.puces.map((p) => <span key={p} className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white/70 ring-1 ring-white/10">{p}</span>)}
                        </div>
                        <span className="relative mt-8 inline-flex items-center gap-2 font-black text-white">
                            Entrer <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                    </Link>
                ))}
            </div>
        </main>
    );
}
