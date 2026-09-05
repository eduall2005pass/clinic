import type { SVGProps, ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";

// Premium distinctive heading font — visually different from body (Inter = sans)
// Space Grotesk is geometric, modern, premium — clearly distinct yet elegant
const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

type Props = {
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  children: ReactNode;
};

export default function SectionHeading({ icon: Icon, children }: Props) {
  return (
    <div className="mx-auto flex max-w-full justify-center px-2">
      <div className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 px-3 py-3 shadow-lg shadow-black/10 sm:gap-3 sm:px-6 sm:py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-900/30 sm:h-10 sm:w-10 lg:h-11 lg:w-11">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </span>
        <h2
          className={`${headingFont.className} whitespace-nowrap text-[11px] font-bold tracking-tight text-heading min-[360px]:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-[22px] leading-none`}
        >
          {children}
        </h2>
      </div>
    </div>
  );
}

// Minimal icons for each section — consistent stroke, red square is parent
export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM5 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    </svg>
  );
}
export function MentorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.5a3 3 0 00-6 0m6 0a3 3 0 01-6 0M12 14a4 4 0 100-8 4 4 0 000 8zM6 19.5A6 6 0 0112 15a6 6 0 016 4.5" />
    </svg>
  );
}
export function ReviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7a.5.5 0 01.5.5v1a.5.5 0 01-.5.5.5.5 0 01-.5-.5v-1A.5.5 0 0112 7z" />
    </svg>
  );
}
export function FaqIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.5 2.5 0 015 0c0 1.1-.7 1.7-1.5 2.2-.5.3-.7.6-.7 1.1" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function JoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a3 3 0 100-6 3 3 0 000 6zM6 9a3 3 0 100-6 3 3 0 000 6zM12 14a3 3 0 100-6 3 3 0 000 6zM4.5 19.5a4.5 4.5 0 019 0M15 19.5a4.5 4.5 0 019 0" />
    </svg>
  );
}
