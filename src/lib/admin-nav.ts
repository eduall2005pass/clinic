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
  UserShieldIcon,
  WebsiteIcon,
} from "@/components/admin/icons";

export type AdminSubSection = {
  label: string;
  href: string;
};

/**
 * Permission category required to see/use a nav section.
 * null = available to every signed-in admin (e.g. profile).
 */
export type AdminNavPermission =
  | "manageContent"
  | "manageCourses"
  | "manageExams"
  | "manageStudents"
  | "manageAdmins"
  | null;

export type AdminCategory = {
  name: string;
  href: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  subsections: AdminSubSection[];
  permission: AdminNavPermission;
};

export const adminCategories: AdminCategory[] = [
  {
    name: "Website",
    href: "/admin/website",
    description: "Control the complete public website.",
    icon: WebsiteIcon,
    permission: "manageContent",
    subsections: [
      { label: "General Settings", href: "/admin/settings" },
      { label: "Logo & Favicon", href: "/admin/website/logo-favicon" },
      { label: "Header & Navbar", href: "/admin/website/header" },
      { label: "Homepage", href: "/admin/website/homepage" },
      { label: "Hero / Banner", href: "/admin/website/homepage/hero" },
      { label: "Courses Section", href: "/admin/homepage-courses" },
      { label: "Mentor Section", href: "/admin/website/homepage/mentors" },
      { label: "Reviews Section", href: "/admin/website/homepage/reviews" },
      { label: "FAQ Section", href: "/admin/website/homepage/faq" },
      { label: "Footer", href: "/admin/website/footer" },
      { label: "Social Links", href: "/admin/website/social-links" },
      { label: "SEO Settings", href: "/admin/website/seo" },
      { label: "Theme & Appearance", href: "/admin/website/theme" },
      { label: "Popup / Announcement", href: "/admin/website/popup" },
      { label: "Contact Information", href: "/admin/website/contact" },
    ],
  },
  {
    name: "Courses",
    href: "/admin/courses",
    description: "Manage courses, subjects, chapters, classes and pricing.",
    icon: CoursesIcon,
    permission: "manageCourses",
    subsections: [
      { label: "Enrolled Courses", href: "/admin/enrolled-courses" },
      { label: "All Courses", href: "/admin/courses/all" },
      { label: "SSC Academic", href: "/admin/courses/ssc" },
      { label: "HSC Academic", href: "/admin/courses/academic" },
      { label: "Medical Admission", href: "/admin/courses/admission" },
      { label: "Varsity Admission", href: "/admin/courses/varsity" },
      { label: "Categories", href: "/admin/courses/categories" },
      { label: "Filter Edit", href: "/admin/courses/filters" },
      { label: "Subjects", href: "/admin/courses/subjects" },
      { label: "Chapters", href: "/admin/courses/chapters" },
      { label: "Papers & Materials", href: "/admin/courses/papers" },
      { label: "Classes", href: "/admin/courses/classes" },
      { label: "Pricing", href: "/admin/courses/pricing" },
      { label: "Discounts", href: "/admin/courses/pricing" },
      { label: "Coupons", href: "/admin/courses/coupons" },
    ],
  },
  {
    name: "Students",
    href: "/admin/students",
    description: "Manage students, enrollments and account activity.",
    icon: StudentsIcon,
    permission: "manageStudents",
    subsections: [
      { label: "All Students", href: "/admin/students/all" },
      { label: "Student Details", href: "/admin/students/details" },
      { label: "Enrollments", href: "/admin/students/enrollments" },
      { label: "Account Status", href: "/admin/students/account-status" },
      { label: "Student Activity", href: "/admin/students/activity" },
    ],
  },
  {
    name: "Exams",
    href: "/admin/exams",
    description:
      "Manage public exams, enrolled exams, questions and results.",
    icon: ExamsIcon,
    permission: "manageExams",
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
    permission: "manageContent",
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
    permission: "manageContent",
    subsections: [
      { label: "Reviews", href: "/admin/content/reviews" },
      { label: "FAQ", href: "/admin/content/faq" },
      { label: "Announcements", href: "/admin/content/announcements" },
      { label: "Notifications", href: "/admin/content/notifications" },
      { label: "Push Notifications", href: "/admin/content/push" },
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
    permission: "manageCourses",
    subsections: [
      { label: "Promotional Banners", href: "/admin/marketing/banners" },
      { label: "Featured Courses", href: "/admin/marketing/featured-courses" },
      { label: "Offers", href: "/admin/marketing/offers" },
      { label: "Campaigns", href: "/admin/marketing/campaigns" },
      { label: "Coupons", href: "/admin/marketing/coupons" },
    ],
  },
  {
    name: "Administration",
    href: "/admin/administration",
    description: "Manage admins, permissions, security and activity logs.",
    icon: LockIcon,
    permission: "manageAdmins",
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
    permission: "manageAdmins",
    subsections: [
      { label: "System Status", href: "/admin/system/status" },
      { label: "Storage", href: "/admin/system/storage" },
      { label: "Cache", href: "/admin/system/cache" },
      { label: "Backup", href: "/admin/system/backup" },
      { label: "System Logs", href: "/admin/system/logs" },
    ],
  },
];

export const adminProfileCategory: AdminCategory = {
  name: "Admin Profile",
  href: "/admin/profile",
  description: "View and manage your administrator account.",
  icon: UserShieldIcon,
  permission: null,
  subsections: [
    { label: "Profile Information", href: "/admin/profile" },
    { label: "Profile Picture", href: "/admin/profile/picture" },
    { label: "Account Settings", href: "/admin/profile/account" },
    { label: "Password & Security", href: "/admin/profile/security" },
    { label: "Login Activity", href: "/admin/profile/login-activity" },
  ],
};

export function findAdminCategory(pathname: string): AdminCategory | null {
  for (const category of [...adminCategories, adminProfileCategory]) {
    if (pathname === category.href || pathname.startsWith(category.href + "/")) {
      return category;
    }
  }
  return null;
}

export type AdminBreadcrumb = {
  label: string;
  href: string;
};

export function findActiveAdminNav(pathname: string): {
  title: string;
  breadcrumbs: AdminBreadcrumb[];
} {
  if (pathname === "/admin") {
    return {
      title: "Home",
      breadcrumbs: [
        { label: "Home", href: "/admin" },
      ],
    };
  }

  const category = findAdminCategory(pathname);
  if (!category) {
    return {
      title: "Admin Panel",
      breadcrumbs: [{ label: "Home", href: "/admin" }],
    };
  }

  const sub = category.subsections.find(
    (item) =>
      pathname === item.href ||
      (pathname.startsWith(item.href + "/") && item.href !== category.href)
  );

  const breadcrumbs: AdminBreadcrumb[] = [
    { label: "Home", href: "/admin" },
    { label: category.name, href: category.href },
  ];
  if (sub) {
    breadcrumbs.push({ label: sub.label, href: sub.href });
  }

  return {
    title: sub ? sub.label : `${category.name} Management`,
    breadcrumbs,
  };
}
