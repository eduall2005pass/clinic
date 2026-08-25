"use client";

import type { ReactNode } from "react";
import AdminHold, { useIsAdmin } from "./AdminHold";

/**
 * Wraps one homepage section for admins: press & hold → Edit / Remove.
 * Edit opens the section's MySQL-backed manager; Remove hides the section
 * via the homepage-sections API. Renders children untouched for normal users.
 */
export default function AdminSectionHold({
  sectionKey,
  editHref,
  label,
  removable = true,
  children,
}: {
  sectionKey: string;
  editHref: string;
  label: string;
  removable?: boolean;
  children: ReactNode;
}) {
  const isAdmin = useIsAdmin();
  return (
    <AdminHold
      isAdmin={isAdmin}
      editHref={editHref}
      removeKind={removable ? "homepage-section" : undefined}
      removeId={removable ? sectionKey : undefined}
      label={label}
    >
      {children}
    </AdminHold>
  );
}
