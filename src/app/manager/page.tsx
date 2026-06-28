const kpis = [
  { nom: "Box", realise: 68, objectif: 90, couleur: "from-green-500 to-emerald-400" },
  { nom: "Forfaits", realise: 104, objectif: 120, couleur: "from-blue-500 to-cyan-400" },
  { nom: "Téléphones", realise: 42, objectif: 55, couleur: "from-purple-500 to-violet-400" },
  { nom: "McAfee", realise: 31, objectif: 45, couleur: "from-orange-500 to-amber-400" },
  { nom: "Assurance", realise: 27, objectif: 40, couleur: "from-red-500 to-rose-400" },
];

const messagesBrief = [
  "🔥 Dylan : 4 jours de suite avec une Assurance, bravo !",
  "⚠️ Nabil : 9 jours sans Assurance, point de vigilance.",
  "🚀 Julie est en avance sur son rythme Box.",
  "🎯 Il manque 3 Forfaits aujourd’hui pour remettre la boutique dans le vert.",
];

export default function Manager() {
  return (
    <main className="min-h-screen bg-[#F5F7FB] p-8">
      <div className="max-w-7xl mx-auto">

        <header className="rounded-[36px] bg-slate-950 text-white p-10 shadow-2xl">
          <p className="text-green-400 font-bold tracking-widest uppercase">
            Espace Manager
          </p>

          <h1 className="text-5xl font-black mt-3">
            Brief du matin
          </h1>

          <p className="text-slate-300 mt-4 text-xl">
            Vue globale boutique, avance/retard et messages d’animation.
          </p>
        </header>

        <section className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mt-8">
          {kpis.map((kpi) => {
            const pourcentage = Math.round((kpi.realise / kpi.objectif) * 100);
            const reste = Math.max(kpi.objectif - kpi.realise, 0);

            return (
              <div key={kpi.nom} className="bg-white rounded-[30px] p-6 shadow-xl">
                <p className="text-slate-500 font-bold">{kpi.nom}</p>

                <h2 className="text-4xl font-black mt-3">
                  {kpi.realise}/{kpi.objectif}
                </h2>

                <div className="h-3 bg-slate-200 rounded-full mt-5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${kpi.couleur}`}
                    style={{ width: `${Math.min(pourcentage, 100)}%` }}
                  />
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Encore <strong>{reste}</strong> à réaliser
                </p>
              </div>
            );
          })}
        </section>

        <section className="grid lg:grid-cols-2 gap-8 mt-8">

          <div className="bg-white rounded-[32px] p-8 shadow-xl">
            <p className="text-green-600 font-black uppercase tracking-widest">
              Mission boutique du jour
            </p>

            <h2 className="text-4xl font-black mt-3">
              Objectif collectif
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="rounded-2xl bg-green-50 p-5">
                <p className="text-slate-500">Box</p>
                <h3 className="text-4xl font-black text-green-600">7</h3>
              </div>

              <div className="rounded-2xl bg-blue-50 p-5">
                <p className="text-slate-500">Forfaits</p>
                <h3 className="text-4xl font-black text-blue-600">9</h3>
              </div>

              <div className="rounded-2xl bg-purple-50 p-5">
                <p className="text-slate-500">Téléphones</p>
                <h3 className="text-4xl font-black text-purple-600">4</h3>
              </div>

              <div className="rounded-2xl bg-red-50 p-5">
                <p className="text-slate-500">Assurance</p>
                <h3 className="text-4xl font-black text-red-600">3</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-xl">
            <p className="text-orange-600 font-black uppercase tracking-widest">
              Animations du brief
            </p>

            <h2 className="text-4xl font-black mt-3">
              Points à dire
            </h2>

            <div className="space-y-4 mt-8">
              {messagesBrief.map((message) => (
                <div
                  key={message}
                  className="rounded-2xl bg-slate-100 p-5 font-semibold text-slate-800"
                >
                  {message}
                </div>
              ))}
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}