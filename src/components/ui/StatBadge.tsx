type Props = {
  label: string;
  value: string | number;
};

export default function StatBadge({
  label,
  value,
}: Props) {
  return (
    <div className="rounded-2xl bg-slate-100 p-5">

      <p className="text-slate-500">
        {label}
      </p>

      <h3 className="text-3xl font-black mt-2">
        {value}
      </h3>

    </div>
  );
}