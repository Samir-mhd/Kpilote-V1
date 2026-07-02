export interface Action {

    id: string;

    titre: string;

    description: string;

    priorite: "faible" | "normale" | "haute";

    type:
        | "challenge"
        | "coaching"
        | "notification"
        | "manager";

}