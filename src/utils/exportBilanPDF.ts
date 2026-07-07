const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export type BilanProduit = {
    label: string;
    emoji: string;
    ventes: number;
    objectif: number;
    taux: number;
};

export type Semaine = { label: string; ventes: number };
export type Tendance = "acceleration" | "regulier" | "ralentissement";

export type BilanExport = {
    nom: string;
    avatarUrl?: string | null;
    moisLabel: string;
    produits: BilanProduit[];
    totalVentes: number;
    totalObjectif: number;
    tauxGlobal: number;
    meilleurProduit: string | null;
    produitEnRetard: string | null;
    defis: { gagne: number; perdu: number; egalite: number };
    challenges: { reussi: number; echoue: number; enCours: number };
    classement: { rang: number; total: number };
    semaines: Semaine[];
    tendance: Tendance;
};

function barreHTML(taux: number, couleur: string): string {
    const w = Math.min(taux, 100);
    return `<div style="height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${w}%;border-radius:3px;background:${couleur};"></div>
    </div>`;
}

function momentumHTML(semaines: Semaine[], tendance: Tendance): string {
    const max = Math.max(...semaines.map(s => s.ventes), 1);
    const emoji  = tendance === "acceleration" ? "📈" : tendance === "ralentissement" ? "📉" : "➡️";
    const label  = tendance === "acceleration" ? "Accélération" : tendance === "ralentissement" ? "Ralentissement" : "Rythme régulier";
    const couleurTendance = tendance === "acceleration" ? "#10b981" : tendance === "ralentissement" ? "#ef4444" : "#7c3aed";

    const barres = semaines.map(s => {
        const h = max > 0 ? Math.round((s.ventes / max) * 48) : 4;
        const bg = tendance === "acceleration" && s === semaines[semaines.length - 1]
            ? "#10b981"
            : tendance === "ralentissement" && s === semaines[0]
            ? "#ef4444"
            : "#7c3aed";
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
          <span style="font-size:11px;font-weight:900;color:#0f172a;">${s.ventes}</span>
          <div style="width:100%;background:#e2e8f0;border-radius:4px;height:48px;display:flex;align-items:flex-end;overflow:hidden;">
            <div style="width:100%;height:${h}px;background:${bg};border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
          </div>
          <span style="font-size:9px;color:#94a3b8;font-weight:700;">${s.label}</span>
        </div>`;
    }).join("");

    return `
    <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;">Momentum du mois</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:${couleurTendance};">${emoji} ${label}</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px;">
        ${barres}
      </div>
    </div>`;
}

export function exporterBilanPDF(bilan: BilanExport): void {
    const now     = new Date();
    const dateGen = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const avatarHTML = bilan.avatarUrl
        ? `<img src="${bilan.avatarUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.3);" />`
        : `<div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;">${bilan.nom.charAt(0).toUpperCase()}</div>`;

    const produitsHTML = bilan.produits.map(p => {
        const couleur = p.taux >= 100 ? "#10b981" : p.taux >= 70 ? "#f59e0b" : "#ef4444";
        const label   = p.taux >= 100 ? "Objectif atteint" : p.taux >= 70 ? "En bonne voie" : "À renforcer";
        const badgeBg = p.taux >= 100 ? "#d1fae5" : p.taux >= 70 ? "#fef3c7" : "#fee2e2";
        const badgeFg = p.taux >= 100 ? "#065f46" : p.taux >= 70 ? "#92400e" : "#991b1b";
        return `
        <div style="padding:11px 14px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">${p.emoji}</span>
              <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">${p.label}</span>
            </div>
            <span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;background:${badgeBg};color:${badgeFg};">${label}</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:5px;margin-top:6px;">
            <span style="font-size:24px;font-weight:900;color:#0f172a;">${p.ventes}</span>
            <span style="font-size:12px;color:#94a3b8;">/ ${p.objectif}</span>
            <span style="margin-left:auto;font-size:13px;font-weight:800;color:${couleur};">${p.taux}%</span>
          </div>
          ${barreHTML(p.taux, couleur)}
        </div>`;
    }).join("");

    // Synthèse auto
    const ptsForts: string[] = [];
    const axesTravail: string[] = [];

    if (bilan.meilleurProduit) {
        const p = bilan.produits.find(x => x.label === bilan.meilleurProduit);
        if (p) ptsForts.push(`Meilleure performance sur <strong>${p.label}</strong> (${p.taux}%)`);
    }
    if (bilan.tauxGlobal >= 100) ptsForts.push("Objectif global mensuel atteint");
    if (bilan.defis.gagne > 0) ptsForts.push(`${bilan.defis.gagne} défi${bilan.defis.gagne > 1 ? "s" : ""} remporté${bilan.defis.gagne > 1 ? "s" : ""}`);
    if (bilan.challenges.reussi > 0) ptsForts.push(`${bilan.challenges.reussi} challenge${bilan.challenges.reussi > 1 ? "s" : ""} KPILOTE réussi${bilan.challenges.reussi > 1 ? "s" : ""}`);
    if (bilan.tendance === "acceleration") ptsForts.push("Accélération notable en fin de mois");

    if (bilan.produitEnRetard) {
        const p = bilan.produits.find(x => x.label === bilan.produitEnRetard);
        if (p) axesTravail.push(`Renforcer les ventes <strong>${p.label}</strong> (${p.taux}%)`);
    }
    if (bilan.tauxGlobal < 70) axesTravail.push("Volume global en retard — analyser les freins");
    if (bilan.tendance === "ralentissement") axesTravail.push("Maintenir le rythme sur la durée — tendance à la baisse");
    if (bilan.defis.perdu > bilan.defis.gagne && bilan.defis.perdu > 0) axesTravail.push("Ratio défis défavorable — travailler la régularité");
    if (ptsForts.length === 0) ptsForts.push("Identifier un produit fort pour construire la dynamique");
    if (axesTravail.length === 0) axesTravail.push("Maintenir le niveau et viser la régularité sur tous les produits");

    const ptsFortHTML = ptsForts.map(p =>
        `<div style="display:flex;gap:8px;margin-bottom:7px;"><span style="color:#10b981;font-weight:900;flex-shrink:0;font-size:11px;">✓</span><span style="font-size:11px;color:#1e293b;">${p}</span></div>`
    ).join("");
    const axesTravailHTML = axesTravail.map(p =>
        `<div style="display:flex;gap:8px;margin-bottom:7px;"><span style="color:#7c3aed;font-weight:900;flex-shrink:0;font-size:11px;">→</span><span style="font-size:11px;color:#1e293b;">${p}</span></div>`
    ).join("");

    const lignesNotes = Array.from({ length: 7 }).map(() =>
        `<div style="height:26px;border-bottom:1px solid #e2e8f0;"></div>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan ${bilan.nom} — ${bilan.moisLabel}</title>
  <style>
    *, *::before, *::after { margin:0;padding:0;box-sizing:border-box; }
    @page { size: A4 portrait; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:#fff; color:#0f172a;
      -webkit-print-color-adjust:exact; print-color-adjust:exact;
    }
  </style>
</head>
<body>

<!-- ─── HEADER ─── -->
<div style="background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 45%,#a855f7 75%,#d946ef 100%);padding:24px 36px 20px;position:relative;overflow:hidden;">
  <div style="position:absolute;right:-50px;top:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
    <div style="width:28px;height:28px;background:rgba(255,255,255,0.2);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;">K</div>
    <span style="font-size:8.5px;font-weight:800;letter-spacing:0.35em;text-transform:uppercase;color:rgba(255,255,255,0.55);">KPILOTE — Entretien Mensuel</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;">
    ${avatarHTML}
    <div>
      <div style="font-size:26px;font-weight:900;color:#fff;line-height:1.1;">${bilan.nom}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:3px;">Bilan de ${bilan.moisLabel}</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div style="font-size:36px;font-weight:900;color:#fff;">${bilan.tauxGlobal}%</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.15em;">Réalisation globale</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;">${bilan.totalVentes} / ${bilan.totalObjectif} ventes</div>
    </div>
  </div>
</div>

<!-- ─── CORPS ─── -->
<div style="padding:20px 36px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">

  <!-- ── Colonne gauche ── -->
  <div>
    <div style="font-size:8.5px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;margin-bottom:8px;">Performance par produit</div>
    <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:14px;">
      ${produitsHTML}
      <div style="padding:11px 14px;background:#fafbfe;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#475569;">Total</span>
          <span style="font-size:17px;font-weight:900;color:#0f172a;">${bilan.totalVentes}<span style="font-size:11px;font-weight:500;color:#94a3b8;"> / ${bilan.totalObjectif}</span></span>
        </div>
      </div>
    </div>

    <!-- Momentum -->
    ${momentumHTML(bilan.semaines, bilan.tendance)}
  </div>

  <!-- ── Colonne droite ── -->
  <div style="display:flex;flex-direction:column;gap:14px;">

    <!-- Classement -->
    <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
      <div style="font-size:8.5px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;margin-bottom:10px;">Classement équipe</div>
      <div style="display:flex;align-items:baseline;gap:5px;">
        <span style="font-size:40px;font-weight:900;color:#0f172a;">${bilan.classement.rang}</span>
        <span style="font-size:13px;color:#94a3b8;">/ ${bilan.classement.total}</span>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:3px;">
        ${bilan.classement.rang === 1 ? "🏆 Leader de l'équipe ce mois" : bilan.classement.rang <= Math.ceil(bilan.classement.total / 2) ? "Dans la première moitié du classement" : "À renforcer pour progresser"}
      </div>
    </div>

    <!-- Défis & Challenges -->
    <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
      <div style="font-size:8.5px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;margin-bottom:10px;">Défis & Challenges</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px;">
        <div style="text-align:center;background:#f0fdf4;border-radius:9px;padding:7px;">
          <div style="font-size:18px;font-weight:900;color:#15803d;">${bilan.defis.gagne}</div>
          <div style="font-size:8px;color:#16a34a;font-weight:700;">Gagné</div>
        </div>
        <div style="text-align:center;background:#fefce8;border-radius:9px;padding:7px;">
          <div style="font-size:18px;font-weight:900;color:#a16207;">${bilan.defis.egalite}</div>
          <div style="font-size:8px;color:#ca8a04;font-weight:700;">Égalité</div>
        </div>
        <div style="text-align:center;background:#fef2f2;border-radius:9px;padding:7px;">
          <div style="font-size:18px;font-weight:900;color:#b91c1c;">${bilan.defis.perdu}</div>
          <div style="font-size:8px;color:#dc2626;font-weight:700;">Perdu</div>
        </div>
      </div>
      <div style="font-size:10px;color:#64748b;padding-top:8px;border-top:1px solid #f1f5f9;">
        Challenges : <strong style="color:#10b981;">${bilan.challenges.reussi} réussi${bilan.challenges.reussi > 1 ? "s" : ""}</strong> · <strong style="color:#ef4444;">${bilan.challenges.echoue} échoué${bilan.challenges.echoue > 1 ? "s" : ""}</strong>${bilan.challenges.enCours > 0 ? ` · <strong style="color:#7c3aed;">${bilan.challenges.enCours} en cours</strong>` : ""}
      </div>
    </div>

    <!-- Synthèse -->
    <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
      <div style="font-size:8.5px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#7c3aed;margin-bottom:10px;">Synthèse</div>
      <div style="margin-bottom:10px;">
        <div style="font-size:9px;font-weight:800;color:#065f46;margin-bottom:5px;">Points forts</div>
        ${ptsFortHTML}
      </div>
      <div>
        <div style="font-size:9px;font-weight:800;color:#7c3aed;margin-bottom:5px;">Axes de travail</div>
        ${axesTravailHTML}
      </div>
    </div>
  </div>
</div>

<!-- ─── NOTES ─── -->
<div style="padding:0 36px 20px;">
  <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;">
    <div style="font-size:8.5px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:#94a3b8;margin-bottom:12px;">Notes entretien</div>
    ${lignesNotes}
  </div>
</div>

<!-- ─── FOOTER ─── -->
<div style="padding:10px 36px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
  <div style="display:flex;align-items:center;gap:7px;">
    <div style="width:18px;height:18px;background:linear-gradient(135deg,#7c3aed,#d946ef);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#fff;">K</div>
    <span style="font-size:8px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:#7c3aed;">KPILOTE</span>
  </div>
  <span style="font-size:9px;color:#94a3b8;">Généré le ${dateGen} · Confidentiel</span>
</div>

<script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { alert("Autorise les popups pour générer le PDF."); return; }
    win.document.write(html);
    win.document.close();
}

export function getMoisLabel(): string {
    const now = new Date();
    return `${MOIS_FR[now.getMonth()]} ${now.getFullYear()}`;
}
