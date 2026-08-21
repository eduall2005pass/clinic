"use client";

import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import { getPublishedFaqs } from "@/lib/faq";
import type { Faq } from "@/lib/faq";

export default  function FaqSection({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  const [faqs] = useState<Faq[]>(getPublishedFaqs);
  const [openId, setOpenId] = useState<string | null>(
    faqs.length > 0 ? faqs[0].id : null
  );

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
                    <p className="px-5 pb-5 text-sm leading-relaxed text-neutral-400">
                      {faq.answer}
                    </p>
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