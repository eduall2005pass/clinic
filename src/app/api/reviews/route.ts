import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllReviewRecords,
  fetchPublishedReviewRecords,
  saveReviewRecord,
  setReviewPublished,
  reorderReviews,
  deleteReviewRecord,
} from "@/lib/reviews-store";

// Public content: edge-cached for fast loads (60s revalidation).
export const revalidate = 300;

export async function GET() {
  const reviews = await fetchPublishedReviewRecords();
  return NextResponse.json({ reviews });
}

/** Create or update a review (multipart — supports optional photo upload). */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const rawId = formData.get("id");
  const studentName = formData.get("student_name");
  const text = formData.get("text");
  const ratingRaw = formData.get("rating");
  const courseName = formData.get("course_name");
  const batchLabel = formData.get("batch_label");
  const publishedRaw = formData.get("is_published");
  const photo = formData.get("photo");

  if (typeof studentName !== "string" || studentName.trim().length === 0) {
    return NextResponse.json({ error: "Student name is required." }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Review text is required." }, { status: 400 });
  }
  if (photo !== null && !(photo instanceof File)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  try {
    const reviews = await saveReviewRecord({
      id: typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : undefined,
      studentName,
      text,
      rating: Number(ratingRaw) || 5,
      courseName: typeof courseName === "string" ? courseName : null,
      batchLabel: typeof batchLabel === "string" ? batchLabel : null,
      isPublished: publishedRaw === "true" || publishedRaw === "1",
      photoFile: photo instanceof File && photo.size > 0 ? photo : null,
    });
    return NextResponse.json({ reviews });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the review.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Approve/hide reviews and/or change display order. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    order?: unknown;
    updates?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    let reviews = await fetchAllReviewRecords();

    if (Array.isArray(body.updates)) {
      for (const raw of body.updates) {
        const entry = raw as Record<string, unknown>;
        if (typeof entry.id !== "string" || entry.id.length === 0) continue;
        if (typeof entry.isPublished === "boolean") {
          reviews = await setReviewPublished(entry.id, entry.isPublished);
        }
      }
    }

    if (
      Array.isArray(body.order) &&
      body.order.every((item) => typeof item === "string")
    ) {
      reviews = await reorderReviews(body.order as string[]);
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the reviews.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  }
  const reviews = await deleteReviewRecord(body.id);
  return NextResponse.json({ reviews });
}
