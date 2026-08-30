import { NextResponse } from "next/server";
import { fetchCourseCategoryCounts } from "@/lib/course-catalog";
import { fetchActiveCourseCategories } from "@/lib/course-categories-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [counts, categories] = await Promise.all([
      fetchCourseCategoryCounts(),
      fetchActiveCourseCategories(),
    ]);
    // Build both id-keyed and slug-keyed maps for client flexibility.
    const slugCounts: Record<string, number> = {};
    for (const cat of categories) {
      slugCounts[cat.slug] = counts[cat.id] ?? 0;
      // Also expose normalized slug prefix (ssc, hsc, medical, varsity)
      slugCounts[cat.slug.toLowerCase()] = counts[cat.id] ?? 0;
    }
    return NextResponse.json({ counts, slugCounts }, { status: 200 });
  } catch {
    return NextResponse.json({ counts: {}, slugCounts: {} }, { status: 200 });
  }
}
