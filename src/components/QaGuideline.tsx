import { qaGuideline } from "@/lib/qa";

export default function QaGuideline() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">
          Q&A Guideline
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-heading sm:text-3xl">
          How the Q&A section works
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Everything you need to know about asking questions and getting
          answers from our teachers.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {qaGuideline.map((section, index) => (
          <div
            key={section.title}
            className="rounded-2xl border border-ink/10 bg-dark-900 p-6 shadow-lg shadow-black/20 transition hover:border-primary-600/50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-white shadow-md shadow-primary-900/20">
                {index + 1}
              </span>
              <h3 className="font-bold text-heading">{section.title}</h3>
            </div>
            <ul className="mt-4 space-y-2.5">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm leading-relaxed text-neutral-300"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
