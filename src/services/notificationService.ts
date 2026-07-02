export type NotificationKPILOTE = {

  id: string;

  emoji: string;

  titre: string;

  message: string;

  niveau: "success" | "warning" | "info";

};

export function construireNotifications(

  contexte: {

    ventesJour: number;

    objectifRestant: number;

    classement: number;

    challenge?: boolean;

  }

): NotificationKPILOTE[] {

  const notifications: NotificationKPILOTE[] = [];

  // =====================================
  // Série de ventes
  // =====================================

  if (contexte.ventesJour >= 5) {

    notifications.push({

      id: "serie",

      emoji: "🔥",

      titre: "Belle dynamique",

      message:
        `Tu as déjà réalisé ${contexte.ventesJour} ventes aujourd'hui.`,

      niveau: "success",

    });

  }

  // =====================================
  // Objectif proche
  // =====================================

  if (

    contexte.objectifRestant > 0 &&

    contexte.objectifRestant <= 2

  ) {

    notifications.push({

      id: "objectif",

      emoji: "🎯",

      titre: "Objectif proche",

      message:
        `Plus que ${contexte.objectifRestant} vente(s) pour atteindre ton objectif.`,

      niveau: "warning",

    });

  }

  // =====================================
  // Classement
  // =====================================

  if (contexte.classement <= 3) {

    notifications.push({

      id: "classement",

      emoji: "🏆",

      titre: "Top vendeur",

      message:
        "Tu fais actuellement partie du Top 3 de la boutique.",

      niveau: "success",

    });

  }

  // =====================================
  // Défi
  // =====================================

  if (contexte.challenge) {

    notifications.push({

      id: "challenge",

      emoji: "⚔️",

      titre: "Défi disponible",

      message:
        "KPILOTE t'a préparé un nouveau défi.",

      niveau: "info",

    });

  }

  return notifications;

}