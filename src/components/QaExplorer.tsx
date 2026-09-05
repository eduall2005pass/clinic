"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QaAskOptions, QaQuestion, QaSubject } from "@/lib/qa";
import QaSubjectPicker from "@/components/QaSubjectPicker";
import type { SubjectStats } from "@/components/QaSubjectPicker";
import QaQuestionItem from "@/components/QaQuestionItem";
import QaAskForm, { type QaAskPayload } from "@/components/QaAskForm";
import QaGuideline from "@/components/QaGuideline";
import PermissionGuidanceCard, {
  type PermissionGuidance,
} from "@/components/auth/PermissionGuidanceCard";
import { useAuth } from "@/lib/auth-context";
import type { QaAskCardSettings } from "@/lib/qa-ask-card-settings";

export default function QaExplorer({
  subjects,
  questions,
  askCardSettings: initialAskCardSettings,
}: {
  subjects: QaSubject[];
  questions: QaQuestion[];
  askCardSettings?: import("@/lib/qa-ask-card-settings").QaAskCardSettings | null;
}) {
  const router = useRouter();
  const {
    user,
    access,
    authLoading,
    configured,
    signInWithGoogle,
  } = useAuth();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );
  const [askOpen, setAskOpen] = useState(false);
  const [askOptions, setAskOptions] = useState<QaAskOptions | null>(null);
  const [askOptionsError, setAskOptionsError] = useState<string | null>(null);
  const [askGuidance, setAskGuidance] = useState<PermissionGuidance | null>(
    null
  );
  const [signingIn, setSigningIn] = useState(false);
  const [askCardSettings, setAskCardSettings] = useState<QaAskCardSettings | null>(
    initialAskCardSettings ?? null
  );

  useEffect(() => {
    if (initialAskCardSettings) return;
    let cancelled = false;
    void fetch("/api/qa/ask-card", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.title === "string") {
          setAskCardSettings(data as QaAskCardSettings);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialAskCardSettings]);

  const subjectStats = useMemo(
    () =>
      subjects.reduce<Record<string, SubjectStats>>((stats, subject) => {
        if (subject.id === "guideline") {
          stats[subject.id] = { total: null, answered: null };
          return stats;
        }
        const subjectQuestions = questions.filter(
          (question) => question.subjectId === subject.id
        );
        stats[subject.id] = {
          total: subjectQuestions.length,
          answered: subjectQuestions.filter(
            (question) => question.status === "answered"
          ).length,
        };
        return stats;
      }, {}),
    [subjects, questions]
  );

  const selectedSubject =
    selectedSubjectId === "guideline"
      ? { id: "guideline", name: "Guideline", order: 999 }
      : subjects.find((subject) => subject.id === selectedSubjectId);

  const isGuideline = selectedSubjectId === "guideline";

  const [qaFavIds, setQaFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setQaFavIds(new Set());
      return;
    }
    let cancelled = false;
    void user
      .getIdToken()
      .then((token) =>
        fetch("/api/my/favourites", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { favourites?: { itemType: string; itemId: string }[] } | null) => {
        if (cancelled || !data?.favourites) return;
        const ids = new Set(data.favourites.filter((f) => f.itemType === "qa").map((f) => f.itemId));
        setQaFavIds(ids);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleQuestions = selectedSubjectId
    ? questions.filter(
        (question) => question.subjectId === selectedSubjectId
      )
    : [];

  // Load the ask-form dropdown data — gated to paid enrollments.
  // Everyone can VIEW questions/answers; only paid-enrolled students may ASK.
  const openAsk = async () => {
    if (authLoading) return;
    if (!access.hasPaidEnrollment) {
      if (!user) {
        const guidance: PermissionGuidance = configured
          ? {
              title: "Enrollment Required",
              message:
                "Asking questions is available only to students enrolled in a paid course. Please sign in and enroll in a paid course to ask questions.",
              actionLabel: "View Paid Courses",
              actionHref: "/courses?kind=paid",
              secondaryLabel: signingIn ? "Please wait..." : "Continue with Google",
              onAction: undefined,
            }
          : {
              title: "Enrollment Required",
              message:
                "Asking questions is available only to students enrolled in a paid course. Please sign in and enroll in a paid course to ask questions.",
              actionLabel: "View Paid Courses",
              actionHref: "/courses?kind=paid",
            };
        // For guests with Firebase configured, offer Google sign-in as the
        // primary action and keep View Courses as secondary.
        if (configured && !user) {
          guidance.actionLabel = signingIn ? "Please wait..." : "Continue with Google";
          guidance.onAction = () => {
            setSigningIn(true);
            void signInWithGoogle()
              .catch(() => undefined)
              .finally(() => setSigningIn(false));
          };
          guidance.actionPending = signingIn;
          guidance.secondaryLabel = "View Paid Courses";
          guidance.secondaryHref = "/courses?kind=paid";
        }
        // Add close handler so the overlay can be dismissed.
        setAskGuidance({
          ...guidance,
          onClose: () => setAskGuidance(null),
        });
      } else {
        setAskGuidance({
          title: "Paid Enrollment Required",
          message:
            "Asking questions is available only to students enrolled in a paid course. You can view all questions and answers, but you need an active paid course enrollment to ask a new question.",
          actionLabel: "Explore Paid Courses",
          actionHref: "/courses?kind=paid",
          secondaryLabel: "View My Courses",
          secondaryHref: "/dashboard/enrolled-courses",
          onClose: () => setAskGuidance(null),
        });
      }
      return;
    }

    setAskOpen(true);
    setAskOptions(null);
    setAskOptionsError(null);
    if (!user) return;
    try {
      const res = await fetch("/api/qa/ask-options", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setAskOptions((await res.json()) as QaAskOptions);
    } catch {
      setAskOptionsError(
        "Could not load your course context — please try again."
      );
    }
  };

  // Persist the question to MySQL via /api/qa, then refresh server data.
  const handleAskSubmit = async (
    payload: QaAskPayload
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) {
      return { ok: false, error: "Sign in to ask a question." };
    }
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Failed to submit your question." };
      }
      router.refresh();
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Network error — could not submit your question.",
      };
    }
  };

  // Upload the optional picture before the question itself is submitted.
  const handleUploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/qa/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as {
        url?: string;
      } | null;
      return res.ok && data?.url ? data.url : null;
    } catch {
      return null;
    }
  };

  const closeAsk = () => {
    setAskOpen(false);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {selectedSubject ? (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold text-heading">
                {selectedSubject.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSubjectId(null)}
                className="rounded-lg border border-ink/10 bg-ink/5 px-3 py-1.5 text-xs font-semibold text-neutral-400 transition hover:border-primary-500/60 hover:text-primary-400"
              >
                Change Subject
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-neutral-400">
              Select a subject to browse its questions.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void openAsk()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ask a Question
        </button>
      </div>

      {askGuidance && (
        <PermissionGuidanceCard guidance={askGuidance} />
      )}

      {askOpen && (
        <div className="mb-10">
          {askOptionsError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm font-semibold text-red-400">
              {askOptionsError}
            </div>
          ) : askOptions ? (
            <QaAskForm
              options={askOptions}
              initialSubjectId={selectedSubjectId ?? undefined}
              onSubmit={handleAskSubmit}
              onUploadImage={handleUploadImage}
              onClose={closeAsk}
              cardSettings={askCardSettings}
            />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-dark-900 p-8 text-sm text-neutral-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              Loading your courses…
            </div>
          )}
        </div>
      )}

      {!selectedSubject ? (
        <QaSubjectPicker
          subjects={subjects}
          stats={subjectStats}
          onSelect={(subjectId) => {
            setSelectedSubjectId(subjectId);
            setAskOpen(false);
          }}
        />
      ) : isGuideline ? (
        <QaGuideline />
      ) : visibleQuestions.length > 0 ? (
        <div className="flex flex-col gap-6">
          {visibleQuestions.map((question) => (
            <QaQuestionItem
              key={question.id}
              question={{ ...question, isFavourite: qaFavIds.has(question.id) } as QaQuestion & { isFavourite?: boolean }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-12 text-center">
          <p className="font-semibold text-heading">No questions yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Be the first to ask a question in {selectedSubject.name}.
          </p>
        </div>
      )}
    </div>
  );
}
