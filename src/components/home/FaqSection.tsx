"use client";

import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import { FaqVideoPlayer } from "@/components/admin/FaqManager";
import { sanitizeFaqHtml } from "@/lib/faq-sanitize";
import { faqs as defaultFaqs } from "@/lib/faq";
import type { Faq } from "@/lib/faq";

/**
 * Website FAQ accordion — 100% data-driven. Every question, answer, video,
 * order and status comes from the MySQL `faqs` table via the server page
 * (Admin Panel → Content → FAQ). No hard-coded FAQ content here.
 */
export default function FaqSection({
  title,
  description,
  faqs: faqsProp,
}: {
  title?: string;
  description?: string;
  faqs?: Faq[];
}) {
  const [faqs] = useState<Faq[]>(
    () =>
      faqsProp ??
      defaultFaqs
        .filter((faq) => faq.status === "published" && faq.isActive)
        .sort((a, b) => a.order - b.order)
  );
  const [openId, setOpenId] = useState<string | null>(
    faqs.length > 0 ? faqs[0].id : null
  );

  // Nothing published + enabled in the Admin Panel → no section at all.
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-24 border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="FAQ"
          title={title ?? "Frequently asked questions"}
          description={description ?? "Quick answers to the most common questions about MediSpark."}
        />

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
          {faqs.map((faq) => {
            const open = openId === faq.id;

            return (
              <div
                key={faq.id}
                className={`rounded-2xl border bg-dark-900 shadow-lg shadow-black/20 transition ${
                  open
                    ? "border-primary-600/50 shadow-primary-900/20"
                    : "border-ink/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-heading">
                    {faq.question}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-5 w-5 shrink-0 text-primary-500 transition-transform duration-300 ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5">
                      {/* Text answer — sanitised rich text (text / text+video). */}
                      {faq.answerType !== "video" && faq.answer && (
                        <div
                          className="text-sm leading-relaxed text-neutral-300 [&_a]:text-primary-400 [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeFaqHtml(faq.answer),
                          }}
                        />
                      )}
                      {/* Video answer — responsive 16:9 player (video / text+video). */}
                      {faq.answerType !== "text" && open && faq.videoUrl ? (
                        <FaqVideoPlayer url={faq.videoUrl} />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
