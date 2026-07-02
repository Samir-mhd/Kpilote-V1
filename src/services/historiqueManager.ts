import { supabase } from "@/lib/supabase";
import { ConseillerClassement, classementVide, appliquerVentes } from "./classementManager";

export type Periode = "jour" | "semaine" | "mois";

function dateDebut(periode: Periode) {
  const debut = new Date();

  if (periode === "jour") {
    debut.setHours(0, 0, 0, 0);
  } else if (periode === "semaine") {
    debut.setDate(debut.getDate() - 7);
  } else {
    debut.setDate(debut.getDate() - 30);
  }

  return debut;
}

export async function construireClassementPeriode(
  periode: Periode
): Promise<ConseillerClassement[]> {
  const { data: conseillers, error: conseillersError } = await supabase
    .from("conseillers")
    .select("id, nom");

  if (conseillersError) throw conseillersError;

  const { data: ventes, error: ventesError } = await supabase
    .from("ventes")
    .select(`
      conseiller_id,
      quantite,
      produits (
        code
      )
    `)
    .gte("created_at", dateDebut(periode).toISOString());

  if (ventesError) throw ventesError;

  const classement = classementVide(conseillers ?? []);

  appliquerVentes(classement, ventes ?? []);

  classement.sort((a, b) => b.ventes - a.ventes);

  return classement;
}
