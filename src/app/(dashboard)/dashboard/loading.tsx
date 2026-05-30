export default function DashboardLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading dashboard…
      </p>
      <div aria-hidden="true">
        <div className="mb-8">
          <div className="h-9 w-48 motion-safe:animate-pulse rounded bg-white/[0.05]" />
          <div className="mt-2 h-4 w-64 motion-safe:animate-pulse rounded bg-white/[0.04]" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-20 motion-safe:animate-pulse rounded bg-white/[0.05]" />
                  <div className="h-9 w-16 motion-safe:animate-pulse rounded bg-white/[0.06]" />
                </div>
                <div className="h-12 w-12 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="mb-4 h-6 w-40 motion-safe:animate-pulse rounded bg-white/[0.05]" />
          <div className="surface-card divide-y divide-white/[0.04] overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 shrink-0 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
                <div className="flex-1">
                  <div className="h-4 w-2/3 motion-safe:animate-pulse rounded bg-white/[0.05]" />
                </div>
                <div className="h-3 w-12 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
