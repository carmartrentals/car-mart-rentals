/** Skeleton shown while a customer portal page loads. */
export default function Loading() {
  return (
    <div>
      <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />

      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}
