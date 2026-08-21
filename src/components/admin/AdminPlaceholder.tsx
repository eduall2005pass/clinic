import type { ComponentType, SVGProps } from "react";
import type { ReactNode } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AdminPlaceholder({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children?: ReactNode;
}) {
  const Icon = icon;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminPageHeader title={title} description={description} />

      <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 transition-colors duration-300 sm:p-12 admin-dark:border-zinc-800 admin-dark:bg-zinc-900">
        <AdminEmptyState
          icon={Icon ? <Icon className="h-7 w-7" /> : undefined}
          title="Coming Soon"
          description="This section is part of the Admin Panel structure. Functionality will be added in an upcoming step."
        />
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
