type SectionHeaderProps = {
  label: string;
  title: string;
  description?: string;
};

export default function SectionHeader({
  label,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
        <span className="h-px w-6 bg-primary-600/60" />
        {label}
        <span className="h-px w-6 bg-primary-600/60" />
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-neutral-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}