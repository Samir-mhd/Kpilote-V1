type HeroHeaderProps = {
  nom: string;
};

export default function HeroHeader({ nom }: HeroHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-900 via-slate-800 to-green-700 text-white p-10 shadow-2xl">

      <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-center justify-between">

        <div>

          <p className="text-green-300 font-semibold tracking-widest uppercase">
            KPILOTE
          </p>

          <h1 className="text-5xl font-black mt-3">
            Bonjour {nom} 👋
          </h1>

          <p className="mt-5 text-xl text-slate-200 max-w-xl">
            🔥 Encore <span className="font-bold text-white">2 BOX</span> et
            <span className="font-bold text-white"> 1 Mobile</span> pour terminer
            ta mission.
          </p>

        </div>

        <div className="text-center">

          <div className="h-36 w-36 rounded-full bg-white flex items-center justify-center text-7xl shadow-xl">

            😀

          </div>

          <p className="mt-4 text-green-300 font-bold">

            Niveau 8

          </p>

        </div>

      </div>

    </section>
  );
}