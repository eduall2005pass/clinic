import type { SVGProps, ReactNode } from "react";

// Premium distinctive heading font — visually different from body (Inter)
// Using serif for premium feel; loaded via system serif stack to avoid extra download
// Tailwind: font-serif maps to Georgia/Cambria, distinct from sans body

type Props = {
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  children: ReactNode;
};

export default function SectionHeading({ icon: Icon, children }: Props) {
  return (
    <div className="mx-auto flex max-w-full justify-center px-2">
      <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-ink/10 bg-dark-900 px-3 py-3 shadow-lg shadow-black/10 sm:gap-3 sm:px-6 sm:py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-900/30 sm:h-10 sm:w-10 lg:h-11 lg:w-11">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </span>
        <h2 className="whitespace-normal font-serif text-[13px] font-extrabold tracking-tight text-heading sm:whitespace-nowrap sm:text-[14px] md:text-base lg:text-lg xl:text-xl 2xl:text-2xl leading-tight">
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
export function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}
