// Video URL → embed URL conversion for FAQ video answers.
// Admins only ever paste a normal watch/share URL; the website renders a
// responsive 16:9 player. Raw iframe code is never exposed.

export type VideoEmbed =
  | { provider: "youtube" | "vimeo" | "drive" | "direct"; embedUrl: string }
  | null;

function youTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) {
    return null;
  }
  // youtube.com/shorts/<id> — Shorts play in the standard embed player.
  const shorts = url.pathname.match(/^\/shorts\/([\w-]+)/);
  if (shorts) return shorts[1];
  // youtube.com/embed/<id> — already an embed URL.
  const embed = url.pathname.match(/^\/embed\/([\w-]+)/);
  if (embed) return embed[1];
  // youtube.com/watch?v=<id>
  const v = url.searchParams.get("v");
  if (v && /^[\w-]+$/.test(v)) return v;
  return null;
}

/**
 * Convert a pasted video URL into an embeddable player URL, or null when
 * the URL is not from a supported embeddable provider.
 * Supported: YouTube (watch / youtu.be / shorts / embed), Vimeo,
 * Google Drive share links, and direct .mp4/.webm files.
 */
export function toVideoEmbed(rawUrl: string): VideoEmbed {
  const value = (rawUrl ?? "").trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  // YouTube — watch, share, Shorts and existing embed links.
  const ytId = youTubeId(url);
  if (ytId) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
    };
  }

  const host = url.hostname.replace(/^www\./, "");

  // Vimeo — vimeo.com/<id>
  if (host.endsWith("vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
    }
    return null;
  }

  // Google Drive — drive.google.com/file/d/<id>/view
  if (host.endsWith("drive.google.com")) {
    const match = url.pathname.match(/\/file\/d\/([\w-]+)/);
    if (match) {
      return {
        provider: "drive",
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
      };
    }
    return null;
  }

  // Direct video files — played with <video>, no iframe needed.
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url.pathname)) {
    return { provider: "direct", embedUrl: url.toString() };
  }

  return null;
}
