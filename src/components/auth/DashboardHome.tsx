"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/dashboard/ProfileCard";
import DashboardSectionCard from "@/components/dashboard/DashboardSectionCard";
import AccessPermissionModal from "@/components/dashboard/AccessPermissionModal";
import { dashboardSections } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

/** Sections a registered student may open WITHOUT any course enrollment. */
const ENROLLMENT_FREE_SECTIONS = new Set([
  "/dashboard/profile",
  "/dashboard/exam-result",
]);

export default function DashboardHome() {
  const router = useRouter();
  const { user, profile, access, authLoading, profileLoading, configured } =
    useAuth();
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profileLoading && !profile) {
      router.replace("/register");
    }
  }, [user, profile, profileLoading, authLoading, configured, router]);

  if (authLoading || profileLoading || !user || !profile) {
    return <AccessLoading label="Loading your dashboard..." />;
  }

  // Registered + no enrolled course → every course-dependent card opens the
  // Access Permission Card instead of its page. The user stays logged in.
  const hasEnrollment = access.hasEnrollment;

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ProfileCard
          name={profile.fullName}
          studentId={profile.studentId}
          avatarUrl={profile.profilePictureUrl}
        />

        {!hasEnrollment && (
          <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center text-xs font-semibold text-yellow-200/80">
            You are not enrolled in any course yet — enroll to unlock all
            dashboard features.
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {dashboardSections.map((section) => {
            const locked = !hasEnrollment && !ENROLLMENT_FREE_SECTIONS.has(section.href);
            return (
              <DashboardSectionCard
                key={section.href}
                section={section}
                wide={section.href === "/dashboard/enrolled-courses"}
                locked={locked}
                onLockedClick={() => setPermissionOpen(true)}
              />
            );
          })}
        </div>
      </section>

      <AccessPermissionModal
        open={permissionOpen}
        onClose={() => setPermissionOpen(false)}
      />
    </main>
  );
}
