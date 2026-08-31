// Course-wise content structure — shared by admin, student APIs and UI.
// Pure logic only (no server imports) so client components can use it.

export type CourseContentLayout = "flow-1" | "flow-2" | "flow-3";

/** Legacy name matchers for courses saved before the per-course setting. */
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

/** True when View Course Content should open the direct flow (Flow 1). */
export function isDirectContent(
  layout: CourseContentLayout | undefined | string,
  name?: string | null,
  slug?: string | null,
): boolean {
  // New flow values: flow-1 = direct
  if (layout === "flow-1") return true;
  // Fallback: name-based heuristic for courses without explicit layout
  if (layout === "flow-2" || layout === "flow-3") return false;
  return matchesDirectContentName(name, slug);
}
