import { supabase } from "@/lib/supabase";

export type CoachManagerResult = {
  message: string;
  niveau: "bas" | "moyen" | "haut";
};

export async function construireCoachManager(): Promise<CoachManagerResult> {
  const { data: objectifs, error: objectifsError } = await supabase
    .from("objectifs_mensuels")
    .select("objectif, produits(code)");

  if (objectifsError) throw objectifsError;

  const { data: ventes, error: ventesError } = await supabase
    .from("ventes")
    .select("quantite, produits(code)");

  if (ventesError) throw ventesError;

  // Spiderhome = historisation, pas un acte commercial → exclu des totaux
  const objectifGlobal = (objectifs ?? []).reduce((total: number, o: any) => {
    const code = (Array.isArray(o.produits) ? o.produits[0] : o.produits)?.code;
    return code === "spiderhome" ? total : total + o.objectif;
  }, 0);

  const realiseGlobal = (ventes ?? []).reduce((total: number, v: any) => {
    const code = (Array.isArray(v.produits) ? v.produits[0] : v.produits)?.code;
    return code === "spiderhome" ? total : total + v.quantite;
  }, 0);

  const tauxGlobal =
    objectifGlobal > 0
      ? Math.round((realiseGlobal / objectifGlobal) * 100)
      : 0;

  if (tauxGlobal >= 100) {
    return {
      message: "Tous les indicateurs principaux sont atteints. Maintenir le rythme actuel.",
      niveau: "bas",
    };
  }

  if (tauxGlobal >= 80) {
    const ventesRestantes = Math.max(objectifGlobal - realiseGlobal, 0);

    return {
      message: `${ventesRestantes} ventes restent nécessaires pour atteindre l'objectif.`,
      niveau: "moyen",
    };
  }

  return {
    message: "La boutique est actuellement sous le rythme attendu. Un accompagnement renforcé est nécessaire.",
    niveau: "haut",
  };
}
