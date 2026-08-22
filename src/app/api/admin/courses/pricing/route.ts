import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import { fetchCatalogCourses, savePricingUpdates } from "@/lib/courses-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await fetchCatalogCourses();
  return NextResponse.json(
    {
      pricing: courses.map((course) => ({
        slug: course.slug,
        name: course.name,
        fee: course.fee,
        discountFee: course.discountFee,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Bulk fee update: { updates: [{ slug, fee, discountFee }] }. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as
    | { updates?: unknown }
    | null;
  if (!body || !Array.isArray(body.updates)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  try {
    const updated = await savePricingUpdates(
      body.updates as Array<Record<string, unknown>>,
      admin.uid,
    );
    await logAdminAction(admin, "courses.pricing", `updated=${updated}`, request);
    return NextResponse.json({ updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update pricing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
