"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/dashboard/ProfileCard";
import DashboardSectionCard from "@/components/dashboard/DashboardSectionCard";
import AccessPermissionModal from "@/components/dashboard/AccessPermissionModal";
import {
  dashboardSections,
  renderDashboardIcon,
  type DashboardSection,
} from "@/lib/dashboard";
import type { DashboardCard } from "@/lib/dashboard-cards";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import AdminHold, { useIsAdmin } from "@/components/admin/AdminHold";

/** Sections a registered student may open WITHOUT any course enrollment. */
const ENROLLMENT_FREE_SECTIONS = new Set([
  "/dashboard/profile",
  "/dashboard/exam-result",
]);

function cardToSection(card: DashboardCard): DashboardSection {
  return {
    title: card.title,
    description: card.description,
    href: card.href,
    icon: renderDashboardIcon(card.icon),
  };
}

export default function DashboardHome({
  adminControls = false,
}: {
  /** Admin Panel only — enables press & hold Edit/Remove on each card. */
  adminControls?: boolean;
} = {}) {
  const router = useRouter();
  const { user, profile, access, authLoading, profileLoading, configured } =
    useAuth();
  const [permissionOpen, setPermissionOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const showHold = adminControls && isAdmin;
  // null = loading; [] would mean the DB has no active cards.
  const [cards, setCards] = useState<DashboardCard[] | null>(null);

  // Live dashboard cards — admin manages these via Dashboard Control.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard-cards", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: { cards?: DashboardCard[] }) => {
        if (!cancelled) setCards(Array.isArray(data.cards) ? data.cards : []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (authLoading || profileLoading || !user || !profile || cards === null) {
    return <AccessLoading label="Loading your dashboard..." />;
  }

  // Registered + no enrolled course → every course-dependent card opens the
  // Access Permission Card instead of its page. The user stays logged in.
  const hasEnrollment = access.hasEnrollment;

  const sections: DashboardSection[] =
    cards.length > 0
      ? cards.map(cardToSection)
      : dashboardSections;

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
          {sections.map((section) => {
            const locked = !hasEnrollment && !ENROLLMENT_FREE_SECTIONS.has(section.href);
            const cardNode = (
              <DashboardSectionCard
                key={section.href}
                section={section}
                wide={section.href === "/dashboard/enrolled-courses"}
                locked={locked}
                onLockedClick={() => setPermissionOpen(true)}
              />
            );
            if (!showHold) return cardNode;
            return (
              <AdminHold
                key={`${section.href}-hold`}
                isAdmin
                editHref="/admin/dashboard-control/manage"
                removeKind="dashboard-card"
                removeId={section.href.replace("/dashboard/", "")}
                label={section.title}
              >
                {cardNode}
              </AdminHold>
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
