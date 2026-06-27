export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">

        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-slate-800">
            KPilote🚀
          </h1>

          <p className="text-xl text-slate-500 mt-3">
            Pilotez • Motivez • Réussissez
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          <div className="bg-white rounded-3xl shadow-xl p-10 hover:scale-105 transition cursor-pointer">

            <div className="text-7xl mb-6 text-center">
              👤
            </div>

            <h2 className="text-3xl font-bold text-center text-slate-800">
              Conseillers
            </h2>

            <p className="text-center text-slate-500 mt-4">
              Consulter ma progression
            </p>

          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10 hover:scale-105 transition cursor-pointer">

            <div className="text-7xl mb-6 text-center">
              👑
            </div>

            <h2 className="text-3xl font-bold text-center text-slate-800">
              Manager
            </h2>

            <p className="text-center text-slate-500 mt-4">
              Administration
            </p>

          </div>

        </div>

      </div>
    </main>
  );
}