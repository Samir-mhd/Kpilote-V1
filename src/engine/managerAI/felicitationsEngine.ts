import { ConseillerClassement } from "@/services/classementManager";
import { FelicitationManager } from "./types";

export function construireFelicitations(
  classement: ConseillerClassement[]
): FelicitationManager[] {

  const felicitations: FelicitationManager[] = [];

  if (classement.length === 0) return felicitations;

  const champion = classement[0];

  if (champion.ventes > 0) {

    felicitations.push({

      conseiller: champion.prenom,

      raison:
        `Meilleur vendeur du jour avec ${champion.ventes} ventes.`

    });

  }

  classement.forEach((conseiller) => {

    if (conseiller.assurance >= 3) {

      felicitations.push({

        conseiller: conseiller.prenom,

        raison:
          `${conseiller.assurance} assurances vendues aujourd'hui.`

      });

    }

  });

  return felicitations;

}