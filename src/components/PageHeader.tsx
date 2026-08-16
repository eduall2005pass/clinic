export default function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
          MediSpark
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-400">{description}</p>
      </div>
    </section>
  );
}