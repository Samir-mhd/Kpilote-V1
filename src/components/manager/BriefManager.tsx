import { BriefManager as BriefManagerType } from "@/services/briefManager";

type Props = {
  briefs: BriefManagerType[];
};

export default function BriefManager({ briefs }: Props) {
  if (briefs.length === 0) return null;

  return (
    <section className="mt-10 rounded-[32px] bg-white p-8 shadow-xl">

      <div className="flex items-center justify-between mb-8">

        <div>

          <p className="text-indigo-600 font-black uppercase tracking-widest">
            🧠 KPILOTE
          </p>

          <h2 className="text-4xl font-black mt-2">
            Diagnostic Intelligent
          </h2>

          <p className="text-slate-500 mt-2">
            Analyse automatique de la boutique
          </p>

        </div>

        <div className="text-6xl">
          🤖
        </div>

      </div>

      <div className="space-y-5">

        {briefs.map((brief) => {

          const couleur =
            brief.niveau === "success"
              ? "border-green-500 bg-green-50"
              : brief.niveau === "warning"
              ? "border-orange-500 bg-orange-50"
              : "border-red-500 bg-red-50";

          const icone =
            brief.niveau === "success"
              ? "✅"
              : brief.niveau === "warning"
              ? "⚠️"
              : "🔴";

          return (

            <div
              key={brief.titre}
              className={`border-l-8 ${couleur} rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
            >

              <div className="flex items-start gap-4">

                <div className="text-3xl">

                  {icone}

                </div>

                <div>

                  <h3 className="text-2xl font-black">

                    {brief.titre}

                  </h3>

                  <p className="mt-2 text-slate-700 leading-relaxed">

                    {brief.message}

                  </p>

                </div>

              </div>

            </div>

          );

        })}

      </div>

    </section>
  );
}