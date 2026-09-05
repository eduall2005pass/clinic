import type { ReactNode } from "react";

export type DashboardSection = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const iconClass = "h-6 w-6";
const iconProps = {
  className: iconClass,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

/** Icon names admins can pick for custom dashboard cards. */
export const DASHBOARD_ICON_OPTIONS = [
  "book",
  "exam",
  "star",
  "play",
  "clock",
  "chart",
  "users",
  "trophy",
  "target",
  "bell",
  "link",
] as const;

export type DashboardIconName = (typeof DASHBOARD_ICON_OPTIONS)[number];

/** Renders the named card icon as an inline SVG — falls back to a link icon. */
export function renderDashboardIcon(name: string): ReactNode {
  switch (name) {
    case "book":
      return (
        <svg {...iconProps}>
          <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      );
    case "exam":
      return (
        <svg {...iconProps}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );
    case "star":
      return (
        <svg {...iconProps}>
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
      );
    case "play":
      return (
        <svg {...iconProps}>
          <path d="M5 4.5 19 12 5 19.5z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case "chart":
      return (
        <svg {...iconProps}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...iconProps}>
          <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
        </svg>
      );
    case "target":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case "bell":
      return (
        <svg {...iconProps}>
          <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
      );
  }
}

export const dashboardSections: DashboardSection[] = [
  {
    title: "My Enrolled Courses",
    description: "Access your enrolled courses",
    href: "/dashboard/enrolled-courses",
    icon: (
      <svg {...iconProps}>
        <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Exam Results",
    description: "Track your exam performance",
    href: "/dashboard/exam-result",
    icon: (
      <svg {...iconProps}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Favourite",
    description: "Find your saved learning content",
    href: "/dashboard/favourites",
    icon: (
      <svg {...iconProps}>
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
  },
  {
    title: "Continue Learning",
    description: "Pick up where you left off",
    href: "/dashboard/continue-learning",
    icon: (
      <svg {...iconProps}>
        <path d="M5 4.5 19 12 5 19.5z" />
      </svg>
    ),
  },
  {
    title: "Recently Viewed",
    description: "Revisit your recent activity",
    href: "/dashboard/recently-viewed",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: "Course Progress",
    description: "Track your learning progress",
    href: "/dashboard/course-progress",
    icon: (
      <svg {...iconProps}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    ),
  },
];
export type DashboardSubItem = {
  title: string;
  description: string;
};

/** Icon registry for DB-driven dashboard cards (see src/lib/dashboard-cards.ts). */


/**
 * Final dashboard navigation hierarchy — sub-units shown inside each
 * section page. Student Profile and Exam Results intentionally have none:
 * their cards open their pages directly.
 */
export const dashboardSubUnits: Record<string, DashboardSubItem[]> = {
  "/dashboard/enrolled-courses": [
    { title: "Course", description: "Pick one of your enrolled courses" },
    { title: "Subject", description: "Subjects inside the course" },
    { title: "Paper / Segment", description: "Papers or segments of the subject" },
    { title: "Chapter", description: "Chapters in the paper" },
    { title: "Class", description: "Classes and lessons of the chapter" },
    { title: "Exam", description: "Exams attached to your learning" },
    { title: "Materials", description: "Notes and resources" },
  ],
  "/dashboard/favourites": [],
  "/dashboard/continue-learning": [
    { title: "Current Course", description: "The course you are studying now" },
    { title: "Current Subject", description: "Where you are inside the course" },
    { title: "Current Chapter", description: "The chapter in progress" },
    { title: "Last Viewed Class", description: "Resume exactly where you stopped" },
  ],
  "/dashboard/recently-viewed": [
    { title: "Recently Viewed Courses", description: "Courses you opened lately" },
    { title: "Recently Viewed Classes", description: "Classes you watched lately" },
    { title: "Recently Viewed Materials", description: "Materials you opened lately" },
  ],
  "/dashboard/course-progress": [
    { title: "Overall Progress", description: "Your total preparation at a glance" },
    { title: "Course-wise Progress", description: "Progress for every enrolled course" },
    { title: "Subject-wise Progress", description: "Progress per subject" },
    { title: "Chapter-wise Progress", description: "Progress per chapter" },
    { title: "Completed Classes", description: "Classes you have finished" },
    { title: "Remaining Classes", description: "Classes still left to complete" },
  ],
};
