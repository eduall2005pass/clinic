export type NavbarItem = {
  key: string;
  label: string;
  href: string | null;
  isActive: boolean;
};

export type NavbarConfig = {
  showNavbar: boolean;
  showMoreMenu: boolean;
  showThemeToggle: boolean;
  showLoginButton: boolean;
  items: NavbarItem[];
};

export const DEFAULT_NAVBAR_ITEMS: NavbarItem[] = [
  { key: "home", label: "Home", href: "/", isActive: true },
  { key: "dashboard", label: "Dashboard", href: "/dashboard", isActive: true },
  { key: "courses", label: "Course", href: "/courses", isActive: true },
  { key: "public-exam", label: "Public Exam", href: "/public-exam", isActive: true },
  { key: "qa", label: "Q&A", href: "/qa", isActive: true },
  { key: "our-success", label: "Our Success", href: "/#our-success", isActive: true },
  { key: "jersey", label: "Jersey", href: "/#jerseys", isActive: true },
  { key: "mentors", label: "Mentor", href: "/#mentors", isActive: true },
  { key: "reviews", label: "Review", href: "/#reviews", isActive: true },
  { key: "faq", label: "FAQ", href: "/#faq", isActive: true },
];

export const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  showNavbar: true,
  showMoreMenu: true,
  showThemeToggle: true,
  showLoginButton: true,
  items: DEFAULT_NAVBAR_ITEMS,
};

export function sortNavbarItems(items: NavbarItem[]): NavbarItem[] {
  return [...items].sort((a, b) => {
    const indexA = DEFAULT_NAVBAR_ITEMS.findIndex((item) => item.key === a.key);
    const indexB = DEFAULT_NAVBAR_ITEMS.findIndex((item) => item.key === b.key);
    return (
      (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    );
  });
}

export function isValidNavbarHref(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Menu items saved without a link fall back to their home-page section,
 * so they stay clickable (e.g. Jersey → /#jerseys).
 */
export const NAVBAR_SECTION_FALLBACKS: Record<string, string> = {
  jersey: "/#jerseys",
};
