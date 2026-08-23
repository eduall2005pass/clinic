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

export const dashboardSections: DashboardSection[] = [
  {
    title: "Student Profile",
    description: "Manage your personal information",
    href: "/dashboard/profile",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
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
  "/dashboard/favourites": [
    { title: "Favourite Courses", description: "Courses you saved" },
    { title: "Favourite Classes", description: "Classes you saved" },
    { title: "Favourite Materials", description: "Materials you saved" },
  ],
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
