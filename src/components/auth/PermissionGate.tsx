"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isActiveEnrollment } from "@/lib/enrollments";
import { useAuth } from "@/lib/auth-context";
import PermissionGuidanceCard, {
  type PermissionGuidance,
} from "./PermissionGuidanceCard";

export function AccessLoading({ label }: { label: string }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </main>
  );
}

export type PermissionRequirement =
  | "login"
  | "registered"
  | "enrolled"
  | "course"
  | "qa";

export function courseDeniedGuidance({
  courseSlug,
  courseKind,
  hasAnyEnrollment,
  hasPaidEnrollment,
}: {
  courseSlug: string;
  courseKind?: "free" | "paid";
  hasAnyEnrollment: boolean;
  hasPaidEnrollment: boolean;
}): PermissionGuidance {
  const courseHref = `/courses/${encodeURIComponent(courseSlug)}`;

  if (courseKind !== "paid") {
    return {
      title: "Course Enrollment Required",
      message: hasAnyEnrollment
        ? "আপনি এই Course-এ enrolled নন। এই content access করতে হলে এই Course-এ Enroll করতে হবে।"
        : "এই content দেখতে হলে প্রথমে সংশ্লিষ্ট Course-এ Enroll করতে হবে।",
      actionLabel: hasAnyEnrollment ? "View Course" : "Explore Courses",
      actionHref: hasAnyEnrollment ? courseHref : "/courses",
    };
  }

  if (hasPaidEnrollment) {
    return {
      title: "Course Enrollment Required",
      message:
        "আপনি এই Course-এ enrolled নন। এই content access করতে হলে এই Course-এ Enroll করতে হবে।",
      actionLabel: "View Course",
      actionHref: courseHref,
    };
  }

  if (hasAnyEnrollment) {
    return {
      title: "Paid Course Required",
      message:
        "এই content শুধুমাত্র সংশ্লিষ্ট Paid Course-এ enrolled students-এর জন্য available।",
      actionLabel: "View Course",
      actionHref: courseHref,
    };
  }

  return {
    title: "Course Enrollment Required",
    message: "এই content দেখতে হলে প্রথমে সংশ্লিষ্ট Course-এ Enroll করতে হবে।",
    actionLabel: "Explore Courses",
    actionHref: "/courses",
  };
}

function qaRestrictedGuidance(): PermissionGuidance {
  return {
    title: "Q&A Access Restricted",
    message:
      "Q&A সুবিধাটি শুধুমাত্র Paid Course-এ enrolled students-এর জন্য available।",
    actionLabel: "Explore Paid Courses",
    actionHref: "/courses?kind=paid",
  };
}

export default function PermissionGate({
  requirement,
  children,
  courseSlug,
  courseKind,
  loadingLabel = "Loading...",
}: {
  requirement: PermissionRequirement;
  children: ReactNode;
  courseSlug?: string;
  courseKind?: "free" | "paid";
  loadingLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, enrollments, access, authLoading, profileLoading, configured, signInWithGoogle } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);

  if (authLoading || profileLoading) {
    return <AccessLoading label={loadingLabel} />;
  }

  if (!user) {
    const loginGuidance: PermissionGuidance = configured
      ? {
          title: "Login Required",
          message:
            "এই সুবিধাটি ব্যবহার করতে প্রথমে আপনার MediSpark account-এ Login করুন।",
          actionLabel: "Continue with Google",
          onAction: () => {
            setSigningIn(true);
            void signInWithGoogle()
              .catch(() => undefined)
              .finally(() => setSigningIn(false));
          },
          actionPending: signingIn,
        }
      : {
          title: "Login Required",
          message:
            "এই সুবিধাটি ব্যবহার করতে প্রথমে আপনার MediSpark account-এ Login করুন।",
          actionLabel: "Continue with Google",
          onAction: () =>
            router.push(`/login?next=${encodeURIComponent(pathname)}`),
        };
    return <PermissionGuidanceCard guidance={loginGuidance} />;
  }

  if (!profile && requirement !== "login") {
    return (
      <PermissionGuidanceCard
        guidance={{
          title: "Registration Required",
          message:
            "এই সুবিধা ব্যবহার করতে হলে প্রথমে আপনার MediSpark registration complete করুন।",
          actionLabel: "Complete Registration",
          actionHref: `/register?next=${encodeURIComponent(pathname)}`,
        }}
      />
    );
  }

  const activeEnrollments = enrollments.filter(isActiveEnrollment);
  const hasAnyEnrollment = activeEnrollments.length > 0;

  let allowed = true;
  let guidance: PermissionGuidance | null = null;

  if (requirement === "enrolled") {
    allowed = hasAnyEnrollment;
    if (!allowed) {
      guidance = {
        title: "Course Enrollment Required",
        message:
          "এই content দেখতে হলে প্রথমে সংশ্লিষ্ট Course-এ Enroll করতে হবে।",
        actionLabel: "Explore Courses",
        actionHref: "/courses",
      };
    }
  } else if (requirement === "course") {
    const enrolledHere =
      !!courseSlug &&
      activeEnrollments.some((item) => item.courseId === courseSlug);
    allowed = enrolledHere;
    if (!allowed && courseSlug) {
      guidance = courseDeniedGuidance({
        courseSlug,
        courseKind,
        hasAnyEnrollment,
        hasPaidEnrollment: access.hasPaidEnrollment,
      });
    }
  } else if (requirement === "qa") {
    allowed = access.hasPaidEnrollment;
    if (!allowed) {
      guidance = qaRestrictedGuidance();
    }
  }

  if (!allowed && guidance) {
    return <PermissionGuidanceCard guidance={guidance} />;
  }

  return <>{children}</>;
}
