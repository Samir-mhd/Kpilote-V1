export interface TimelineEvent {

    id: string;

    heure: Date;

    type:
        | "vente"
        | "badge"
        | "challenge"
        | "notification"
        | "manager"
        | "coach";

    titre: string;

    description: string;

    emoji: string;

    priorite:
        | "faible"
        | "normale"
        | "haute";

}