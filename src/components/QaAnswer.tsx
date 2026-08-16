import Image from "next/image";
import type { TeacherAnswer } from "@/lib/qa";

export default function QaAnswer({ answer }: { answer: TeacherAnswer }) {
  return (
    <div className="mt-4 rounded-xl border border-primary-600/30 bg-primary-600/10 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-dark-800">
          <Image
            src="/avatars/teacher.svg"
            alt={answer.teacherName}
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {answer.teacherName}
          </p>
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Teacher Answer
          </span>
        </div>
        <span className="ml-auto text-xs font-medium text-neutral-500">
          {answer.answeredAt}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-300">
        {answer.content}
      </p>
    </div>
  );
}