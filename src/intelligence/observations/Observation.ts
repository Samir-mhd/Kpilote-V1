export interface Observation {

    id:string;

    label:string;

    category:string;

    severity:"info"|"success"|"warning"|"danger";

    message:string;

}
