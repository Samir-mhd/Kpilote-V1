"use client";

type Props = {
    children: React.ReactNode;
};

export default function DashboardShell({
    children,
}: Props) {
    return (
        <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-900">
            <div className="fixed inset-0 -z-10">
                <div className="absolute left-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-violet-600/30 blur-3xl" />
                <div className="absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[35%] h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-3xl" />
            </div>

            <div className="min-h-screen bg-white/80 backdrop-blur-3xl">
                <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
                    {children}
                </div>
            </div>
        </main>
    );
}