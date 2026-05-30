export default function DevicesLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading devices…
      </p>
      <div aria-hidden="true">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="h-9 w-32 motion-safe:animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-2 h-4 w-40 motion-safe:animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="h-10 w-32 motion-safe:animate-pulse rounded-lg bg-white/[0.05]" />
          </div>
        </div>

        <div className="mb-4 h-12 w-full motion-safe:animate-pulse rounded-lg bg-white/[0.04]" />

        <div className="mb-4 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-24 motion-safe:animate-pulse rounded-lg bg-white/[0.04]"
            />
          ))}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="grid grid-cols-6 gap-4 border-b border-white/[0.06] px-4 py-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-3 w-16 motion-safe:animate-pulse rounded bg-white/[0.05]"
              />
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="grid grid-cols-6 items-center gap-4 border-b border-white/[0.04] px-4 py-3 last:border-b-0"
            >
              <div className="h-8 w-20 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-32 motion-safe:animate-pulse rounded bg-white/[0.05]" />
              <div className="h-4 w-16 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-20 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-24 motion-safe:animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-16 motion-safe:animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
