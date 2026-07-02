type Props = {
  badge: string;
  titre: string;
  color: string;
};

export default function SectionTitle({
  badge,
  titre,
  color,
}: Props) {
  return (
    <>
      <p
        className={`${color} font-black uppercase tracking-widest`}
      >
        {badge}
      </p>

      <h2 className="text-4xl font-black mt-3 mb-8">
        {titre}
      </h2>
    </>
  );
}