import HomeCard from "@/components/HomeCard";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-6">
      <section className="w-full max-w-6xl">
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-10 lg:p-14">
              <div className="inline-flex items-center gap-3 rounded-full bg-green-50 px-4 py-2 text-green-700 font-semibold mb-10">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Version prototype
              </div>

              <h1 className="text-6xl lg:text-7xl font-black tracking-tight text-slate-900">
                KPI<span className="text-green-500">LOTE</span>
              </h1>

              <p className="mt-6 text-2xl text-slate-600 leading-snug">
                Votre copilote de performance commerciale.
              </p>

              <p className="mt-4 text-slate-500 text-lg">
                Une mission claire chaque jour. Une équipe engagée. Des objectifs suivis en temps réel.
              </p>
<div className="grid gap-5">

 <Link
  href="/choix"
  className="block bg-green-500 text-white p-6 rounded-xl text-center text-2xl font-bold"
>
  JE SUIS CONSEILLER
</Link>

  <Link href="/manager" className="block">
    <HomeCard
      icon="👑"
      title="Je suis manager"
      subtitle="Piloter la boutique"
    />
  </Link>

</div>
            </div>

            <div className="bg-slate-950 p-10 lg:p-14 text-white flex flex-col justify-between">
              <div>
                <p className="text-green-400 font-semibold mb-4">
                  Aujourd'hui
                </p>

                <h2 className="text-4xl font-bold leading-tight">
                  Que dois-je faire maintenant ?
                </h2>

                <div className="mt-10 space-y-4">
                  <div className="rounded-3xl bg-white/10 p-5 border border-white/10">
                    <div className="text-sm text-slate-300">Mission boutique</div>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                      <div className="rounded-2xl bg-white p-4 text-slate-900">
                        <div className="text-3xl font-black text-green-500">7</div>
                        <div className="text-xs font-bold mt-1">BOX</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-slate-900">
                        <div className="text-3xl font-black text-blue-500">5</div>
                        <div className="text-xs font-bold mt-1">MOBILE</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-slate-900">
                        <div className="text-3xl font-black text-orange-500">4</div>
                        <div className="text-xs font-bold mt-1">ASSUR.</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-slate-900">
                        <div className="text-3xl font-black text-purple-500">3</div>
                        <div className="text-xs font-bold mt-1">FLEX</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/10 p-5 border border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-slate-300">Objectif boutique</div>
                        <div className="text-4xl font-black mt-2">82%</div>
                      </div>
                      <div className="text-5xl">🚀</div>
                    </div>

                    <div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[82%] rounded-full bg-green-500" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 mt-10">
                KPILOTE • Prototype V0.1
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}