type HeroHeaderProps = {
  nom: string;
  message: string;
};

export default function HeroHeader({ nom, message }: HeroHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-slate-900 to-green-700 text-white p-10 shadow-2xl">
      <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-60 w-60 rounded-full bg-green-400/20 blur-3xl" />

      <div className="relative flex flex-col md:flex-row gap-8 md:items-center justify-between">
        <div>
          <p className="text-green-300 font-semibold tracking-widest uppercase">
            KPILOTE
          </p>

          <h1 className="text-5xl font-black mt-3">
            Bonjour {nom} 👋
          </h1>

          <p className="mt-5 text-xl text-slate-200 max-w-2xl">
            {message}
          </p>
        </div>

        <div className="text-center">
          <div className="h-36 w-36 rounded-full bg-white flex items-center justify-center text-7xl shadow-xl animate-pulse">
            🚀
          </div>

          <p className="mt-4 text-green-300 font-bold">
            Copilote actif
          </p>
        </div>
      </div>
    </section>
  );
}