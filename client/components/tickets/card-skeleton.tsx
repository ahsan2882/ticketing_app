export default function CardSkeleton() {
  return (
    <div className="rounded-lg border border-white/10 border-l-4 border-l-white/10 bg-[#0b0b0f] overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 w-16 bg-white/10 rounded" />
          <div className="h-4 w-4 bg-white/10 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
        <div className="h-3 w-1/2 bg-white/10 rounded mb-5" />
        <div className="h-3 w-2/3 bg-white/10 rounded mb-2" />
        <div className="h-3 w-1/3 bg-white/10 rounded mb-5" />
        <div className="flex items-center justify-between pt-4 border-t border-dashed border-white/10">
          <div className="h-5 w-10 bg-white/10 rounded" />
          <div className="h-5 w-10 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}
