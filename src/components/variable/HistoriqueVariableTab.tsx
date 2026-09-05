"use client";

import { useEffect, useState } from "react";
import {
    HistoriqueMois,
    getHistoriqueConseiller,
    genererHistoriqueMoisSiManquant,
    moisPrecedent,
} from "@/services/variableHistorique";
import { LIGNES_DETAIL, fmtEuro } from "@/components/variable/variableUi";
import { nomMois } from "@/services/boxRaccordement";

function fmtEuroPdf(n: number) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function construireHtmlPdf(nomConseiller: string, h: HistoriqueMois): string {
    const ligneActe = (label: string, quantite: string | number, prixUnitaire: string, montant: number) => `
        <tr>
            <td>${label}</td>
            <td class="c">${quantite}</td>
            <td class="c">${prixUnitaire}</td>
            <td class="r">${fmtEuroPdf(montant)}</td>
        </tr>`;

    const lignesActes = h.lignesActes
        .map((l) => ligneActe(l.label, l.quantite, fmtEuroPdf(l.prixUnitaire), l.montant))
        .join("");

    const lignesAutres = [
        ...LIGNES_DETAIL.filter((l) => (h.detail[l.key] as number) > 0).map((l) =>
            ligneActe(l.label, "—", "—", h.detail[l.key] as number)
        ),
        ...h.extra.map((l) => ligneActe(l.label, "—", "—", l.montant)),
    ].join("");

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Variable ${nomMois(h.mois)}${nomConseiller ? " - " + nomConseiller : ""}</title>
<style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1e293b; margin: 0; }
    .entete { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #7c3aed; padding-bottom: 14px; margin-bottom: 24px; }
    .marque { font-size: 20px; font-weight: 900; color: #7c3aed; letter-spacing: .05em; }
    .titre { text-align: right; }
    .titre h1 { margin: 0; font-size: 20px; font-weight: 900; text-transform: capitalize; }
    .titre p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #7c3aed; margin: 24px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
    th.c, td.c { text-align: center; }
    th.r, td.r { text-align: right; }
    td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #fafafa; }
    .total { margin-top: 28px; display: flex; justify-content: flex-end; }
    .total-box { background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; border-radius: 14px; padding: 16px 28px; text-align: center; }
    .total-box p { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; opacity: .85; }
    .total-box strong { display: block; margin-top: 4px; font-size: 26px; }
    .empty { color: #cbd5e1; font-style: italic; padding: 10px 8px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
    <div class="entete">
        <div class="marque">KPILOTE</div>
        <div class="titre">
            <h1>Variable ${nomMois(h.mois)}</h1>
            <p>${nomConseiller || "Conseiller"}</p>
        </div>
    </div>

    <h2>Actes vendus</h2>
    <table>
        <thead><tr><th>Acte</th><th class="c">Quantité</th><th class="c">Prix unitaire</th><th class="r">Montant</th></tr></thead>
        <tbody>${lignesActes || `<tr><td colspan="4" class="empty">Aucun acte à volume ce mois-ci.</td></tr>`}</tbody>
    </table>

    <h2>Autres primes</h2>
    <table>
        <thead><tr><th>Ligne</th><th class="c">Quantité</th><th class="c">Prix unitaire</th><th class="r">Montant</th></tr></thead>
        <tbody>${lignesAutres || `<tr><td colspan="4" class="empty">Aucune autre prime ce mois-ci.</td></tr>`}</tbody>
    </table>

    <div class="total">
        <div class="total-box">
            <p>Total variable</p>
            <strong>${fmtEuroPdf(h.total)}</strong>
        </div>
    </div>
</body>
</html>`;
}

function ouvrirPdf(nomConseiller: string, h: HistoriqueMois) {
    const fenetre = window.open("", "_blank", "width=850,height=1100");
    if (!fenetre) return;
    fenetre.document.open();
    fenetre.document.write(construireHtmlPdf(nomConseiller, h));
    fenetre.document.close();
    fenetre.focus();
    setTimeout(() => fenetre.print(), 350);
}

export default function HistoriqueVariableTab({ conseillerId, nomConseiller }: { conseillerId: string; nomConseiller: string }) {
    const [historique, setHistorique] = useState<HistoriqueMois[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conseillerId) return;
        (async () => {
            await genererHistoriqueMoisSiManquant(conseillerId, moisPrecedent());
            setHistorique(await getHistoriqueConseiller(conseillerId));
            setLoading(false);
        })();
    }, [conseillerId]);

    if (loading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,.07)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">🗂️ Historique de la variable</p>
            <p className="mt-1 text-sm text-slate-400">
                Chaque mois terminé est figé ici automatiquement le mois suivant, avec le détail complet en PDF.
            </p>

            {historique.length === 0 ? (
                <p className="mt-4 py-6 text-center text-sm text-slate-300">Rien à afficher pour l'instant — reviens après la fin du mois.</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {historique.map((h) => (
                        <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div>
                                <p className="font-black capitalize text-slate-900">{nomMois(h.mois)}</p>
                                <p className="text-xs text-slate-400">Total variable : <span className="font-black text-slate-700">{fmtEuro(h.total)}</span></p>
                            </div>
                            <button
                                onClick={() => ouvrirPdf(nomConseiller, h)}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition-all hover:scale-[1.02]"
                            >
                                📄 PDF
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
