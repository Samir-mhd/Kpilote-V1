/**
 * Export PDF des objectifs (v2) : même lecture que le tableau à l'écran — colonnes groupées
 * (Core / Upsell / Combo / Auto), jours planifiés, total équipe et objectif boutique.
 * Mise en page sobre pour l'impression (peu d'encre : pas de bandeau plein).
 */

export type GroupePDF = { titre: string; couleur: string; colonnes: { code: string; label: string }[] };
export type LignePDFv2 = { nom: string; photoUrl?: string | null; jours: number; valeurs: Record<string, number | null> };

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function esc(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function avatar(nom: string, photoUrl?: string | null): string {
    if (photoUrl) return `<img class="av" src="${photoUrl}" alt="" />`;
    return `<span class="av av-txt">${esc(nom.charAt(0).toUpperCase())}</span>`;
}

function ouvrir(html: string) {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) { alert("Autorise les popups pour générer le PDF."); return; }
    win.document.write(html);
    win.document.close();
}

export function exporterObjectifsPDFv2(opts: {
    titre: string;
    periode: string;
    groupes: GroupePDF[];
    lignes: LignePDFv2[];
    /** Objectif boutique par code (ligne de comparaison) — mensuel uniquement. */
    boutique?: Record<string, number>;
    note?: string;
}): void {
    const { titre, periode, groupes, lignes, boutique, note } = opts;
    const cols = groupes.flatMap((g) => g.colonnes.map((c) => ({ ...c, couleur: g.couleur })));
    const total = (code: string) => lignes.reduce((t, l) => t + (l.valeurs[code] ?? 0), 0);
    const dateGen = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const enteteGroupes = groupes.map((g) =>
        `<th colspan="${g.colonnes.length}" class="grp"><span style="color:${g.couleur};border-color:${g.couleur}">${esc(g.titre)}</span></th>`).join("");
    const enteteCols = cols.map((c) => `<th class="col">${esc(c.label)}</th>`).join("");

    const lignesHTML = lignes.map((l) => {
        const cells = cols.map((c, i) => {
            const v = l.valeurs[c.code];
            const debutGroupe = i > 0 && cols[i - 1].couleur !== c.couleur ? " sep" : "";
            return `<td class="num${debutGroupe}">${v === null || v === undefined ? '<span class="vide">·</span>' : v === 0 ? '<span class="zero">0</span>' : v}</td>`;
        }).join("");
        return `<tr><td class="nom"><div class="nc">${avatar(l.nom, l.photoUrl)}<span>${esc(l.nom.split(" ")[0])}</span></div></td><td class="jours">${l.jours}</td>${cells}</tr>`;
    }).join("");

    const totalHTML = `<tr class="tot"><td class="nom lbl">Total équipe</td><td class="jours">${lignes.reduce((t, l) => t + l.jours, 0)}</td>${cols.map((c, i) => `<td class="num${i > 0 && cols[i - 1].couleur !== c.couleur ? " sep" : ""}">${total(c.code)}</td>`).join("")}</tr>`;
    const boutiqueHTML = boutique ? `<tr class="btq"><td class="nom lbl">Objectif boutique</td><td></td>${cols.map((c, i) => `<td class="num${i > 0 && cols[i - 1].couleur !== c.couleur ? " sep" : ""}">${boutique[c.code] ?? "—"}</td>`).join("")}</tr>` : "";

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${esc(titre)} — KPILOTE</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 landscape;margin:12mm 12mm 10mm}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .top{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:2px solid #0f172a;margin-bottom:16px}
  .brand{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#64748b}
  .k{width:22px;height:22px;border-radius:6px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;letter-spacing:0}
  h1{margin-top:8px;font-size:26px;font-weight:900;letter-spacing:-.5px}
  .periode{text-align:right;font-size:12px;color:#64748b;font-weight:600}
  .periode b{display:block;font-size:16px;color:#0f172a;font-weight:900}
  table{width:100%;border-collapse:collapse}
  th.grp{padding:0 4px 6px;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
  th.grp span{display:block;border-bottom:2px solid;padding-bottom:4px}
  th.col{padding:6px 4px;font-size:10.5px;font-weight:800;color:#334155;border-bottom:1px solid #cbd5e1}
  th.left{text-align:left;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;padding:6px 4px;border-bottom:1px solid #cbd5e1;vertical-align:bottom}
  td{padding:7px 4px;border-bottom:1px solid #eef2f6}
  td.nom{font-size:13px;font-weight:800;white-space:nowrap}
  .nc{display:flex;align-items:center;gap:8px}
  td.jours{text-align:center;font-size:12px;font-weight:700;color:#64748b}
  td.num{text-align:center;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
  td.sep,th.sep{border-left:1px solid #e2e8f0}
  .zero,.vide{color:#cbd5e1;font-weight:600}
  .av{width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0}
  .av-txt{display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#475569;font-size:11px;font-weight:900}
  tr.tot td{border-top:2px solid #0f172a;border-bottom:none;font-weight:900}
  tr.btq td{color:#047857;border-bottom:none}
  td.lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase}
  .pied{margin-top:14px;display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8}
</style></head><body>
  <div class="top">
    <div>
      <div class="brand"><span class="k">K</span>KPILOTE · Objectifs</div>
      <h1>${esc(titre)}</h1>
    </div>
    <div class="periode">${esc(periode)}</div>
  </div>
  <table>
    <thead>
      <tr><th class="left" rowspan="2">Conseiller</th><th class="left" rowspan="2" style="text-align:center">Jours</th>${enteteGroupes}</tr>
      <tr>${enteteCols}</tr>
    </thead>
    <tbody>${lignesHTML}${totalHTML}${boutiqueHTML}</tbody>
  </table>
  <div class="pied"><span>${esc(note ?? "")}</span><span>Généré le ${dateGen}</span></div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
    ouvrir(html);
}

export function nomMoisFr(d: Date = new Date()): string {
    return `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}
