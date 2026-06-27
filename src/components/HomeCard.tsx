type HomeCardProps = {
  icon: string;
  title: string;
  subtitle: string;
};

export default function HomeCard({
  icon,
  title,
  subtitle,
}: HomeCardProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-10 hover:shadow-2xl transition-all duration-300 cursor-pointer">

      <div className="text-7xl text-center mb-6">
        {icon}
      </div>

      <h2 className="text-3xl font-bold text-center text-slate-800">
        {title}
      </h2>

      <p className="text-center text-slate-500 mt-4">
        {subtitle}
      </p>

    </div>
  );
}