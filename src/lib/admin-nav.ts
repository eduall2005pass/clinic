import type { ComponentType, SVGProps } from "react";
import {
  ActivityLogIcon,
  BookOpenIcon,
  BookmarkIcon,
  ChaptersIcon,
  CoursesIcon,
  DashboardIcon,
  EnrollmentsIcon,
  ExamsIcon,
  FaqIcon,
  FooterPanelIcon,
  GraduationCapIcon,
  HeaderPanelIcon,
  HeroImageIcon,
  KeyIcon,
  MegaphoneIcon,
  MentorsIcon,
  NotificationsIcon,
  PanelLeftIcon,
  QuestionBankIcon,
  ResultsChartIcon,
  ReviewsIcon,
  RolesIcon,
  SeoIcon,
  SettingsIcon,
  ShareIcon,
  ShieldIcon,
  StudentsIcon,
  TagIcon,
  TicketIcon,
  UserShieldIcon,
  WebsiteIcon,
  JerseyIcon,
} from "@/components/admin/icons";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type AdminNavGroup = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Dashboard",
    icon: DashboardIcon,
    items: [
      { label: "Dashboard", href: "/admin", icon: DashboardIcon },
    ],
  },
  {
    label: "Website Control",
    icon: WebsiteIcon,
    items: [
      { label: "General Settings", href: "/admin/settings", icon: SettingsIcon },
      { label: "Logo & Favicon", href: "/admin/branding", icon: PanelLeftIcon },
      { label: "Header / Navbar", href: "/admin/website/header", icon: HeaderPanelIcon },
      { label: "Hero Section", href: "/admin/website/homepage/hero", icon: HeroImageIcon },
      { label: "Courses Section", href: "/admin/homepage-courses", icon: BookOpenIcon },
      { label: "Mentors Section", href: "/admin/website/homepage/mentors", icon: MentorsIcon },
      { label: "Reviews Section", href: "/admin/website/homepage/reviews", icon: ReviewsIcon },
      { label: "FAQ Section", href: "/admin/website/homepage/faq", icon: FaqIcon },
      { label: "Footer", href: "/admin/website/footer", icon: FooterPanelIcon },
      { label: "Social Links", href: "/admin/website/social-links", icon: ShareIcon },
      { label: "SEO Settings", href: "/admin/website/seo", icon: SeoIcon },
    ],
  },
  {
    label: "Courses",
    icon: CoursesIcon,
    items: [
      { label: "All Courses", href: "/admin/courses", icon: CoursesIcon },
      { label: "Academic Courses", href: "/admin/courses/academic", icon: GraduationCapIcon },
      { label: "Admission Courses", href: "/admin/courses/admission", icon: TagIcon },
      { label: "Categories", href: "/admin/courses/categories", icon: TagIcon },
      { label: "Subjects", href: "/admin/courses/subjects", icon: BookmarkIcon },
      { label: "Chapters", href: "/admin/courses/chapters", icon: ChaptersIcon },
      { label: "Classes", href: "/admin/courses/classes", icon: GraduationCapIcon },
      { label: "Pricing", href: "/admin/courses/pricing", icon: TagIcon },
      { label: "Coupons", href: "/admin/courses/coupons", icon: TicketIcon },
    ],
  },
  {
    label: "Students",
    icon: StudentsIcon,
    items: [
      { label: "All Students", href: "/admin/students", icon: StudentsIcon },
      { label: "Enrollments", href: "/admin/students/enrollments", icon: EnrollmentsIcon },
      { label: "Student Accounts", href: "/admin/students/accounts", icon: UserShieldIcon },
    ],
  },
  {
    label: "Exams",
    icon: ExamsIcon,
    items: [
      { label: "Public Exams", href: "/admin/exams/public", icon: ExamsIcon },
      { label: "Enrolled Exams", href: "/admin/exams/enrolled", icon: EnrollmentsIcon },
      { label: "Question Bank", href: "/admin/exams/question-bank", icon: QuestionBankIcon },
      { label: "Answer Keys", href: "/admin/exams/answer-keys", icon: KeyIcon },
      { label: "Results", href: "/admin/exams/results", icon: ResultsChartIcon },
    ],
  },
  {
    label: "Mentors",
    icon: MentorsIcon,
    items: [
      { label: "All Mentors", href: "/admin/mentors", icon: MentorsIcon },
      { label: "Mentor Profiles", href: "/admin/mentors/profiles", icon: UserShieldIcon },
    ],
  },
  {
    label: "Content",
    icon: ReviewsIcon,
    items: [
      { label: "Reviews", href: "/admin/content/reviews", icon: ReviewsIcon },
      { label: "FAQ", href: "/admin/content/faq", icon: FaqIcon },
      { label: "Notifications", href: "/admin/content/notifications", icon: NotificationsIcon },
      { label: "Announcements", href: "/admin/content/announcements", icon: MegaphoneIcon },
      { label: "Jersey", href: "/admin/content/jersey", icon: JerseyIcon },
    ],
  },
  {
    label: "Administration",
    icon: ShieldIcon,
    items: [
      { label: "Admin Management", href: "/admin/administration/admins", icon: UserShieldIcon },
      { label: "Roles & Permissions", href: "/admin/administration/roles", icon: RolesIcon },
      { label: "Activity Logs", href: "/admin/administration/activity-logs", icon: ActivityLogIcon },
      { label: "Admin Settings", href: "/admin/administration/settings", icon: SettingsIcon },
    ],
  },
];

export function findActiveAdminNav(pathname: string): AdminNavItem | null {
  let best: AdminNavItem | null = null;
  let bestLen = 0;
  for (const group of adminNavGroups) {
    for (const item of group.items) {
      const normalized = item.href === "/admin" ? "/admin" : item.href;
      if (
        pathname === normalized ||
        (pathname.startsWith(normalized + "/") && normalized.length > bestLen)
      ) {
        best = item;
        bestLen = normalized.length;
      }
    }
  }
  return best;
}
