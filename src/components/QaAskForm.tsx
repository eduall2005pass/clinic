"use client";

import { useMemo, useState } from "react";
import type { QaAskOptions } from "@/lib/qa";
import type { QaAskCardSettings } from "@/lib/qa-ask-card-settings";

type AskResult = { ok: boolean; error?: string };

export type QaAskPayload = {
  categoryId: string;
  courseId: string;
  subjectId: string;
  text: string;
  imageUrl: string | null;
};

export default function QaAskForm({
  options,
  initialSubjectId,
  onSubmit,
  onUploadImage,
  onClose,
  cardSettings,
}: {
  options: QaAskOptions | null;
  initialSubjectId?: string;
  onSubmit: (payload: QaAskPayload) => Promise<AskResult>;
  onUploadImage?: (file: File) => Promise<string | null>;
  onClose: () => void;
  cardSettings?: Partial<QaAskCardSettings> | null;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [text, setText] = useState("");
  const [pictureName, setPictureName] = useState("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryCourses = useMemo(
    () =>
      (options?.courses ?? []).filter(
        (course) => !categoryId || course.categoryId === categoryId,
      ),
    [options, categoryId],
  );
  const courseSubjects = useMemo(
    () =>
      (options?.subjects ?? []).filter(
        (subject) => !courseId || subject.courseId === courseId,
      ),
    [options, courseId],
  );

  const canSubmit =
    options !== null &&
    categoryId !== "" &&
    courseId !== "" &&
    subjectId !== "" &&
    text.trim().length >= 5 &&
    !busy;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    let imageUrl: string | null = null;
    if (pictureFile && onUploadImage) {
      imageUrl = await onUploadImage(pictureFile);
      if (!imageUrl) {
        setBusy(false);
        setError("Picture upload failed — remove it or try again.");
        return;
      }
    }

    const result = await onSubmit({
      categoryId,
      courseId,
      subjectId,
      text: text.trim(),
      imageUrl,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to submit your question.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-6 text-center">
        <p className="font-semibold text-primary-300">
          Your question has been submitted.
        </p>
        <p className="mt-1 text-sm text-primary-200/70">
          You will be notified when a teacher answers it.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700"
        >
          Back to Questions
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-heading">{cardSettings?.title ?? "Ask a Question"}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close question form"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-ink/10 hover:text-heading"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* No active enrolled course → course-specific questions are blocked. */}
      {options && options.courses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4">
          <p className="text-sm font-bold text-yellow-300">
            No active enrolled course found.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            প্রশ্ন করতে অন্তত একটি Active Enrolled Course থাকতে হবে। Course
            enroll করার পর আবার চেষ্টা করুন।
          </p>
        </div>
      ) : (
        <>
          <label className="mt-6 block">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Category
            </span>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setCourseId("");
                setSubjectId("");
              }}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5 text-sm font-semibold text-heading outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">Select a category</option>
              {(options?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Enrolled Course
            </span>
            <select
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setSubjectId("");
              }}
              disabled={!categoryId}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5 text-sm font-semibold text-heading outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:text-neutral-500"
            >
              <option value="">
                {categoryId
                  ? "Select your enrolled course"
                  : "Select a category first"}
              </option>
              {categoryCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] text-neutral-500">
              শুধুমাত্র আপনি যেসব Course-এ actively enrolled সেগুলোই দেখা যাবে।
            </span>
          </label>

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Subject
            </span>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              disabled={!courseId}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-dark-850 px-4 py-2.5 text-sm font-semibold text-heading outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:text-neutral-500"
            >
              <option value="">
                {courseId ? "Select a subject" : "Select a course first"}
              </option>
              {courseSubjects.map((subject) => (
                <option key={`${subject.courseId}:${subject.id}`} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          {cardSettings?.subtitle ? (
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">{cardSettings.subtitle}</p>
          ) : null}
          {cardSettings?.guidelineText ? (
            <p className="mt-3 rounded-lg border border-primary-500/20 bg-primary-500/10 px-3 py-2 text-[11px] leading-relaxed text-primary-300">
              {cardSettings.guidelineText}
            </p>
          ) : null}

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Your Question
            </span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              placeholder={cardSettings?.placeholder ?? "Type your question here..."}
              className="mt-2 w-full resize-none rounded-xl border border-ink/10 bg-dark-850 px-4 py-3 text-sm text-heading outline-none transition placeholder:text-neutral-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-400">
              {error}
            </p>
          )}

          {cardSettings?.showImageUpload !== false && (
            <div className="mt-5">
              <label className="block cursor-pointer rounded-xl border border-dashed border-ink/15 bg-ink/5 p-4 text-center transition hover:border-primary-500/60">
                <span className="block text-sm font-semibold text-neutral-300">
                  Picture Upload (optional)
                </span>
                <span className="mt-1 block text-xs text-neutral-500">
                  {pictureName || "Attach a picture"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPictureFile(file);
                    setPictureName(file?.name ?? "");
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-ink/10 disabled:bg-dark-800 disabled:text-neutral-500 disabled:shadow-none"
            >
              {busy ? "Submitting…" : (cardSettings?.submitLabel ?? "Submit Question")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-neutral-300 transition hover:border-primary-500/60 hover:text-primary-400"
            >
              {cardSettings?.cancelLabel ?? "Cancel"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
