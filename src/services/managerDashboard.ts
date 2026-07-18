import { supabase } from "@/lib/supabase";

import { construireClassementManager } from "./classementManager";
import { construireCoachManager } from "./coachManager";
import { construireBriefManager } from "./briefManager";
import { construireRecommandationsManager } from "./recommandationsManager";

import { couleursProduits } from "@/utils/colors";
import { KPI } from "@/types/dashboard";

import { MetricEngine } from "@/intelligence/metrics";
import { BrainService } from "./brain/BrainService";

export async function construireDashboardManager() {

  const { data: conseillers } = await supabase
    .from("conseillers")
    .select("*");

  const { data: objectifs } = await supabase
    .from("objectifs_mensuels")
    .select(`
      objectif,
      conseiller_id,
      produits(
        nom,
        code
      )
    `);

  const { data: ventes } = await supabase
    .from("ventes")
    .select(`
      quantite,
      conseiller_id,
      produits(
        nom,
        code
      )
    `);

  const classement = await construireClassementManager();
  const coach = await construireCoachManager();

  const fusion = new Map<string, KPI>();

  (objectifs ?? []).forEach((objectif: any) => {

    const produit = Array.isArray(objectif.produits)
      ? objectif.produits[0]
      : objectif.produits;

    if (!produit) return;
    if (produit.code === "spiderhome") return; // historisation, pas un acte commercial

    const realise = (ventes ?? [])
      .filter((vente: any) => {

        const produitVente = Array.isArray(vente.produits)
          ? vente.produits[0]
          : vente.produits;

        return produitVente?.code === produit.code;

      })
      .reduce(
        (total: number, vente: any) => total + vente.quantite,
        0
      );

    if (!fusion.has(produit.nom)) {

      fusion.set(produit.nom, {

        nom: produit.nom,

        realise,

        objectif: objectif.objectif,

        couleur:
          couleursProduits[produit.nom] ??
          "from-slate-500 to-slate-400",

      });

    } else {

      const actuel = fusion.get(produit.nom)!;

      actuel.objectif += objectif.objectif;

      actuel.realise += realise;

    }

  });

  const kpis = Array.from(fusion.values());

  const objectifGlobal =
    kpis.reduce((t, k) => t + k.objectif, 0);

  const realiseGlobal =
    kpis.reduce((t, k) => t + k.realise, 0);

  const tauxGlobal =
    objectifGlobal > 0
      ? Math.round((realiseGlobal / objectifGlobal) * 100)
      : 0;

  const ventesRestantes =
    Math.max(objectifGlobal - realiseGlobal, 0);

  // ====================================================
  // KPILOTE BRAIN
  // ====================================================

  const metrics = kpis.map((kpi) =>
    MetricEngine.create(
      kpi.nom.toLowerCase(),
      kpi.nom,
      kpi.realise,
      kpi.objectif
    )
  );

  const intelligence =
    BrainService.analyze(metrics);

  // ====================================================
  // SERVICES
  // ====================================================

  const briefs = construireBriefManager({

    kpis,

    classement,

    coach,

    realiseGlobal,

    objectifGlobal,

    tauxGlobal,

    ventesRestantes,

    intelligence,

  });

  const recommandations =
    construireRecommandationsManager(kpis);

  return {

    conseillers: conseillers ?? [],

    kpis,

    classement,

    coach,

    briefs,

    recommandations,

    intelligence,

    realiseGlobal,

    objectifGlobal,

    tauxGlobal,

    ventesRestantes,

    // ==========================
    // KPILOTE
    // ==========================

    scoreIA: intelligence.score,

    confianceIA: intelligence.confidence,

    etatIA: intelligence.health,

    resumeIA: intelligence.summary,

  };

}