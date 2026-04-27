export default function DiscoveryLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading discovery…
      </p>
      <div aria-hidden="true">
        <div className="mb-6">
          <div className="h-9 w-56 motion-safe:animate-pulse rounded bg-white/[0.05]" />
          <div className="mt-2 h-4 w-72 motion-safe:animate-pulse rounded bg-white/[0.04]" />
        </div>

        <div className="glass-card mb-6 rounded-xl p-6">
          <div className="mb-4 h-6 w-40 motion-safe:animate-pulse rounded bg-white/[0.05]" />
          <div className="flex gap-2">
            <div className="h-10 flex-1 motion-safe:animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-10 w-28 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
          </div>
        </div>

        <div className="mb-3 h-5 w-32 motion-safe:animate-pulse rounded bg-white/[0.05]" />
        <div className="glass-card divide-y divide-white/[0.04] overflow-hidden rounded-xl">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3">
              <div className="h-4 w-24 motion-safe:animate-pulse rounded bg-white/[0.05]" />
              <div className="h-4 w-24 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-16 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-12 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-20 motion-safe:animate-pulse rounded bg-white/[0.05]" />
              <div className="h-4 w-16 motion-safe:animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
