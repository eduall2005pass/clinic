import type { DashboardSubItem } from "@/lib/dashboard";

/**
 * Sub-unit grid for a dashboard section — part of the final dashboard
 * navigation hierarchy. Sub-units are placeholders until their data is
 * connected in a later step.
 */
export default function DashboardSubUnits({
  items,
}: {
  items: DashboardSubItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.title}
          className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-4 shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-sm font-bold text-primary-400">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-heading">
              {item.title}
            </span>
            <span className="mt-0.5 block truncate text-xs text-neutral-400">
              {item.description}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
