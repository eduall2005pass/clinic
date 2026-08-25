import { HubHeader } from "@/components/admin/hub-ui";
import { qaSubjects, qaQuestions } from "@/lib/qa";

/**
 * Admin → Q&A. Follows the Main Website Q&A flow. The current Q&A content
 * source is the shared qa library (the same content the website renders);
 * student questions and teacher answers are listed here for review.
 */
export default function AdminQaHub() {
  const answered = qaQuestions.filter((question) => question.status === "answered");
  const unanswered = qaQuestions.filter(
    (question) => question.status === "unanswered",
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Q&A"
        title="Q&A Management"
        description="Student questions and teacher answers shown on the Main Website Q&A section. Q&A access itself is limited to Paid Course students."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary-600/30 bg-primary-600/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-heading">{qaQuestions.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Answered</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">{answered.length}</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Unanswered</p>
          <p className="mt-1 text-2xl font-extrabold text-yellow-300">{unanswered.length}</p>
        </div>
      </div>

      {qaSubjects.map((subject) => {
        const subjectQuestions = qaQuestions.filter(
          (question) => question.subjectId === subject.id,
        );
        if (subjectQuestions.length === 0) return null;
        return (
          <div key={subject.id} className="mt-8">
            <h2 className="text-base font-extrabold text-heading">{subject.name}</h2>
            <ul className="mt-3 space-y-2.5">
              {subjectQuestions.map((question) => (
                <li
                  key={question.id}
                  className="rounded-xl border border-ink/10 bg-dark-900 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                      {question.text}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        question.status === "answered"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {question.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {question.studentName} · {question.createdAt}
                  </p>
                  {question.answer && (
                    <p className="mt-2 rounded-lg bg-ink/5 px-3 py-2 text-xs leading-relaxed text-neutral-300">
                      <span className="font-bold text-primary-400">
                        {question.answer.teacherName}:
                      </span>{" "}
                      {question.answer.content}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
