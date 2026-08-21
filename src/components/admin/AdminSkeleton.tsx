export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-neutral-200 admin-dark:bg-zinc-800 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm admin-dark:border-zinc-800 admin-dark:bg-zinc-900 ${className}`}
    >
      <SkeletonLine className="h-10 w-10 rounded-xl" />
      <SkeletonLine className="mt-5 h-4 w-2/3" />
      <SkeletonLine className="mt-3 h-3 w-full" />
      <SkeletonLine className="mt-2 h-3 w-4/5" />
    </div>
  );
}

export default function AdminPageSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div aria-hidden>
        <SkeletonLine className="h-3 w-40" />
        <SkeletonLine className="mt-4 h-8 w-72 max-w-full" />
        <SkeletonLine className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </section>
  );
}
