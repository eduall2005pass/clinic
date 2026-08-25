"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading } from "@/components/auth/AccessGuard";

type Student = {
  uid: string;
  studentId?: string;
  fullName?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  institution?: string;
  hscBatch?: string;
};

type Tab = "all" | "enrolled" | "active" | "inactive";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all", label: "All Students" },
  { key: "enrolled", label: "Enrolled Students" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export default function StudentControlPage() {
  const { user, authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [students, setStudents] = useState<Student[] | null>(null);
  const [enrolledUids, setEnrolledUids] = useState<Set<string> | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const auth = { Authorization: `Bearer ${await user.getIdToken()}` };
      const [studentsRes, enrollmentsRes] = await Promise.all([
        fetch("/api/admin/students?status=all", { headers: auth, cache: "no-store" }),
        fetch("/api/admin/enrollments?status=active", { headers: auth, cache: "no-store" }),
      ]);
      if (!studentsRes.ok) throw new Error("failed");
      const data = (await studentsRes.json()) as { students?: Student[] };
      setStudents(Array.isArray(data.students) ? data.students : []);
      if (enrollmentsRes.ok) {
        const data = (await enrollmentsRes.json()) as {
          enrollments?: Array<{ studentUid: string }>;
        };
        setEnrolledUids(
          new Set((data.enrollments ?? []).map((item) => item.studentUid)),
        );
      }
    } catch {
      setError(true);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [authLoading, user, load]);

  async function setActive(student: Student, isActive: boolean) {
    if (!user) return;
    try {
      await fetch("/api/admin/students", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ uid: student.uid, isActive }),
      });
      setStudents((prev) =>
        (prev ?? []).map((item) =>
          item.uid === student.uid ? { ...item, isActive } : item,
        ),
      );
    } catch {
      // keep previous state
    }
  }

  const visible = useMemo(() => {
    const list = students ?? [];
    switch (tab) {
      case "active":
        return list.filter((student) => student.isActive !== false);
      case "inactive":
        return list.filter((student) => student.isActive === false);
      case "enrolled":
        return list.filter(
          (student) => enrolledUids?.has(student.uid) ?? false,
        );
      default:
        return list;
    }
  }, [students, tab, enrolledUids]);

  if (authLoading || (!user && authLoading)) {
    return <AccessLoading label="Loading Student Control…" />;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold text-heading">Student Control</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Registered MediSpark students and their account status.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? "border-primary-500/60 bg-primary-600/15 text-primary-300"
                : "border-ink/15 bg-ink/5 text-neutral-300 hover:border-primary-500/50 hover:text-heading"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load students. Please try again.
        </p>
      ) : students === null ? (
        <AccessLoading label="Loading students…" />
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-neutral-500">
          No students in this view.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {visible.map((student) => (
            <li
              key={student.uid}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-dark-900 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">
                  {student.fullName || student.name || student.email || student.uid}
                </p>
                <p className="truncate text-[11px] text-neutral-500">
                  {[student.studentId, student.email, student.institution]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {enrolledUids?.has(student.uid) && (
                <span className="rounded-full border border-blue-500/30 bg-blue-600/10 px-2.5 py-1 text-[11px] font-bold text-blue-400">
                  Enrolled
                </span>
              )}
              <button
                type="button"
                onClick={() => void setActive(student, student.isActive === false)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  student.isActive === false
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                }`}
              >
                {student.isActive === false ? "Activate" : "Deactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
