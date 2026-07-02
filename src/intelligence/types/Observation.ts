export interface Observation {

    id: string;

    label: string;

    description: string;

    category: string;

    severity: "info" | "success" | "warning" | "danger";

}
