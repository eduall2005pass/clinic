"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/dashboard/ProfileCard";
import DashboardSectionCard from "@/components/dashboard/DashboardSectionCard";
import { dashboardSections } from "@/lib/dashboard";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

export default function DashboardHome() {
  const router = useRouter();
  const { user, profile, access, authLoading, profileLoading, configured } =
    useAuth();

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, configured, router]);

  if (authLoading || profileLoading || !user || !profile) {
    return <AccessLoading label="Loading your dashboard..." />;
  }

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ProfileCard
          name={profile.fullName}
          studentId={profile.studentId}
          avatarUrl={profile.profilePictureUrl}
        />

        {!access.hasEnrollment ? (
          <div className="mt-8 rounded-2xl border border-primary-600/30 bg-primary-600/10 p-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </span>
            <h2 className="mt-5 text-xl font-bold text-heading">
              Enroll in a Course to Get Started
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
              Please enroll in a course to access your learning dashboard —
              classes, materials, exams, favourites, progress and more.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
              >
                Explore Courses
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
              >
                View My Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {dashboardSections.map((section) => (
              <DashboardSectionCard key={section.href} section={section} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}