export default function RacksLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading racks…
      </p>
      <div aria-hidden="true">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="h-9 w-32 motion-safe:animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-2 h-4 w-56 motion-safe:animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-10 w-32 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="surface-card flex flex-col gap-3 p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
                <div className="flex-1">
                  <div className="h-5 w-32 motion-safe:animate-pulse rounded bg-white/[0.05]" />
                  <div className="mt-1.5 h-3 w-20 motion-safe:animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
              <div className="h-2 w-full motion-safe:animate-pulse rounded-full bg-white/[0.04]" />
              <div className="h-3 w-24 motion-safe:animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
