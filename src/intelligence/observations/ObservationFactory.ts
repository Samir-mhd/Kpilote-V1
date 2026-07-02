import { ObservationCatalog, ObservationDefinition } from "./ObservationCatalog";

export class ObservationFactory {

    static create(key: string): ObservationDefinition {

        return (
            ObservationCatalog[key] ??
            ObservationCatalog["OBS_GENERIQUE_FAIBLE"]
        );

    }

}