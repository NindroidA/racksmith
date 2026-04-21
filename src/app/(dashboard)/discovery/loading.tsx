export default function DiscoveryLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-9 w-56 animate-pulse rounded bg-white/[0.05]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-white/[0.04]" />
      </div>

      <div className="glass-card mb-6 rounded-xl p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-white/[0.05]" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-white/[0.04]" />
          <div className="h-10 w-28 animate-pulse rounded-lg bg-white/[0.05]" />
        </div>
      </div>

      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-white/[0.05]" />
      <div className="glass-card divide-y divide-white/[0.04] overflow-hidden rounded-xl">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-4 w-12 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
