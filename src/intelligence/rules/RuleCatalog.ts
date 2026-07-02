import { Rule } from "./Rule";

export const RuleCatalog: Rule[] = [

    // ============================================
    // ASSURANCES
    // ============================================

    {

        id: "RULE-001",

        observations: [

            "OBS_assurance_LOW",

            "OBS_box_OK"

        ],

        deduction: "DED_DISCOVERY",

        confidence: 95

    },

    {

        id: "RULE-002",

        observations: [

            "OBS_assurance_LOW",

            "OBS_forfait_OK"

        ],

        deduction: "DED_DISCOVERY",

        confidence: 90

    },

    // ============================================
    // REBOND COMMERCIAL
    // ============================================

    {

        id: "RULE-003",

        observations: [

            "OBS_forfait_OK",

            "OBS_accessoire_LOW"

        ],

        deduction: "DED_REBOND",

        confidence: 90

    },

    {

        id: "RULE-004",

        observations: [

            "OBS_telephone_OK",

            "OBS_accessoire_LOW"

        ],

        deduction: "DED_REBOND",

        confidence: 88

    },

    // ============================================
    // COACHING
    // ============================================

    {

        id: "RULE-005",

        observations: [

            "OBS_box_LOW",

            "OBS_forfait_LOW"

        ],

        deduction: "DED_COACHING",

        confidence: 92

    },

    {

        id: "RULE-006",

        observations: [

            "OBS_box_LOW",

            "OBS_assurance_LOW"

        ],

        deduction: "DED_COACHING",

        confidence: 96

    },

    // ============================================
    // EXCELLENCE
    // ============================================

    {

        id: "RULE-007",

        observations: [

            "OBS_box_OK",

            "OBS_forfait_OK",

            "OBS_assurance_OK"

        ],

        deduction: "DED_EXCELLENCE",

        confidence: 99

    }

];