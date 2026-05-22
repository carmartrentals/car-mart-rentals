/** Skeleton shown while an admin page loads. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6 h-7 w-56 animate-pulse rounded bg-slate-200" />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
