import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllFeaturedCourses,
  fetchActiveFeaturedSlugs,
  saveFeaturedCourses,
} from "@/lib/featured-courses";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const admin = await requirePermission(request, "manageCourses");
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const courses = await fetchAllFeaturedCourses();
    return NextResponse.json({ courses }, { headers: NO_CACHE_HEADERS });
  }
  const slugs = await fetchActiveFeaturedSlugs();
  return NextResponse.json({ slugs }, { headers: NO_CACHE_HEADERS });
}

/** Replace the full featured list (select / toggle / reorder). */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageCourses");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    courses?: unknown;
  } | null;

  if (!body || !Array.isArray(body.courses)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const courses = await saveFeaturedCourses(
      body.courses as Array<Record<string, unknown>>,
      admin.uid,
    );
    return NextResponse.json({ courses });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save the featured courses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
