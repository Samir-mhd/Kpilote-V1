import { ConseillerClassement } from "@/services/classementManager";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";

type Props = {
  classement: ConseillerClassement[];
};

export default function ClassementManager({
  classement,
}: Props) {
  return (
    <Card>

      <SectionTitle
        badge="Classement du jour"
        titre="Les champions"
        color="text-yellow-500"
      />

      <div className="space-y-4">

        {classement.map((conseiller, index) => (

          <div
            key={conseiller.id}
            className="flex items-center justify-between rounded-2xl bg-slate-100 p-5 hover:bg-slate-200 transition-all"
          >

            <div className="flex items-center gap-5">

              <div className="text-4xl">

                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : "🏅"}

              </div>

              <div>

                <p className="font-black text-2xl">
                  {conseiller.prenom}
                </p>

                <p className="text-slate-500 mt-1">

                  📦 {conseiller.box}

                  {" • "}

                  📱 {conseiller.forfaits}

                  {" • "}

                  📲 {conseiller.telephones}

                  {" • "}

                  🛡️ {conseiller.mcafee}

                  {" • "}

                  ✅ {conseiller.assurance}

                </p>

              </div>

            </div>

            <div className="text-right">

              <p className="text-4xl font-black">
                {conseiller.ventes}
              </p>

              <p className="text-slate-500">
                ventes
              </p>

            </div>

          </div>

        ))}

      </div>

    </Card>
  );
}