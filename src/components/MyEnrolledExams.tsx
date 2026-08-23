"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ExamCard from "@/components/ExamCard";
import type { PublicExam, ExamStatus } from "@/lib/public-exams";

type MyExam = {
  id: string;
  title: string;
  subject: string;
  courseType: "Academic" | "Admission";
  totalMarks: number;
  durationMinutes: number;
  scheduledAt: string | null;
  status: ExamStatus;
};

function toPublicExam(exam: MyExam): PublicExam {
  const scheduledIso = exam.scheduledAt ?? "";
  return {
    id: exam.id,
    name: exam.title,
    batch: "",
    courseType: exam.courseType,
    totalMarks: exam.totalMarks,
    durationMinutes: exam.durationMinutes,
    examDate: scheduledIso.slice(0, 10),
    examTime: scheduledIso
      ? new Date(scheduledIso).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "",
    status: exam.status,
    published: true,
    eligibility: { mode: "all", rules: [] },
  };
}

/**
 * Enrolled-kind exams the logged-in student may take — shown above the
 * public list on /exam. Requires login + course enrollment (server-checked).
 */
export default function MyEnrolledExams() {
  const { user, authLoading } = useAuth();
  const [exams, setExams] = useState<MyExam[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setExams(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/exams/mine", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          exams?: MyExam[];
        };
        if (!cancelled) setExams(data.exams ?? []);
      } catch {
        if (!cancelled) setExams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (!exams || exams.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h2 className="text-xl font-extrabold tracking-tight text-heading">
        My Enrolled Exams
      </h2>
      <p className="mt-1 text-sm text-neutral-400">
        Exams included with the courses you are enrolled in.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={toPublicExam(exam)} />
        ))}
      </div>
    </section>
  );
}
