"use client";

import { useState } from "react";
import Image from "next/image";
import SectionHeader from "@/components/SectionHeader";
import { getPublishedReviews } from "@/lib/reviews";
import type { StudentReview } from "@/lib/reviews";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Rated ${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 ${
            index < rating ? "text-primary-500" : "text-ink/15"
          }`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.921-.755 1.688-1.538 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.197-1.538-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.319 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.03-3.958z" />
        </svg>
      ))}
    </div>
  );
}

export default  function StudentReviews({
  title,
  description,
  reviews: providedReviews,
}: {
  title?: string;
  description?: string;
  reviews?: StudentReview[];
} = {}) {
  const [reviews] = useState<StudentReview[]>(() => providedReviews ?? getPublishedReviews());

  return (
    <section id="reviews" className="scroll-mt-24 border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Student Reviews"
          title={title ?? "What students say"}
          description={description ?? "Real reviews from MediSpark students, verified and published after approval."}
        />

        {reviews.length > 0 ? (
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex h-full flex-col rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary-600/50 hover:shadow-primary-900/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-dark-800">
                    <Image
                      src={review.studentAvatar}
                      alt={review.studentName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-heading">
                      {review.studentName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {review.courseName}
                      {review.batchLabel ? ` · ${review.batchLabel}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <RatingStars rating={review.rating} />
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-300">
                  {review.text}
                </p>

                <p className="mt-4 text-xs text-neutral-500">
                  {review.createdAt}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-dashed border-ink/15 bg-dark-900/60 p-10 text-center">
            <p className="font-semibold text-heading">Reviews are on the way</p>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              Real student reviews will appear here as soon as they are
              submitted and published.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}