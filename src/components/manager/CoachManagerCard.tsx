"use client";

import KPIIcon from "@/components/ui/KPIIcon";
import { CoachDecision } from "@/services/manager/ManagerCoachAI";
import { CoachManagerResult } from "@/services/coachManager";

type Props = {
    coach: CoachManagerResult;
    decision: CoachDecision;
};

export default function CoachManagerCard({
    coach,
    decision,
}: Props) {
    return (
        <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-900 p-8 text-white shadow-[0_25px_80px_rgba(0,0,0,.30)]">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative">
                <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                        <KPIIcon name="brain" size={40} />
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">
                            IA MANAGER
                        </p>

                        <h2 className="mt-2 text-3xl font-black">
                            KPILOTE
                        </h2>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl bg-white/10 p-6">
                    <p className="text-lg leading-8">
                        {coach.message}
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
                        <KPIIcon name="target" />

                        <div>
                            <p className="text-xs uppercase text-violet-300">
                                Priorité
                            </p>

                            <p className="font-bold">
                                {decision.priorite}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
                        <KPIIcon name="trophy" />

                        <div>
                            <p className="text-xs uppercase text-violet-300">
                                Féliciter
                            </p>

                            <p className="font-bold">
                                {decision.feliciter}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
                        <KPIIcon name="bell" />

                        <div>
                            <p className="text-xs uppercase text-violet-300">
                                Accompagner
                            </p>

                            <p className="font-bold">
                                {decision.accompagner}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-5">
                    <p className="text-sm uppercase tracking-[0.3em]">
                        Action recommandée
                    </p>

                    <p className="mt-3 text-lg font-bold">
                        {decision.action}
                    </p>
                </div>
            </div>
        </section>
    );
}