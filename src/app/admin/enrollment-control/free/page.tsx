"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  ControlCourseCard,
  useControlCourses,
} from "@/components/admin/EnrollmentControlShared";

/**
 * Free Course Enrollment — Auto Enrollment ON/OFF (persisted in MySQL)
 * + every free course as its own applications page entry.
 */
export default function FreeEnrollmentPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const { courses, error } = useControlCourses();
  const [freeAutoEnroll, setFreeAutoEnroll] = useState<boolean | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const res = await fetch("/api/admin/enrollment-settings", {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { freeAutoEnroll?: boolean };
          setFreeAutoEnroll(data.freeAutoEnroll !== false);
        }
      } catch {
        // stays null → toggle disabled
      }
    })();
  }, [user]);

  async function toggleAutoEnroll() {
    if (freeAutoEnroll === null || savingToggle || !user) return;
    setSavingToggle(true);
    const next = !freeAutoEnroll;
    try {
      const res = await fetch("/api/admin/enrollment-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ freeAutoEnroll: next }),
      });
      if (!res.ok) {
        toast.showToast("error", "Failed to save the setting.");
        return;
      }
      setFreeAutoEnroll(next);
      toast.showToast(
        "success",
        next
          ? "Auto Enrollment ON — free enrollments are instant."
          : "Auto Enrollment OFF — free enrollments now need approval.",
      );
    } finally {
      setSavingToggle(false);
    }
  }

  if (authLoading) return <AccessLoading label="Loading…" />;

  const freeCourses = (courses ?? []).filter((course) => course.kind === "free");

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Free Course Enrollment</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Auto Enrollment switch and course-wise manual enrollment.
      </p>

      {/* Auto Enrollment */}
      <div className="mt-8 rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20">
        <h2 className="text-lg font-bold text-heading">Auto Enrollment</h2>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-dark-950/60 p-4">
          <div>
            <p className="font-semibold text-heading">
              Auto Enrollment is{" "}
              <span className={freeAutoEnroll ? "text-emerald-400" : "text-yellow-400"}>
                {freeAutoEnroll === null ? "…" : freeAutoEnroll ? "ON" : "OFF"}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              ON → eligible students are enrolled into free courses instantly.
              OFF → every free enrollment waits for your approval below.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={freeAutoEnroll === true}
            aria-label="Toggle auto enrollment"
            onClick={() => void toggleAutoEnroll()}
            disabled={savingToggle || freeAutoEnroll === null}
            className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition ${
              freeAutoEnroll ? "bg-emerald-500" : "bg-zinc-600"
            } ${savingToggle ? "opacity-60" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                freeAutoEnroll ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Manual enrollment — course-wise */}
      <h2 className="mt-8 text-lg font-bold text-heading">Manual Enrollment</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Pick a course to review its enrollment applications.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load the course list.
        </p>
      ) : courses === null ? (
        <AccessLoading label="Loading free courses…" />
      ) : freeCourses.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No free courses published yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {freeCourses.map((course) => (
            <ControlCourseCard key={course.slug} course={course} kind="free" />
          ))}
        </div>
      )}
    </section>
  );
}
