type Badge = {
  id: string;
  emoji: string;
  titre: string;
  description: string;
  active: boolean;
};

export default function BadgeCenter() {
  const badges: Badge[] = [
    {
      id: "badge-assurance",
      emoji: "🛡️",
      titre: "Protecteur",
      description: "Badge lie aux ventes Assurance.",
      active: true,
    },
    {
      id: "badge-box",
      emoji: "📦",
      titre: "Expert Box",
      description: "Badge lie aux ventes Box.",
      active: true,
    },
    {
      id: "badge-challenge",
      emoji: "⚔️",
      titre: "Challenger",
      description: "Badge lie aux defis acceptes.",
      active: false,
    },
  ];

  return (
    <section className="rounded-[32px] bg-white p-8 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-black uppercase tracking-[0.3em] text-amber-500">
            KPILOTE BADGES
          </p>

          <h2 className="mt-2 text-4xl font-black">
            Tes badges
          </h2>
        </div>

        <div className="text-5xl">🏅</div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-3xl border p-5 ${
              badge.active
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-slate-100 opacity-60"
            }`}
          >
            <div className="text-4xl">{badge.emoji}</div>

            <h3 className="mt-4 font-black">
              {badge.titre}
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {badge.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}