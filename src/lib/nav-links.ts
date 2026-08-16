export type NavLink = {
  label: string;
  href: string;
};

export const mainNavLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Exams", href: "/exam" },
  { label: "Q&A", href: "/qa" },
  { label: "Dashboard", href: "/dashboard" },
];

export const loginHref = "/login";