import {
  RecommandationManager,
} from "@/services/recommandationsManager";

type Props = {
  recommandations: RecommandationManager[];
};

export default function RecommandationsManager({
  recommandations,
}: Props) {

  if (recommandations.length === 0) return null;

  return (

    <section className="mt-10 rounded-[32px] bg-white p-8 shadow-xl">

      <div className="flex items-center justify-between mb-8">

        <div>

          <p className="text-violet-600 font-black uppercase tracking-widest">
            🧠 KPILOTE
          </p>

          <h2 className="text-4xl font-black mt-2">
            Actions recommandées
          </h2>

          <p className="text-slate-500 mt-2">
            Priorités calculées automatiquement
          </p>

        </div>

        <div className="text-5xl">
          🚀
        </div>

      </div>

      <div className="space-y-5">

        {recommandations.map((rec, index) => (

          <div
            key={`${rec.titre}-${index}`}
            className="rounded-2xl border border-violet-200 bg-violet-50 p-6 transition-all duration-300 hover:shadow-lg"
          >

            <div className="flex items-start gap-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-black text-white">
                {index + 1}
              </div>

              <div className="flex-1">

                <h3 className="text-xl font-black text-slate-900">
                  {rec.titre}
                </h3>

                <p className="mt-2 text-slate-700 leading-relaxed">
                  {rec.action}
                </p>

              </div>

            </div>

          </div>

        ))}

      </div>

    </section>

  );

}