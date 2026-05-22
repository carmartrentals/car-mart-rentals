/** Skeleton shown while a vehicle detail page loads. */
export default function Loading() {
  return (
    <div className="bg-brand-950">
      <div className="container-px py-8">
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="aspect-[16/10] animate-pulse rounded-2xl bg-white/5" />
            <div className="mt-3 grid grid-cols-5 gap-2.5 sm:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] animate-pulse rounded-lg bg-white/5"
                />
              ))}
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-7 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
