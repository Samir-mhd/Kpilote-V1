import { AlerteManager } from "@/engine/managerAI/types";

type Props = {
  alertes: AlerteManager[];
};

export default function AlertesManager({
  alertes,
}: Props) {

  if (alertes.length === 0) return null;

  return (

    <section className="mt-10 bg-white rounded-[32px] p-8 shadow-xl">

      <p className="text-red-600 font-black uppercase tracking-widest">
        🚨 Alertes
      </p>

      <h2 className="text-4xl font-black mt-3 mb-8">
        Points de vigilance
      </h2>

      <div className="space-y-5">

        {alertes.map((alerte) => (

          <div
            key={`${alerte.titre}-${alerte.message}`}
            className="rounded-2xl bg-red-50 border-l-8 border-red-500 p-6"
          >

            <h3 className="text-2xl font-black">
              {alerte.titre}
            </h3>

            <p className="mt-2 text-slate-700">
              {alerte.message}
            </p>

          </div>

        ))}

      </div>

    </section>

  );

}