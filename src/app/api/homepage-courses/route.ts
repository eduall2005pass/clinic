import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  fetchHomepageCourses,
  saveHomepageCourse,
  removeHomepageCourseImage,
} from "@/lib/homepage-courses";
import {
  HOMEPAGE_COURSE_SLUGS,
  ALLOWED_HOMEPAGE_COURSE_EXTENSIONS,
  MAX_HOMEPAGE_COURSE_IMAGE_SIZE,
  type HomepageCourseSlug,
} from "@/lib/homepage-courses-constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await fetchHomepageCourses();
  return NextResponse.json({ cards });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let slug: string | undefined;
  let title: string | undefined;
  let description: string | undefined;
  let buttonText: string | undefined;
  let buttonHref: string | undefined;
  let isActive: boolean | undefined;
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    slug = asString(formData.get("slug"));
    title = asString(formData.get("title"));
    description = asString(formData.get("description"));
    buttonText = asString(formData.get("button_text") ?? formData.get("buttonText"));
    buttonHref = asString(formData.get("button_href") ?? formData.get("buttonHref"));
    const rawActive = formData.get("is_active") ?? formData.get("isActive");
    if (typeof rawActive === "string") {
      isActive = rawActive === "true" || rawActive === "1";
    }
    const rawImage = formData.get("image");
    if (rawImage instanceof File && rawImage.size > 0) imageFile = rawImage;
  } else {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    slug = asString(body.slug);
    title = asString(body.title);
    description = asString(body.description);
    buttonText = asString(body.button_text ?? body.buttonText);
    buttonHref = asString(body.button_href ?? body.buttonHref);
    if (typeof body.is_active === "boolean") isActive = body.is_active;
    else if (typeof body.isActive === "boolean") isActive = body.isActive;
    else if (typeof body.is_active === "string") isActive = body.is_active === "true" || body.is_active === "1";
    else if (typeof body.isActive === "string") isActive = body.isActive === "true" || body.isActive === "1";
  }

  if (!slug || !(HOMEPAGE_COURSE_SLUGS as string[]).includes(slug)) {
    return NextResponse.json({ error: "Invalid category. Must be ssc, hsc or medical." }, { status: 400 });
  }

  if (imageFile) {
    const extension = imageFile.name.includes(".")
      ? `.${imageFile.name.split(".").pop()?.toLowerCase() ?? ""}`
      : "";
    if (!(ALLOWED_HOMEPAGE_COURSE_EXTENSIONS as readonly string[]).includes(extension as never)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG, WebP, GIF or SVG." },
        { status: 400 },
      );
    }
    if (imageFile.size > MAX_HOMEPAGE_COURSE_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
    }
  }

  try {
    const card = await saveHomepageCourse(
      {
        slug: slug as HomepageCourseSlug,
        title: title ?? undefined,
        description: description ?? undefined,
        buttonText: buttonText ?? undefined,
        buttonHref: buttonHref ?? undefined,
        isActive,
      },
      imageFile,
      admin.uid,
    );
    return NextResponse.json({ message: "Course card updated successfully.", card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save course card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const slugParam = url.searchParams.get("slug");
  let bodySlug: string | null = null;
  try {
    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
    if (body && typeof body.slug === "string") bodySlug = body.slug;
  } catch {
    // ignore
  }
  const slug = slugParam ?? bodySlug;
  const target = url.searchParams.get("target");

  if (!slug || !(HOMEPAGE_COURSE_SLUGS as string[]).includes(slug)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  // Currently only supports removing image
  if (target === "image" || !target) {
    try {
      const card = await removeHomepageCourseImage(slug as HomepageCourseSlug, admin.uid);
      return NextResponse.json({ message: "Image removed.", card });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove image.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown target." }, { status: 400 });
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}
