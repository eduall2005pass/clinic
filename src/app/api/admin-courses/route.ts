import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  setAdminCourseImage,
  deleteAdminCourse,
  MAX_COURSE_IMAGE_SIZE,
} from "@/lib/admin-courses";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await fetchAllAdminCourses();
  return NextResponse.json(
    { courses },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create a course. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Multipart — image upload for an existing course.
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const id = formData.get("id");
    const image = formData.get("image");
    if (typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Missing course id." }, { status: 400 });
    }
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }
    if (image.size > MAX_COURSE_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 },
      );
    }
    try {
      const courses = await setAdminCourseImage(id.trim(), image);
      return NextResponse.json({ courses });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload the image.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const courses = await createAdminCourse(body, admin.uid);
    return NextResponse.json({ courses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create the course.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Update a course (full edit or partial, e.g. publish/feature toggle). */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing course id." }, { status: 400 });
  }

  try {
    const courses = await updateAdminCourse(body.id, body, admin.uid);
    return NextResponse.json({ courses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the course.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Delete a course. */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing course id." }, { status: 400 });
  }

  try {
    const courses = await deleteAdminCourse(body.id);
    return NextResponse.json({ courses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete the course.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
