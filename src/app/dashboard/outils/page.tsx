"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const OUTILS = [
    { href: "/dashboard/outils/telephones", emoji: "📱", titre: "Comparateur téléphones", texte: "Prix Free Flex et comptant, caractéristiques, comparaison jusqu'à 3 modèles." },
    { href: "/dashboard/outils/odr", emoji: "🧾", titre: "Coupons ODR", texte: "Les coupons de remboursement de mobile.free.fr, à imprimer en 1 clic." },
    { href: "/dashboard/outils/box", emoji: "🧮", titre: "Calculatrice box (bêta)", texte: "Ce que paie le client aujourd'hui face à l'offre Free : box, forfaits, abonnements, économie." },
    { href: "/dashboard/quiz", emoji: "🧠", titre: "Quiz", texte: "Teste tes connaissances box, mobile et gestion : 135 questions, mode Expert à débloquer." },
];

function Contenu() {
    const sp = useSearchParams();
    const id = sp.get("id"), nom = sp.get("nom") ?? "";
    const qs = id ? `?id=${id}&nom=${encodeURIComponent(nom)}` : "";
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-500">Aide à la vente</p>
            <h1 className="text-3xl font-black text-slate-900">🧰 Outils</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {OUTILS.map((o) => (
                    <Link key={o.href} href={`${o.href}${qs}`}
                        className="group rounded-3xl bg-white p-6 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-violet-300">
                        <span className="text-4xl">{o.emoji}</span>
                        <p className="mt-3 text-lg font-black text-slate-900">{o.titre}</p>
                        <p className="mt-1 text-sm text-slate-500">{o.texte}</p>
                        <p className="mt-4 text-sm font-black text-violet-600 group-hover:underline">Ouvrir →</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function OutilsPage() {
    return <Suspense><Contenu /></Suspense>;
}
