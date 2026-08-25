// Course-wise content structure — shared by admin, student APIs and UI.
// Pure logic only (no server imports) so client components can use it.

export type CourseContentLayout = "auto" | "direct" | "paper" | "subject";

/**
 * Legacy fallback for courses saved before the per-course setting existed
 * ("auto"): SSC Biology / HSC Botany / HSC Zoology open the direct Class /
 * Exam / Materials page.
 */
const DIRECT_CONTENT_MATCHERS = ["sscbiology", "botany", "zoology"];

export function matchesDirectContentName(
  name?: string | null,
  slug?: string | null,
): boolean {
  const normalized = `${name ?? ""} ${slug ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return DIRECT_CONTENT_MATCHERS.some((matcher) =>
    normalized.includes(matcher),
  );
}

/** True when View Course Content should open the 3-card page directly. */
export function isDirectContent(
  layout: CourseContentLayout | undefined,
  name?: string | null,
  slug?: string | null,
): boolean {
  return layout === "direct" || (layout !== "paper" && layout !== "subject" && matchesDirectContentName(name, slug));
}
