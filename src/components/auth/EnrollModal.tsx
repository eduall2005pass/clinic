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
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  // Final system-derived payable amount (built-in discount already inside
  // payableFee, plus any valid coupon on top). The student can never edit it.
  const finalAmount = appliedCoupon?.finalFee ?? payableFee;
  const [senderMobile, setSenderMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Live payment card from MySQL (Admin Payment Card manager) — shows
  // students exactly where to send the money. All labels, placeholders and
  // toggles are admin-controlled via the Payment Card editor.
  const [paymentCard, setPaymentCard] = useState<{
    bkashNumber: string | null;
    nagadNumber: string | null;
    couponEnabled: boolean;
    instructions: string | null;
    feeEnabled: boolean;
    feeLabel: string;
    discountLabel: string;
    couponPlaceholder: string;
    applyLabel: string;
    payableEnabled: boolean;
    payableLabel: string;
    methodsLabel: string;
    bkashLabel: string;
    nagadLabel: string;
    instructionsEnabled: boolean;
    txEnabled: boolean;
    txLabel: string;
    txPlaceholder: string;
    senderEnabled: boolean;
    senderLabel: string;
    senderPlaceholder: string;
    pendingNoteEnabled: boolean;
    pendingNote: string;
    cancelEnabled: boolean;
    cancelLabel: string;
    submitEnabled: boolean;
    submitLabel: string;
    submittingLabel: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !isPaid) return;
    let cancelled = false;
    fetch("/api/enrollment-payment-card", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPaymentCard(data as typeof paymentCard);
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
    let payment: { transactionId: string; senderMobile: string; paymentMethod: "bkash" | "nagad" } | undefined;
    if (isPaid) {
      const errors: Record<string, string> = {};
      const txn = transactionId.trim();
      const mobile = senderMobile.trim();
      if (txn.length < 4 || txn.length > 64) {
        errors.transactionId = "Transaction ID is required (4–64 characters).";
      }
      if (!/^01[3-9]\d{8}$/.test(mobile)) {
        errors.senderMobile = "Enter a valid mobile number (e.g. 01XXXXXXXXX).";
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      payment = { transactionId: txn, senderMobile: mobile, paymentMethod };
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
        <div className="mt-4 text-center">
          <StatusIcon>
            <LockIcon />
          </StatusIcon>
          <h3 className="mt-4 text-lg font-bold text-heading">
            Registration First
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            Please complete your registration first to enroll in this course.
          </p>
          <button
            type="button"
            onClick={() => router.push(registerHref)}
            className={`${primaryButtonClass} mt-4`}
          >
            Register Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-2`}
          >
            Back
          </button>
        </div>
      );
    }

    if (completed && !isPaid) {
      return (
        <div className="mt-4 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-4 text-lg font-bold text-heading">
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
            className={`${primaryButtonClass} mt-4`}
          >
            Go to Course
          </button>
        </div>
      );
    }

    if (isActive) {
      return (
        <div className="mt-4 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-4 text-lg font-bold text-heading">
            You&apos;re already enrolled in this course.
          </h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/enrolled-courses");
            }}
            className={`${primaryButtonClass} mt-4`}
          >
            Go to Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-2`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isPending || completed) {
      return (
        <div className="mt-4 text-center">
          <StatusIcon>
            <ClockIcon />
          </StatusIcon>
          <h3 className="mt-4 text-lg font-bold text-heading">
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
            className={`${primaryButtonClass} mt-4`}
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-2`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="mt-4 text-center">
          <StatusIcon>
            <CheckIcon />
          </StatusIcon>
          <h3 className="mt-4 text-lg font-bold text-heading">
            You&apos;ve completed this course.
          </h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/enrolled-courses");
            }}
            className={`${primaryButtonClass} mt-4`}
          >
            Go to Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} mt-2`}
          >
            Close
          </button>
        </div>
      );
    }

    if (isPaid) {
      // Coupon visibility is admin-controlled (Enrollment Control → Payment
      // Card → Coupon Availability). Defaults to visible while loading.
      const couponVisible = paymentCard ? paymentCard.couponEnabled : true;
      return (
        <div className="mt-4">
          {isCancelled && (
            <p className="mb-3 rounded-xl border border-ink/10 bg-ink/5 p-2 text-center text-xs text-neutral-400">
              Your previous enrollment was cancelled. You can request a new one.
            </p>
          )}
          <div className="rounded-xl border border-ink/10 bg-dark-950 p-4">
            {/* Fee + Coupon — compact responsive layout */}
            {paymentCard?.feeEnabled !== false && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              {/* Fixed fee breakdown — Course Fee → Discount → Payable.
                  Fully system-derived; the student can never edit the amount. */}
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {paymentCard?.feeLabel || "Course Fee"}
                  </p>
                  <p className="text-sm font-semibold text-neutral-300">
                    {formatFee(course.fee)}
                  </p>
                </div>
                {(appliedCoupon &&
                  appliedCoupon.finalFee < payableFee) ||
                (payableFee < course.fee) ? (
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {paymentCard?.discountLabel || "Discount"}
                    </p>
                    <p className="text-sm font-semibold text-emerald-400">
                      − {formatFee(finalAmount < course.fee ? course.fee - finalAmount : course.fee - payableFee)}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Coupon code — hidden when admin sets availability OFF */}
              {couponVisible && (
                <div className="w-full sm:max-w-[160px] lg:max-w-xs">
                  <div className="flex gap-2">
                    <input
                      id="enroll-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder={paymentCard?.couponPlaceholder || "COUPON CODE"}
                      disabled={Boolean(appliedCoupon)}
                      className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-dark-900 px-3 py-2 text-sm uppercase tracking-wide text-heading placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 disabled:opacity-60"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput("");
                          setCouponError(null);
                        }}
                        className="shrink-0 rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-xs font-bold text-heading transition hover:border-primary-500/60"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleApplyCoupon()}
                        disabled={checkingCoupon || !couponInput.trim()}
                        className="shrink-0 rounded-xl border border-primary-500/40 bg-primary-600/10 px-3 py-2 text-xs font-bold text-primary-300 transition hover:bg-primary-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checkingCoupon ? "Checking…" : (paymentCard?.applyLabel || "Apply")}
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="mt-1 text-xs font-semibold text-emerald-400">
                      Coupon {appliedCoupon.code} applied — you pay{" "}
                      {formatFee(appliedCoupon.finalFee)}.
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-1 text-xs font-semibold text-red-400">{couponError}</p>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Fixed Payable Amount — compact horizontal box */}
            {paymentCard?.payableEnabled !== false && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary-500/30 bg-primary-600/10 px-4 py-3">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-neutral-400">
                {paymentCard?.payableLabel || "Payable Amount"}
              </p>
              <div className="flex min-w-0 items-center justify-end gap-3">
                {appliedCoupon && appliedCoupon.finalFee < payableFee && (
                  <>
                    <span className="shrink-0 text-xs text-neutral-500 line-through">
                      {formatFee(payableFee)}
                    </span>
                    <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                      Coupon {appliedCoupon.code}
                    </span>
                  </>
                )}
                <p className="shrink-0 text-lg font-extrabold text-primary-400 sm:text-xl">
                  {formatFee(finalAmount)}
                </p>
              </div>
            </div>
            )}

            {/* Payment card — live from MySQL (Admin → Enrollment Control →
                Payment Card). Students pay to THESE numbers. Methods sit
                vertically as separate rows. */}
            {paymentCard && (paymentCard.bkashNumber || paymentCard.nagadNumber) && (
              <div className="mt-3 rounded-xl border border-primary-500/20 bg-primary-600/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                  {paymentCard?.methodsLabel || "Payment Methods"}
                </p>
                <div className="mt-2 space-y-2">
                  {paymentCard.bkashNumber && (
                    <div className="flex items-center gap-2 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-1.5">
                      <span className="text-xs font-extrabold text-pink-300">{paymentCard?.bkashLabel || "bKash"}</span>
                      <span className="font-mono text-sm font-semibold text-heading truncate">
                        {paymentCard.bkashNumber}
                      </span>
                    </div>
                  )}
                  {paymentCard.nagadNumber && (
                    <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5">
                      <span className="text-xs font-extrabold text-orange-300">{paymentCard?.nagadLabel || "Nagad"}</span>
                      <span className="font-mono text-sm font-semibold text-heading truncate">
                        {paymentCard.nagadNumber}
                      </span>
                    </div>
                  )}
                </div>
                {paymentCard.instructionsEnabled !== false && paymentCard.instructions && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-300">
                    {paymentCard.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Payment Method Selection — bKash / Nagad */}
            {paymentCard && (paymentCard.bkashNumber || paymentCard.nagadNumber) && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-2">
                  Select Payment Method
                </p>
                <div className="grid gap-2">
                  {paymentCard.bkashNumber && (
                    <label
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        paymentMethod === "bkash"
                          ? "border-pink-500/60 bg-pink-500/10"
                          : "border-ink/15 bg-dark-900 hover:border-pink-500/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bkash"
                        checked={paymentMethod === "bkash"}
                        onChange={() => setPaymentMethod("bkash")}
                        className="h-4 w-4 accent-pink-500"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-pink-300">{paymentCard?.bkashLabel || "bKash"}</span>
                        <span className="font-mono text-sm font-semibold text-heading bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-1">
                          {paymentCard.bkashNumber}
                        </span>
                      </div>
                    </label>
                  )}
                  {paymentCard.nagadNumber && (
                    <label
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        paymentMethod === "nagad"
                          ? "border-orange-500/60 bg-orange-500/10"
                          : "border-ink/15 bg-dark-900 hover:border-orange-500/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="nagad"
                        checked={paymentMethod === "nagad"}
                        onChange={() => setPaymentMethod("nagad")}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-orange-300">{paymentCard?.nagadLabel || "Nagad"}</span>
                        <span className="font-mono text-sm font-semibold text-heading bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1">
                          {paymentCard.nagadNumber}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Payment proof — always horizontal, even on mobile */}
            <div className="mt-3 flex gap-2">
                {paymentCard?.txEnabled !== false && (
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="enroll-txn"
                    className="text-[11px] font-semibold text-neutral-400 sm:text-xs"
                  >
                    {paymentCard?.txLabel || "Transaction ID"}
                  </label>
                  <input
                    id="enroll-txn"
                    type="text"
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    placeholder={paymentCard?.txPlaceholder || "e.g. 8N7DQK2XLM"}
                    autoComplete="off"
                    className={`mt-1 w-full truncate rounded-xl border bg-dark-900 px-2 py-2 text-xs uppercase tracking-wide text-heading placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 sm:px-3 sm:py-2.5 sm:text-sm ${
                      fieldErrors.transactionId ? "border-red-500/60" : "border-ink/15"
                    }`}
                  />
                  {fieldErrors.transactionId && (
                    <p className="mt-1 text-[10px] font-semibold text-red-400 sm:text-xs">
                      {fieldErrors.transactionId}
                    </p>
                  )}
                </div>
                )}
                {paymentCard?.senderEnabled !== false && (
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="enroll-mobile"
                    className="text-[11px] font-semibold text-neutral-400 sm:text-xs"
                  >
                    {paymentCard?.senderLabel || "Payment Number"}
                  </label>
                  <input
                    id="enroll-mobile"
                    type="tel"
                    inputMode="numeric"
                    value={senderMobile}
                    onChange={(event) => setSenderMobile(event.target.value)}
                    placeholder={paymentCard?.senderPlaceholder || "01XXXXXXXXX"}
                    maxLength={11}
                    className={`mt-1 w-full truncate rounded-xl border bg-dark-900 px-2 py-2 text-xs text-heading placeholder:text-neutral-600 outline-none transition focus:border-primary-500/70 sm:px-3 sm:py-2.5 sm:text-sm ${
                      fieldErrors.senderMobile ? "border-red-500/60" : "border-ink/15"
                    }`}
                  />
                  {fieldErrors.senderMobile && (
                    <p className="mt-1 text-xs font-semibold text-red-400">
                      {fieldErrors.senderMobile}
                    </p>
                  )}
                </div>
                )}
            </div>

            {paymentCard?.pendingNoteEnabled !== false && paymentCard?.pendingNote && (
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              {paymentCard.pendingNote}
            </p>
            )}
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            {paymentCard?.cancelEnabled !== false && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-xs font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10 sm:px-6 sm:py-3 sm:text-sm"
            >
              {paymentCard?.cancelLabel || "Cancel"}
            </button>
            )}
            {paymentCard?.submitEnabled !== false && (
            <button
              type="button"
              onClick={handleEnroll}
              disabled={submitting}
              className="min-w-0 flex-1 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:py-3 sm:text-sm"
            >
              {submitting ? (paymentCard?.submittingLabel || "Submitting Payment...") : (paymentCard?.submitLabel || "Submit Payment")}
            </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4">
        {isCancelled && (
          <p className="mb-3 rounded-xl border border-ink/10 bg-ink/5 p-2 text-center text-xs text-neutral-400">
            Your previous enrollment was cancelled. You can enroll again.
          </p>
        )}
        <div className="rounded-xl border border-ink/10 bg-dark-950 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Course Fee
            </p>
            <p className="text-xl font-extrabold text-primary-500">Free</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            This course is free. Confirming enrollment gives you immediate
            access to all course content.
          </p>
        </div>
        {error && (
          <p className="mt-3 rounded-xl border border-primary-500/30 bg-primary-500/10 p-2 text-center text-sm text-primary-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleEnroll}
          disabled={submitting}
          className={`${primaryButtonClass} mt-4`}
        >
          {submitting ? "Enrolling..." : "Confirm Enrollment"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${secondaryButtonClass} mt-2`}
        >
          Cancel
        </button>
      </div>
    );
  };

return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Enroll in ${course.name}`}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className={`relative w-full max-h-[90vh] overflow-y-auto animate-fade-in rounded-2xl border border-ink/10 bg-dark-900 shadow-2xl shadow-black/50 ${
              isPaid
                ? "max-w-lg p-4 sm:max-w-xl sm:p-5"
                : "max-w-md p-6"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-500 transition hover:bg-ink/10 hover:text-heading"
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
              <h2 className="mt-2 text-lg sm:text-xl font-extrabold text-heading">{course.name}</h2>
            </div>

            {renderContent()}
          </div>
        </div>
      );
}