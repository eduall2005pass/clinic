import type { ComponentType, SVGProps } from "react";
import {
  CoursesIcon,
  ExamsIcon,
  LockIcon,
  MegaphoneIcon,
  MentorsIcon,
  ServerIcon,
  StudentsIcon,
  TargetIcon,
  WebsiteIcon,
} from "@/components/admin/icons";

export type AdminSubSection = {
  label: string;
  href: string;
};

export type AdminCategory = {
  name: string;
  href: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  subsections: AdminSubSection[];
};

export const adminCategories: AdminCategory[] = [
  {
    name: "Website",
    href: "/admin/website",
    description: "Control the complete public website.",
    icon: WebsiteIcon,
    subsections: [
      { label: "General Settings", href: "/admin/settings" },
      { label: "Logo & Favicon", href: "/admin/website" },
      { label: "Header & Navbar", href: "/admin/website/header" },
      { label: "Homepage", href: "/admin/website/homepage" },
      { label: "Hero Section", href: "/admin/website/homepage/hero" },
      { label: "Courses Section", href: "/admin/homepage-courses" },
      { label: "Mentor Section", href: "/admin/website/homepage/mentors" },
      { label: "Reviews Section", href: "/admin/website/homepage/reviews" },
      { label: "FAQ Section", href: "/admin/website/homepage/faq" },
      { label: "Footer", href: "/admin/website/footer" },
      { label: "Social Links", href: "/admin/website/social-links" },
      { label: "SEO", href: "/admin/website/seo" },
      { label: "Theme & Appearance", href: "/admin/website/theme" },
      { label: "Popup / Announcement", href: "/admin/website/popup" },
    ],
  },
  {
    name: "Courses",
    href: "/admin/courses",
    description: "Manage courses, subjects, chapters, classes and pricing.",
    icon: CoursesIcon,
    subsections: [
      { label: "All Courses", href: "/admin/courses/all" },
      { label: "Academic Courses", href: "/admin/courses/academic" },
      { label: "Admission Courses", href: "/admin/courses/admission" },
      { label: "Categories", href: "/admin/courses/categories" },
      { label: "Subjects", href: "/admin/courses/subjects" },
      { label: "Chapters", href: "/admin/courses/chapters" },
      { label: "Classes", href: "/admin/courses/classes" },
      { label: "Pricing & Discounts", href: "/admin/courses/pricing" },
      { label: "Coupons", href: "/admin/courses/coupons" },
    ],
  },
  {
    name: "Students",
    href: "/admin/students",
    description: "Manage students and their enrollments.",
    icon: StudentsIcon,
    subsections: [
      { label: "All Students", href: "/admin/students/all" },
      { label: "Enrollments", href: "/admin/students/enrollments" },
      { label: "Student Activity", href: "/admin/students/activity" },
    ],
  },
  {
    name: "Exams",
    href: "/admin/exams",
    description:
      "Manage public exams, enrolled exams, questions and results.",
    icon: ExamsIcon,
    subsections: [
      { label: "Public Exams", href: "/admin/exams/public" },
      { label: "Enrolled Exams", href: "/admin/exams/enrolled" },
      { label: "Question Bank", href: "/admin/exams/question-bank" },
      { label: "Answer Keys", href: "/admin/exams/answer-keys" },
      { label: "Results", href: "/admin/exams/results" },
      { label: "Exam Settings", href: "/admin/exams/settings" },
    ],
  },
  {
    name: "Mentors",
    href: "/admin/mentors",
    description: "Manage mentor profiles and information.",
    icon: MentorsIcon,
    subsections: [
      { label: "All Mentors", href: "/admin/mentors/all" },
      { label: "Mentor Profiles", href: "/admin/mentors/profiles" },
    ],
  },
  {
    name: "Content",
    href: "/admin/content",
    description:
      "Manage reviews, FAQ, notifications, announcements and media.",
    icon: MegaphoneIcon,
    subsections: [
      { label: "Reviews", href: "/admin/content/reviews" },
      { label: "FAQ", href: "/admin/content/faq" },
      { label: "Announcements", href: "/admin/content/announcements" },
      { label: "Notifications", href: "/admin/content/notifications" },
      { label: "Jersey", href: "/admin/content/jersey" },
      { label: "Media Library", href: "/admin/content/media-library" },
    ],
  },
  {
    name: "Marketing",
    href: "/admin/marketing",
    description:
      "Manage offers, promotional banners, featured courses and campaigns.",
    icon: TargetIcon,
    subsections: [
      { label: "Promotional Banners", href: "/admin/marketing/banners" },
      { label: "Featured Courses", href: "/admin/marketing/featured-courses" },
      { label: "Offers", href: "/admin/marketing/offers" },
      { label: "Coupons", href: "/admin/marketing/coupons" },
      { label: "Campaigns", href: "/admin/marketing/campaigns" },
    ],
  },
  {
    name: "Administration",
    href: "/admin/administration",
    description: "Manage admins, permissions, security and activity logs.",
    icon: LockIcon,
    subsections: [
      { label: "Admin Management", href: "/admin/administration/admins" },
      { label: "Roles & Permissions", href: "/admin/administration/roles" },
      { label: "Activity Logs", href: "/admin/administration/activity-logs" },
      { label: "Security", href: "/admin/administration/security" },
    ],
  },
  {
    name: "System",
    href: "/admin/system",
    description:
      "Manage system-level settings, storage, cache, backup and logs.",
    icon: ServerIcon,
    subsections: [
      { label: "System Status", href: "/admin/system/status" },
      { label: "Storage", href: "/admin/system/storage" },
      { label: "Cache", href: "/admin/system/cache" },
      { label: "Backup", href: "/admin/system/backup" },
      { label: "System Logs", href: "/admin/system/logs" },
    ],
  },
];

export function findAdminCategory(pathname: string): AdminCategory | null {
  for (const category of adminCategories) {
    if (pathname === category.href || pathname.startsWith(category.href + "/")) {
      return category;
    }
  }
  return null;
}

export function findActiveAdminNav(pathname: string): {
  title: string;
} | null {
  if (pathname === "/admin") return { title: "Home" };
  if (pathname === "/admin/profile" || pathname.startsWith("/admin/profile/"))
    return { title: "Admin Profile" };
  const category = findAdminCategory(pathname);
  if (!category) return null;
  const sub = category.subsections.find(
    (item) =>
      pathname === item.href ||
      (pathname.startsWith(item.href + "/") && item.href !== category.href)
  );
  return { title: sub ? sub.label : `${category.name} Management` };
}
