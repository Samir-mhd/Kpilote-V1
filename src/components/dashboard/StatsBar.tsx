export default function StatsBar() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">

      <div className="rounded-[28px] bg-gradient-to-br from-orange-400 to-red-500 text-white p-7 shadow-xl">

        <p className="uppercase text-sm tracking-widest opacity-80">
          Série
        </p>

        <h2 className="text-5xl font-black mt-3">
          🔥 6
        </h2>

        <p className="mt-2 opacity-90">
          jours consécutifs
        </p>

      </div>

      <div className="rounded-[28px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-7 shadow-xl">

        <p className="uppercase text-sm tracking-widest opacity-80">
          Niveau
        </p>

        <h2 className="text-5xl font-black mt-3">
          ⭐ 8
        </h2>

        <p className="mt-2 opacity-90">
          Challenger
        </p>

      </div>

      <div className="rounded-[28px] bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-7 shadow-xl">

        <p className="uppercase text-sm tracking-widest opacity-80">
          XP
        </p>

        <h2 className="text-5xl font-black mt-3">
          2450
        </h2>

        <div className="mt-4 h-2 rounded-full bg-white/20">

          <div className="h-full w-4/5 rounded-full bg-white" />

        </div>

      </div>

      <div className="rounded-[28px] bg-gradient-to-br from-green-500 to-emerald-400 text-white p-7 shadow-xl">

        <p className="uppercase text-sm tracking-widest opacity-80">
          Aujourd'hui
        </p>

        <h2 className="text-5xl font-black mt-3">
          73%
        </h2>

        <p className="mt-2 opacity-90">
          Tu es dans le rythme 🚀
        </p>

      </div>

    </section>
  );
}