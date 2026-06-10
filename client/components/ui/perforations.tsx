export default function Perforations({
  count = 40,
  className = "",
  color,
}: {
  count: number;
  className: string;
  color?: string;
}) {
  return (
    <ol aria-hidden="true" className={`flex list-none p-0 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className={`w-2 h-2 rounded-full ${color ? color : "bg-zinc-800"}`}
        />
      ))}
    </ol>
  );
}
