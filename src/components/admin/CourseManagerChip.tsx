import Link from "next/link";

/**
 * Small floating management chip used on the Admin Panel's mirrored
 * Courses page — styled to sit inside the website-identical layout without
 * breaking it.
 */
export default function CourseManagerChip({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary-500/50 bg-dark-950/85 px-3 py-1.5 text-xs font-bold text-primary-400 shadow-md shadow-black/20 backdrop-blur transition hover:border-primary-400 hover:text-primary-300"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-3 w-3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.86 4.49a2.1 2.1 0 013 2.97L8.42 18.9l-3.9 1 1-3.9L16.87 4.5z"
        />
      </svg>
      {label}
    </Link>
  );
}
