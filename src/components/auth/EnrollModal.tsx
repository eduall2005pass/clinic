"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCourseAccess } from "@/lib/course-access";
import { enrollInCourse, getCourseKind } from "@/lib/enrollments";
import { formatFee, getPayableFee } from "@/lib/courses";
import type { Course } from "@/lib/courses";

const primaryButtonClass =
  "w-full rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "w-full rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10";

function LockIcon() {
  return (
    <svg
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function StatusIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/15 text-primary-500">
      {children}
    </span>
  );
}

export default function EnrollModal({
  course,
  open,
  onClose,
}: {
  course: Course;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    user,
    profile,
    authLoading,
    profileLoading,
    configured,
    refreshEnrollments,
  } = useAuth();
  const { isActive, isPending, isCancelled, isCompleted } = useCourseAccess(course);
  const isPaid = getCourseKind(course) === "paid";
  const payableFee = getPayableFee(course);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; finalFee: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  // Step 4 — paid-course payment proof.
  const [transactionId, setTransactionId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [senderMobile, setSenderMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Live payment card from MySQL (Admin Payment Card manager) — shows
  // students exactly where to send the money.
  const [paymentCard, setPaymentCard] = useState<{
    bkashNumber: string | null;
    nagadNumber: string | null;
    instructions: string | null;
  } | null>(null);

  useEffect(() => {
    if (!open || !isPaid) return;
    let cancelled = false;
    fetch("/api/enrollment-payment-card", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPaymentCard(data as {
          bkashNumber: string | null;
          nagadNumber: string | null;
          instructions: string | null;
        });
      })
      .catch(() => {
        // Payment card is informational — silently skip on failure.
      });
    return () => {
      cancelled = true;
    };
  }, [open, isPaid]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const loading = authLoading || profileLoading;
  const enrollHref = `/courses/${course.slug}?enroll=1`;
  const registerHref = `/register?next=${encodeURIComponent(enrollHref)}`;

  const handleEnroll = async () => {
    if (submitting || !user || !profile) return;

    // Paid courses must submit complete, valid payment proof (Step 4).
    let payment: { transactionId: string; paidAmount: number; senderMobile: string } | undefined;
    if (isPaid) {
      const errors: Record<string, string> = {};
      const txn = transactionId.trim();
      const amount = Number(paidAmount.trim());
      const mobile = senderMobile.trim();
      if (txn.length < 4 || txn.length > 64) {
        errors.transactionId = "Transaction ID is required (4–64 characters).";
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.paidAmount = "Enter a valid paid amount greater than 0.";
      }
      if (!/^01[3-9]\d{8}$/.test(mobile)) {
        errors.senderMobile = "Enter a valid mobile number (e.g. 01XXXXXXXXX).";
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      payment = { transactionId: txn, paidAmount: amount, senderMobile: mobile };
    } else {
      setFieldErrors({});
    }

    setSubmitting(true);
    setError(null);
    try {
      await enrollInCourse(course, user, appliedCoupon?.code ?? null, payment);
      await refreshEnrollments();
      setCompleted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete enrollment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    setCouponError(null);
    if (!code) {
      setAppliedCoupon(null);
      return;
    }
    setCheckingCoupon(true);
    try {
      const response = await fetch(
        `/api/coupons/validate?code=${encodeURIComponent(code)}&fee=${payableFee}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as {
        valid?: boolean;
        code?: string;
        finalFee?: number;
        error?: string;
      } | null;
      if (!response.ok || !data?.valid) {
        setAppliedCoupon(null);
        setCouponError(data?.error ?? "Invalid coupon code.");
        return;
      }
      setAppliedCoupon({ code: data.code ?? code.toUpperCase(), finalFee: data.finalFee ?? payableFee });
    } catch {
      setAppliedCoupon(null);
      setCouponError("Could not verify the coupon. Try again.");
    } finally {
      setCheckingCoupon(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Checking your enrollment...</p>
        </div>
      );
    }

    if (!configured) {
      return (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-yellow-400">
            Firebase is not configured yet
          </p>
          <p className="mt-1 text-xs text-yellow-200/70">
            Enrollment will be available once the Firebase environment variables
            are set.
          </p>
        </div>
      );
    }

    if (!user || !profile) {
      return (
        <div className="mt-6 text-center">
          <StatusIcon>
            <LockIcon />
          </StatusIcon>
          <h3 className="mt-5 text-lg font-bold text-heading">
            Registration First
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Please complete your registration first to enroll in this course.
          </p>
          <button
            type="button"
            onClick={() => router.push(registerHref)}
            className={`${primaryButtonClass} mt-6`}
          >
            Register Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-3`}
          >
            Back
          </button>
        </div>
      );
    }

    if (completed && !isPaid) {
      return (
        <div className="mt-6 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-5 text-lg font-bold text-heading">
            Enrollment successful!
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            You are now enrolled in {course.name}. You can start learning right
            away.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/enrolled-courses");
            }}
            className={`${primaryButtonClass} mt-6`}
          >
            Go to Course
          </button>
        </div>
      );
    }

    if (isActive) {
      return (
        <div className="mt-6 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-5 text-lg font-bold text-heading">
            You&apos;re already enrolled in this course.
          </h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/enrolled-courses");
            }}
            className={`${primaryButtonClass} mt-6`}
          >
            Go to Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-3`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isPending || completed) {
      return (
        <div className="mt-6 text-center">
          <StatusIcon>
            <ClockIcon />
          </StatusIcon>
          <h3 className="mt-5 text-lg font-bold text-heading">
            Application submitted — Pending Validation
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Your enrollment application has been received. An admin will verify
            your payment and activate the course. You will get full access at
            that point.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard");
            }}
            className={`${primaryButtonClass} mt-6`}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-3`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="mt-6 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-5 text-lg font-bold text-heading">
            You&apos;ve completed this course.
          </h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/enrolled-courses");
            }}
            className={`${primaryButtonClass} mt-6`}
          >
            Go to Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-3`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isPaid) {
      return (
        <div className="mt-6">
          {isCancelled && (
            <p className="mb-4 rounded-xl border border-ink/10 bg-ink/5 p-3 text-center text-xs text-neutral-400">
              Your previous enrollment was cancelled. You can request a new one.
            </p>
          )}
          <div className="rounded-xl border border-ink/10 bg-dark-950 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Course Fee
              </p>
              <div className="text-right">
                {appliedCoupon && appliedCoupon.finalFee < payableFee ? (
                  <>
                    <p className="text-sm text-neutral-500 line-through">
                      {formatFee(payableFee)}
                    </p>
                    <p className="text-xl font-extrabold text-primary-500">
                      {formatFee(appliedCoupon.finalFee)}
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-extrabold text-primary-500">
                    {formatFee(payableFee)}
                  </p>
                )}
              </div>
            </div>

            {/* Coupon code */}
            <div className="mt-4">
              <label
                htmlFor="enroll-coupon"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Have a coupon?
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="enroll-coupon"
                  type="text"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  placeholder="COUPON CODE"
                  disabled={Boolean(appliedCoupon)}
                  className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-dark-900 px-3.5 py-2.5 text-sm uppercase tracking-wide text-heading placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 disabled:opacity-60"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput("");
                      setCouponError(null);
                    }}
                    className="shrink-0 rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-xs font-bold text-heading transition hover:border-primary-500/60"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleApplyCoupon()}
                    disabled={checkingCoupon || !couponInput.trim()}
                    className="shrink-0 rounded-xl border border-primary-500/40 bg-primary-600/10 px-4 py-2.5 text-xs font-bold text-primary-300 transition hover:bg-primary-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingCoupon ? "Checking…" : "Apply"}
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">
                  Coupon {appliedCoupon.code} applied — you pay{" "}
                  {formatFee(appliedCoupon.finalFee)}.
                </p>
              )}
              {couponError && (
                <p className="mt-2 text-xs font-semibold text-red-400">{couponError}</p>
              )}
            </div>

            {/* Payment card — live from MySQL (Admin → Enrollment Control →
                Payment Card). Students pay to THESE numbers. */}
            {paymentCard && (paymentCard.bkashNumber || paymentCard.nagadNumber) && (
              <div className="mt-5 rounded-xl border border-primary-500/30 bg-primary-600/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Send payment to
                </p>
                <div className="mt-3 space-y-2">
                  {paymentCard.bkashNumber && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2">
                      <span className="text-xs font-extrabold text-pink-300">bKash</span>
                      <span className="truncate font-mono text-sm font-semibold text-heading">
                        {paymentCard.bkashNumber}
                      </span>
                    </div>
                  )}
                  {paymentCard.nagadNumber && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                      <span className="text-xs font-extrabold text-orange-300">Nagad</span>
                      <span className="truncate font-mono text-sm font-semibold text-heading">
                        {paymentCard.nagadNumber}
                      </span>
                    </div>
                  )}
                </div>
                {paymentCard.instructions && (
                  <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-neutral-300">
                    {paymentCard.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Payment proof (Step 4) */}
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Payment Information
              </p>
              <div>
                <label
                  htmlFor="enroll-txn"
                  className="text-xs font-semibold text-neutral-400"
                >
                  Transaction ID
                </label>
                <input
                  id="enroll-txn"
                  type="text"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="e.g. 8N7DQK2XLM"
                  autoComplete="off"
                  className={`mt-1 w-full rounded-xl border bg-dark-900 px-3.5 py-2.5 text-sm uppercase tracking-wide text-heading placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 ${
                    fieldErrors.transactionId ? "border-red-500/60" : "border-ink/15"
                  }`}
                />
                {fieldErrors.transactionId && (
                  <p className="mt-1 text-xs font-semibold text-red-400">
                    {fieldErrors.transactionId}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="enroll-amount"
                  className="text-xs font-semibold text-neutral-400"
                >
                  Paid Amount (BDT)
                </label>
                <input
                  id="enroll-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  placeholder={
                    appliedCoupon ? String(appliedCoupon.finalFee) : String(payableFee)
                  }
                  className={`mt-1 w-full rounded-xl border bg-dark-900 px-3.5 py-2.5 text-sm text-heading placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 ${
                    fieldErrors.paidAmount ? "border-red-500/60" : "border-ink/15"
                  }`}
                />
                {fieldErrors.paidAmount && (
                  <p className="mt-1 text-xs font-semibold text-red-400">
                    {fieldErrors.paidAmount}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="enroll-mobile"
                  className="text-xs font-semibold text-neutral-400"
                >
                  Sender Mobile Number
                </label>
                <input
                  id="enroll-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={senderMobile}
                  onChange={(event) => setSenderMobile(event.target.value)}
                  placeholder="01XXXXXXXXX"
                  maxLength={11}
                  className={`mt-1 w-full rounded-xl border bg-dark-900 px-3.5 py-2.5 text-sm text-heading placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 ${
                    fieldErrors.senderMobile ? "border-red-500/60" : "border-ink/15"
                  }`}
                />
                {fieldErrors.senderMobile && (
                  <p className="mt-1 text-xs font-semibold text-red-400">
                    {fieldErrors.senderMobile}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              This is a paid course. Submit your payment details above — your
              enrollment will remain{" "}
              <span className="font-semibold text-yellow-400">
                Pending Validation
              </span>{" "}
              until an admin verifies the payment. The course will not be
              unlocked before that.
            </p>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleEnroll}
            disabled={submitting}
            className={`${primaryButtonClass} mt-5`}
          >
            {submitting ? "Submitting Application..." : "Submit Enrollment Application"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-3`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="mt-6">
        {isCancelled && (
          <p className="mb-4 rounded-xl border border-ink/10 bg-ink/5 p-3 text-center text-xs text-neutral-400">
            Your previous enrollment was cancelled. You can enroll again.
          </p>
        )}
        <div className="rounded-xl border border-ink/10 bg-dark-950 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Course Fee
            </p>
            <p className="text-xl font-extrabold text-primary-500">Free</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            This course is free. Confirming enrollment gives you immediate
            access to all course content.
          </p>
        </div>
        {error && (
          <p className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleEnroll}
          disabled={submitting}
          className={`${primaryButtonClass} mt-5`}
        >
          {submitting ? "Enrolling..." : "Confirm Enrollment"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${secondaryButtonClass} mt-3`}
        >
          Cancel
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Enroll in ${course.name}`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-fade-in rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-2xl shadow-black/50">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-500 transition hover:bg-ink/10 hover:text-heading"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="pr-6">
          <span className="inline-block rounded-md border border-primary-500/40 bg-dark-950/80 px-2.5 py-1 text-xs font-bold text-primary-400">
            {isPaid ? "Paid Course" : "Free Course"}
          </span>
          <h2 className="mt-3 text-xl font-extrabold text-heading">{course.name}</h2>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}