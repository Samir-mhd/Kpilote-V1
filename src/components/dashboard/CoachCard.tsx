type CoachCardProps = {
  nom: string;
  message: string;
};

export default function CoachCard({
  nom,
  message,
}: CoachCardProps) {
  return (
    <section className="mt-8 rounded-[32px] bg-gradient-to-r from-green-500 to-emerald-400 p-8 text-white shadow-2xl">

      <div className="flex items-center gap-6">

        <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-5xl shadow-lg">
          🤖
        </div>

        <div>

          <p className="uppercase tracking-widest text-green-100 font-bold">
            TON COPILOTE
          </p>

          <h2 className="text-3xl font-black mt-2">
            Salut {nom} !
          </h2>

          <p className="mt-3 text-xl leading-relaxed">
            {message}
          </p>

        </div>

      </div>

    </section>
  );
}