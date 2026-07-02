import { FelicitationManager } from "@/engine/managerAI/types";

type Props = {
  felicitations: FelicitationManager[];
};

export default function FelicitationsManager({
  felicitations,
}: Props) {

  if (felicitations.length === 0) return null;

  return (

    <section className="mt-10 bg-white rounded-[32px] p-8 shadow-xl">

      <p className="text-green-600 font-black uppercase tracking-widest">
        🎉 Félicitations
      </p>

      <h2 className="text-4xl font-black mt-3 mb-8">
        Performances à valoriser
      </h2>

      <div className="space-y-5">

        {felicitations.map((item) => (

          <div
            key={`${item.conseiller}-${item.raison}`}
            className="rounded-2xl bg-green-50 border-l-8 border-green-500 p-6"
          >

            <h3 className="text-2xl font-black">
              {item.conseiller}
            </h3>

            <p className="mt-2 text-slate-700">
              {item.raison}
            </p>

          </div>

        ))}

      </div>

    </section>

  );

}