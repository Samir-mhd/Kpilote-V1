import { RecommendationRule } from "./RecommendationRule";

export const RecommendationCatalog: RecommendationRule[] = [

    // ============================================
    // DECOUVERTE CLIENT
    // ============================================

    {

        deduction: "DED_DISCOVERY",

        id: "REC_DISCOVERY",

        title: "Coaching Découverte Client",

        description: "Organiser un coaching centré sur la découverte des besoins avant la proposition commerciale.",

        priority: "high"

    },

    // ============================================
    // REBOND COMMERCIAL
    // ============================================

    {

        deduction: "DED_REBOND",

        id: "REC_REBOND",

        title: "Développer le rebond commercial",

        description: "Inciter les conseillers à proposer systématiquement un accessoire ou un service complémentaire.",

        priority: "medium"

    },

    // ============================================
    // COACHING
    // ============================================

    {

        deduction: "DED_COACHING",

        id: "REC_COACH",

        title: "Coaching individuel",

        description: "Planifier un accompagnement individuel avec le conseiller concerné aujourd'hui.",

        priority: "high"

    },

    // ============================================
    // EXCELLENCE
    // ============================================

    {

        deduction: "DED_EXCELLENCE",

        id: "REC_CONGRATS",

        title: "Valoriser la performance",

        description: "Féliciter l'équipe et maintenir la dynamique actuelle.",

        priority: "low"

    }

];