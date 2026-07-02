type Props = {
  realise: number;
  objectif: number;
};

export default function ProgressionBoutique({
  realise,
  objectif,
}: Props) {
  const pourcentage =
    objectif > 0
      ? Math.round((realise / objectif) * 100)
      : 0;

  const reste = Math.max(
    objectif - realise,
    0
  );

  return (
    <section className="mt-10 bg-white rounded-[32px] p-8 shadow-xl">

      <p className="text-blue-600 font-black uppercase tracking-widest">
        Progression Boutique
      </p>

      <h2 className="text-4xl font-black mt-3">
        {pourcentage} %
      </h2>

      <div className="mt-8 h-6 bg-slate-200 rounded-full overflow-hidden">

        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
          style={{
            width: `${Math.min(
              pourcentage,
              100
            )}%`,
          }}
        />

      </div>

      <div className="flex justify-between mt-6">

        <div>
          <p className="text-slate-500">
            Réalisé
          </p>

          <p className="text-3xl font-black">
            {realise}
          </p>
        </div>

        <div className="text-center">
          <p className="text-slate-500">
            Objectif
          </p>

          <p className="text-3xl font-black">
            {objectif}
          </p>
        </div>

        <div className="text-right">
          <p className="text-slate-500">
            Reste
          </p>

          <p className="text-3xl font-black text-red-500">
            {reste}
          </p>
        </div>

      </div>

    </section>
  );
}