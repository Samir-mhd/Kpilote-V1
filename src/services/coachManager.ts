import { supabase } from "@/lib/supabase";
import { fetchToutesLesLignes } from "@/utils/supabasePaging";

export type CoachManagerResult = {
  message: string;
  niveau: "bas" | "moyen" | "haut";
};

export async function construireCoachManager(): Promise<CoachManagerResult> {
  const { data: conseillers } = await supabase.from("conseillers").select("id, profil_actif");
  // Profil désactivé (mode restreint) : n'impacte pas les chiffres boutique
  const exclus = new Set(
    (conseillers ?? []).filter((c: any) => c.profil_actif === false).map((c: any) => c.id)
  );

  const { data: objectifs, error: objectifsError } = await supabase
    .from("objectifs_mensuels")
    .select("objectif, conseiller_id, produits(code)");

  if (objectifsError) throw objectifsError;

  // Paginé : au-delà de 1000 lignes (plafond Supabase par défaut), les ventes de toute
  // l'équipe seraient coupées silencieusement, sans tri garanti.
  const ventes = await fetchToutesLesLignes((from, to) =>
    supabase
      .from("ventes")
      .select("quantite, conseiller_id, produits(code)")
      .order("created_at", { ascending: true })
      .range(from, to)
  );

  // Spiderhome = historisation, pas un acte commercial → exclu des totaux
  const objectifGlobal = (objectifs ?? []).reduce((total: number, o: any) => {
    if (exclus.has(o.conseiller_id)) return total;
    const code = (Array.isArray(o.produits) ? o.produits[0] : o.produits)?.code;
    return code === "spiderhome" ? total : total + o.objectif;
  }, 0);

  const realiseGlobal = (ventes ?? []).reduce((total: number, v: any) => {
    if (exclus.has(v.conseiller_id)) return total;
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
