"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/dashboard/ProfileCard";
import DashboardSectionCard from "@/components/dashboard/DashboardSectionCard";
import { dashboardSections } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";

function DashboardLoading() {
  return (
    <main className="flex flex-1 items-center justify-center bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-neutral-400">Loading your dashboard...</p>
      </div>
    </main>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading, configured } = useAuth();

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, configured, router]);

  if (authLoading || profileLoading || !user || !profile) {
    return <DashboardLoading />;
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ProfileCard
          name={profile.fullName}
          studentId={profile.studentId}
          avatarUrl={profile.profilePictureUrl}
        />

        <div className="mt-8 flex flex-col gap-4">
          {dashboardSections.map((section) => (
            <DashboardSectionCard key={section.href} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}