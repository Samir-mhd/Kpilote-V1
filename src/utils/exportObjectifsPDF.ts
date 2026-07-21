type LignePDF = {
    nom: string;
    cellules: Record<string, { objectif: number } | undefined>;
};

type ColonnePDF = { label: string; code: string };

const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function construireEtOuvrirPDF(titre: string, sousTitre: string, lignes: LignePDF[], colonnes: ColonnePDF[]): void {
    const dateGen = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const lignesHTML = lignes.map((ligne, i) => {
        const cellules = colonnes.map(c => {
            const val = ligne.cellules[c.code]?.objectif;
            return val !== undefined
                ? `<td><span class="chip">${val}</span></td>`
                : `<td><span class="empty">—</span></td>`;
        }).join("");
        return `<tr class="${i % 2 === 1 ? "alt" : ""}"><td class="nom">${ligne.nom}</td>${cellules}</tr>`;
    }).join("");

    const headersCols = colonnes.map(c => `<th>${c.label}</th>`).join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${titre} — KPILOTE</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4 landscape;
      margin: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #fff;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ─── Header ─── */
    .header {
      background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #a855f7 75%, #d946ef 100%);
      padding: 28px 40px 24px;
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: "";
      position: absolute;
      right: -60px; top: -60px;
      width: 260px; height: 260px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }
    .header::before {
      content: "";
      position: absolute;
      right: 80px; bottom: -80px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
    }

    .logo-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
    }
    .logo-box {
      width: 34px; height: 34px;
      background: rgba(255,255,255,0.22);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -1px;
    }
    .logo-label {
      font-size: 10px; font-weight: 800; letter-spacing: 0.35em;
      text-transform: uppercase; color: rgba(255,255,255,0.65);
    }

    .header h1 {
      font-size: 30px; font-weight: 900; color: #fff; line-height: 1.15;
      letter-spacing: -0.5px;
    }
    .header .sub {
      margin-top: 5px; font-size: 13px;
      color: rgba(255,255,255,0.6); font-weight: 500;
    }

    /* ─── Contenu ─── */
    .content {
      padding: 28px 40px 0;
    }

    /* ─── Table ─── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      padding: 10px 14px;
      font-size: 9.5px; font-weight: 800;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: #94a3b8; text-align: center;
      border-bottom: 2px solid #e2e8f0;
    }
    thead th:first-child { text-align: left; }

    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr.alt td { background: #fafbfe; }
    tbody tr:last-child { border-bottom: none; }

    tbody td {
      padding: 12px 14px;
      text-align: center;
      vertical-align: middle;
    }
    td.nom {
      text-align: left;
      font-size: 15px; font-weight: 800; color: #1e293b;
      white-space: nowrap;
    }

    .chip {
      display: inline-block;
      background: #f1f5f9;
      border-radius: 10px;
      padding: 6px 18px;
      font-size: 17px; font-weight: 900; color: #1e293b;
      min-width: 54px;
    }
    .empty { color: #cbd5e1; font-size: 14px; }

    /* ─── Footer ─── */
    .footer {
      margin-top: 24px;
      padding: 14px 40px;
      border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-brand {
      display: flex; align-items: center; gap: 8px;
    }
    .footer-logo {
      width: 22px; height: 22px;
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 900; color: #fff;
    }
    .footer-name {
      font-size: 9px; font-weight: 800;
      letter-spacing: 0.3em; text-transform: uppercase; color: #7c3aed;
    }
    .footer-date { font-size: 10px; color: #94a3b8; }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-row">
      <div class="logo-box">K</div>
      <span class="logo-label">KPILOTE Manager</span>
    </div>
    <h1>${titre}</h1>
    <p class="sub">${sousTitre}</p>
  </div>

  <div class="content">
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Conseiller</th>
          ${headersCols}
        </tr>
      </thead>
      <tbody>
        ${lignesHTML}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-brand">
      <div class="footer-logo">K</div>
      <span class="footer-name">KPILOTE</span>
    </div>
    <span class="footer-date">Généré le ${dateGen}</span>
  </div>

  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1200,height=700");
    if (!win) {
        alert("Autorise les popups pour générer le PDF.");
        return;
    }
    win.document.write(html);
    win.document.close();
}

export function exporterObjectifsPDF(
    lignes: LignePDF[],
    colonnes: ColonnePDF[]
): void {
    const now  = new Date();
    const mois = MOIS_FR[now.getMonth()];
    const annee = now.getFullYear();

    construireEtOuvrirPDF(
        `Objectifs de ${mois} ${annee}`,
        "Objectifs mensuels par conseiller et par produit",
        lignes,
        colonnes
    );
}

/** Imprime les objectifs de la semaine (lundi → dimanche fournis), même mise en page que le mensuel. */
export function exporterObjectifsSemainePDF(
    lignes: LignePDF[],
    colonnes: ColonnePDF[],
    lundi: Date
): void {
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);

    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const periodeLabel = `Semaine du ${fmt(lundi)} au ${fmt(dimanche)} ${dimanche.getFullYear()}`;

    construireEtOuvrirPDF(
        `Objectifs de la semaine`,
        `${periodeLabel} — objectifs par conseiller et par produit`,
        lignes,
        colonnes
    );
}
