export default function TopologyLoading() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="h-9 w-56 animate-pulse rounded bg-white/[0.05]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-32 animate-pulse rounded-lg bg-white/[0.05]"
          />
        ))}
      </div>

      <div className="surface-card h-[600px] animate-pulse bg-white/[0.02]" />
    </div>
  );
}
