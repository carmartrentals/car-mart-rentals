/** Skeleton shown while the fleet page loads. */
export default function Loading() {
  return (
    <section className="bg-brand-950 py-12">
      <div className="container-px">
        <div className="h-9 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-white/5" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="hidden h-80 animate-pulse rounded-2xl bg-white/5 lg:block" />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <div className="aspect-[16/10] animate-pulse bg-white/5" />
                <div className="space-y-2.5 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                  <div className="h-9 w-full animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
