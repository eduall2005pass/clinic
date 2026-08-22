import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { saveFile, isLocalUpload, removeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".ico",
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wav",
  ".pdf",
];

const MAX_FILE_BYTES = 512 * 1024 * 1024;

/** Generic admin media upload: multipart { file, dir?, previousUrl? }. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 512 MB limit." },
      { status: 413 },
    );
  }

  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: `Unsupported file type "${extension || "unknown"}".` },
      { status: 400 },
    );
  }

  const rawDir = formData.get("dir");
  const dir =
    typeof rawDir === "string" && rawDir.trim().length > 0
      ? rawDir.trim().replace(/[^A-Za-z0-9/_-]/g, "")
      : "misc";

  try {
    const url = await saveFile(dir, file.name, await file.arrayBuffer());

    // Best-effort cleanup of the previously managed file being replaced.
    const previousUrl = formData.get("previousUrl");
    if (typeof previousUrl === "string" && previousUrl && previousUrl !== url) {
      if (isLocalUpload(previousUrl)) {
        await removeFile(previousUrl).catch(() => undefined);
      }
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Media upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
