"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCourseAccess } from "@/lib/course-access";
import EnrollModal from "@/components/auth/EnrollModal";
import type { Course } from "@/lib/courses";

export default function EnrollButton({
  course,
  variant = "card",
  defaultOpen = false,
}: {
  course: Course;
  variant?: "card" | "details";
  defaultOpen?: boolean;
}) {
  const { authLoading, configured } = useAuth();
  const { isActive, isPending } = useCourseAccess(course);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaultOpen && !authLoading && configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, [defaultOpen, authLoading, configured]);

  const label = isActive ? "Enrolled" : isPending ? "Pending" : "Enroll";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!configured}
        className={
          variant === "details"
            ? "w-full rounded-xl bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            : "flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {label}
      </button>
      <EnrollModal course={course} open={open} onClose={() => setOpen(false)} />
    </>
  );
}