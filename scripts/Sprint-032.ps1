# ============================================
# KPILOTE V2
# Sprint 032
# Observation Factory
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KPILOTE - Sprint 032" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

New-Item -ItemType Directory -Force .\src\intelligence\types | Out-Null
New-Item -ItemType Directory -Force .\src\intelligence\observations | Out-Null

@"
export interface Observation {

    id: string;

    label: string;

    description: string;

    category: string;

    severity: "info" | "success" | "warning" | "danger";

}
"@ | Set-Content .\src\intelligence\types\Observation.ts

@"
import { Observation } from "../types/Observation";
import { ObservationCatalog } from "./ObservationCatalog";

export class ObservationFactory {

    static create(id: keyof typeof ObservationCatalog): Observation {

        return ObservationCatalog[id];

    }

}
"@ | Set-Content .\src\intelligence\observations\ObservationFactory.ts

@"
export * from "./ObservationCatalog";
export * from "./ObservationFactory";
export * from "./ObservationEngine";
"@ | Set-Content .\src\intelligence\observations\index.ts

Write-Host ""
Write-Host "? Sprint 032 installé." -ForegroundColor Green
Write-Host ""
