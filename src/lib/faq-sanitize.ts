// FAQ rich-text answer sanitising — whitelist-based, runs server-side on
// every save so the website can render the stored HTML safely.

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "span",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip every tag — used for plain-text previews. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reduce an HTML string to a safe whitelist: allowed tags only, links keep
 * only an https/http href with rel/noopener, every other attribute is
 * dropped. Script/style content and comments are removed entirely.
 */
export function sanitizeFaqHtml(input: string): string {
  if (!input) return "";

  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "");

  let output = "";
  const tagPattern = /<\/?([a-zA-Z0-9]+)((?:\s+[^<>]*?)?)\s*\/?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    // Text between tags — escaped as-is.
    if (match.index > lastIndex) {
      output += escapeHtml(html.slice(lastIndex, match.index));
    }
    lastIndex = tagPattern.lastIndex;

    const rawTag = match[0];
    const tagName = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) continue; // drop unknown tags

    if (rawTag.startsWith("</")) {
      output += `</${tagName}>`;
      continue;
    }

    if (tagName === "a") {
      const hrefMatch = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i.exec(
        match[2] ?? "",
      );
      const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "")
        .trim()
        .toLowerCase();
      const safeHref =
        href.startsWith("https://") || href.startsWith("http://")
          ? href
          : null;
      output += safeHref
        ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">`
        : "<a>";
      continue;
    }

    // Every other allowed tag opens attribute-free.
    output += `<${tagName}>`;
  }

  if (lastIndex < html.length) {
    output += escapeHtml(html.slice(lastIndex));
  }

  return output.trim();
}
