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
    <section className="border-b border-slate-200 bg-brand-950 py-14">
      <div className="container-px">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
            {eyebrow}
          </p>
        )}
        <h1 className="heading-display mt-1 text-3xl font-bold text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-slate-300">{description}</p>
        )}
      </div>
    </section>
  );
}
