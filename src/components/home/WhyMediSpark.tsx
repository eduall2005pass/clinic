import type { SVGProps } from "react";
import SectionHeader from "@/components/SectionHeader";

type Benefit = {
  title: string;
  description: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
};

function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function ExamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6M9 8h2m-6.75 12h13.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H12L9 6H5.25A1.5 1.5 0 003 7.5v13.5a1.5 1.5 0 001.5 1.5z"
      />
    </svg>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function VideoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z"
      />
    </svg>
  );
}

function MentorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
      />
    </svg>
  );
}

const benefits: Benefit[] = [
  {
    title: "Structured Courses",
    description:
      "Chapter-based lessons across HSC subjects and the medical admission syllabus.",
    Icon: BookIcon,
  },
  {
    title: "Exam-Ready Practice",
    description:
      "Model tests and chapter-wise exams to build real exam confidence.",
    Icon: ExamIcon,
  },
  {
    title: "Expert Q&A",
    description:
      "Ask questions and get clear answers from mentors and fellow students.",
    Icon: ChatIcon,
  },
  {
    title: "Track Your Progress",
    description:
      "Monitor your preparation and stay on top of your study goals.",
    Icon: ChartIcon,
  },
  {
    title: "Recorded Video Classes",
    description:
      "Watch classes anytime and revise every topic at your own pace.",
    Icon: VideoIcon,
  },
  {
    title: "Mentor Support",
    description:
      "Guidance from experienced mentors at every step of your journey.",
    Icon: MentorIcon,
  },
];

export default  function WhyMediSpark({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  return (
    <section className="relative overflow-hidden border-t border-ink/5 bg-dark-900">
      <div className="pointer-events-none absolute inset-0 bg-grid-lines" />
      <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeader
          label="Why MediSpark"
          title={title ?? "Learn smarter with MediSpark"}
          description={description ?? "One platform for your HSC academics and medical admission journey."}
        />

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group flex flex-col items-center rounded-2xl border border-ink/10 bg-dark-950/60 p-4 text-center shadow-lg shadow-black/20 transition duration-300 hover:border-primary-600/60 hover:shadow-primary-900/30 sm:p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600/15 text-primary-400 transition group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-primary-900/50 sm:h-12 sm:w-12">
                <benefit.Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="mt-3 min-w-0">
                <h3 className="text-sm font-bold leading-snug text-heading sm:text-base">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-xs leading-snug text-neutral-400 sm:text-sm">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}