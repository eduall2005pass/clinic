"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAdmin } from "@/lib/admin-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

/**
 * Guards admin panel routes. Unauthorized visitors are redirected to
 * the homepage — hiding UI is never enough; every admin API call is
 * additionally verified server-side against Firestore.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { isAdmin, adminLoading } = useAdmin();

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user || !isAdmin) {
      router.replace("/");
    }
  }, [user, isAdmin, authLoading, adminLoading, router]);

  if (authLoading || adminLoading) {
    return <AccessLoading label="Checking administrator access…" />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}