import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { saveFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Student picture upload for Q&A questions. Images only — audio/video and
 * every other file type are rejected. Requires a signed-in student.
 */
export async function POST(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No picture provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Picture must be 8 MB or smaller." },
      { status: 413 },
    );
  }
  const dot = file.name.lastIndexOf(".");
  const extension =
    dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return NextResponse.json(
      { error: `Unsupported picture type "${extension || "unknown"}".` },
      { status: 400 },
    );
  }

  try {
    const url = await saveFile("qa", file.name, await file.arrayBuffer());
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[api/qa/image] upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
