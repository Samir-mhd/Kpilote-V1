type Props = {
  value: number;
  color: string;
  height?: string;
};

export default function ProgressBar({
  value,
  color,
  height = "h-4",
}: Props) {
  return (
    <div
      className={`${height} bg-slate-200 rounded-full overflow-hidden`}
    >
      <div
        className={`${height} ${color} transition-all duration-700`}
        style={{
          width: `${Math.min(value, 100)}%`,
        }}
      />
    </div>
  );
}