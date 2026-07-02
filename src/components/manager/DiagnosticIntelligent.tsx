import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { Observation } from "@/intelligence/observations";
import { Intelligence } from "@/types/dashboard";

type Props = {
    intelligence: Intelligence;
};

const healthStyles: Record<Intelligence["health"], { label: string; color: string }> = {
    excellent: { label: "Excellent", color: "text-emerald-600 bg-emerald-50" },
    good: { label: "Bon", color: "text-blue-600 bg-blue-50" },
    warning: { label: "Vigilance", color: "text-orange-600 bg-orange-50" },
    critical: { label: "Critique", color: "text-red-600 bg-red-50" },
};

const severityStyles: Record<Observation["severity"], string> = {
    success: "border-green-500 bg-green-50",
    info: "border-blue-500 bg-blue-50",
    warning: "border-orange-500 bg-orange-50",
    danger: "border-red-500 bg-red-50",
};

export default function DiagnosticIntelligent({
    intelligence,
}: Props) {
    const health = healthStyles[intelligence.health];

    return (
        <Card>

            <div className="flex items-start justify-between gap-6">
                <SectionTitle
                    badge="Diagnostic Intelligent"
                    titre="Analyse KPILOTE"
                    color="text-violet-600"
                />

                <span className={`rounded-full px-4 py-2 text-sm font-black ${health.color}`}>
                    {health.label}
                </span>
            </div>

            <div className="-mt-4 mb-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-100 p-5">
                    <p className="text-slate-500">Score</p>
                    <p className="mt-1 text-3xl font-black text-slate-800">{intelligence.score}/100</p>
                </div>

                <div className="rounded-2xl bg-slate-100 p-5">
                    <p className="text-slate-500">Confiance</p>
                    <p className="mt-1 text-3xl font-black text-slate-800">{intelligence.confidence}%</p>
                </div>
            </div>

            <p className="mb-6 text-lg leading-8 text-slate-600">
                {intelligence.summary}
            </p>

            {intelligence.observations.length > 0 && (
                <div className="space-y-3">
                    {intelligence.observations.map((observation, idx) => (
                        <div
                            key={`${observation.id}-${idx}`}
                            className={`rounded-2xl border-l-8 p-5 ${severityStyles[observation.severity]}`}
                        >
                            <p className="font-black text-slate-800">{observation.label}</p>
                            <p className="mt-1 text-slate-600">{observation.message}</p>
                        </div>
                    ))}
                </div>
            )}

        </Card>
    );
}
