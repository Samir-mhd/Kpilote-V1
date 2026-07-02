"use client";

import KPIIcon from "@/components/ui/KPIIcon";
import { NotificationKPILOTE } from "@/services/notificationService";

type Props = {
    notifications: NotificationKPILOTE[];
};

function getIcon(type?: string) {
    if (type === "success") return "trophy";
    if (type === "warning") return "bell";
    if (type === "challenge") return "challenge";
    return "brain";
}

export default function NotificationCenter({
    notifications,
}: Props) {
    if (!notifications || notifications.length === 0) {
        return (
            <section className="rounded-[32px] border border-white/30 bg-white/80 p-7 shadow-[0_15px_45px_rgba(15,23,42,.12)] backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
                    Notifications
                </p>

                <h2 className="mt-3 text-2xl font-black text-slate-800">
                    Tout est calme
                </h2>

                <p className="mt-3 text-slate-500">
                    KPILOTE te préviendra dès qu'une action importante arrive.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-[32px] border border-white/30 bg-white/80 p-7 shadow-[0_15px_45px_rgba(15,23,42,.12)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
                        Centre d'activité
                    </p>

                    <h2 className="mt-3 text-2xl font-black text-slate-800">
                        Notifications KPILOTE
                    </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl">
                    <KPIIcon name="bell" size={26} />
                </div>
            </div>

            <div className="mt-7 space-y-4">
                {notifications.map((notification, index) => {
                    const type =
                        "type" in notification
                            ? String(notification.type)
                            : "info";

                    return (
                        <div
                            key={index}
                            className="group flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_14px_35px_rgba(15,23,42,.12)]"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                <KPIIcon
                                    name={getIcon(type) as any}
                                    size={22}
                                />
                            </div>

                            <div className="flex-1">
                                <p className="font-black text-slate-800">
                                    {"titre" in notification
                                        ? notification.titre
                                        : "Information"}
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {"message" in notification
                                        ? notification.message
                                        : ""}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}