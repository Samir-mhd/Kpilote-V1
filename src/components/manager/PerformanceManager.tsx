import { ConseillerClassement } from "@/services/classementManager";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import StatBadge from "@/components/ui/StatBadge";

type Props = {
  classement: ConseillerClassement[];
};

export default function PerformanceManager({
  classement,
}: Props) {

  if (classement.length === 0) return null;

  const champion = classement[0];

  return (
    <Card>

      <SectionTitle
        badge="Performance remarquable"
        titre={`🏆 ${champion.prenom}`}
        color="text-green-600"
      />

      <p className="text-slate-500 -mt-4 mb-8">
        Meilleur vendeur de la journée
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        <StatBadge
          label="📦 Box"
          value={champion.box}
        />

        <StatBadge
          label="📱 Forfaits"
          value={champion.forfaits}
        />

        <StatBadge
          label="📲 Téléphones"
          value={champion.telephones}
        />

        <StatBadge
          label="🛡️ McAfee"
          value={champion.mcafee}
        />

        <StatBadge
          label="✅ Assurance"
          value={champion.assurance}
        />

      </div>

      <div className="mt-8 rounded-2xl bg-slate-900 text-white p-6">

        <p className="text-green-400 font-black">
          🤖 KPILOTE
        </p>

        <p className="mt-3 leading-relaxed">
          <strong>{champion.prenom}</strong> réalise actuellement
          la meilleure performance de la journée avec{" "}
          <strong>{champion.ventes} ventes</strong>.
          Pense à le féliciter publiquement afin de créer
          une dynamique positive dans l'équipe.
        </p>

      </div>

    </Card>
  );
}