export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-brand-950 py-20 sm:py-24">
      <div className="glow-spot pointer-events-none absolute inset-x-0 top-0 h-72" />
      <div className="container-px relative">
        {eyebrow && <p className="eyebrow animate-rise">{eyebrow}</p>}
        <h1 className="heading-display mt-3 text-4xl font-bold leading-tight text-white animate-rise sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-400 animate-rise-slow">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
