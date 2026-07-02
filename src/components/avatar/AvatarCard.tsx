type Props = {

  prenom: string;

  avatar?: string;

  badge?: string;

  statut?: "normal" | "hot" | "warning";

  taille?: "sm" | "md" | "lg";

};

export default function AvatarCard({

  prenom,

  avatar,

  badge,

  statut = "normal",

  taille = "md",

}: Props) {

  const size =

    taille === "lg"

      ? "h-28 w-28 text-6xl"

      : taille === "sm"

      ? "h-14 w-14 text-2xl"

      : "h-20 w-20 text-4xl";

  const ring =

    statut === "hot"

      ? "ring-4 ring-green-400"

      : statut === "warning"

      ? "ring-4 ring-red-400"

      : "ring-2 ring-slate-300";

  return (

    <div className="flex flex-col items-center">

      <div

        className={`relative flex ${size} ${ring}
        items-center justify-center rounded-full
        bg-white shadow-xl`}

      >

        {avatar ? (

          <img

            src={avatar}

            alt={prenom}

            className="h-full w-full rounded-full object-cover"

          />

        ) : (

          <span>

            👤

          </span>

        )}

        {badge && (

          <div

            className="absolute -bottom-2 rounded-full
            bg-amber-400 px-2 py-1 text-xs font-black"

          >

            {badge}

          </div>

        )}

      </div>

      <p className="mt-3 font-black">

        {prenom}

      </p>

    </div>

  );

}