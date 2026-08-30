import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/admin";
import {
  fetchBatchFilterOptions,
  saveBatchFilterOptions,
  FILTER_SCOPES,
  type FilterScope,
} from "@/lib/course-filters";

export const dynamic = "force-dynamic";

function isScope(value: unknown): value is FilterScope {
  return typeof value === "string" &&
    (FILTER_SCOPES as string[]).includes(value);
}

/** GET → saved batch filter options (admin view, includes defaults). */
export async function GET(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [ssc, hsc] = await Promise.all([
    fetchBatchFilterOptions("ssc"),
    fetchBatchFilterOptions("hsc"),
  ]);
  return NextResponse.json(
    { ssc, hsc },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** PUT → save options for one scope: { scope, options: [{id,label},…] }. */
export async function PUT(request: NextRequest) {
  const admin = await requireAnyPermission(request, ["manageCourses", "manageCourseContent"]);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    scope?: unknown;
    options?: unknown;
  } | null;
  if (!isScope(body?.scope)) {
    return NextResponse.json(
      { error: "Scope must be 'ssc' or 'hsc'." },
      { status: 400 },
    );
  }
  const raw = Array.isArray(body?.options) ? body.options : [];
  const parsed = raw
    .map((entry) => {
      const item = entry as { id?: unknown; label?: unknown };
      if (typeof item?.id !== "string" || typeof item?.label !== "string")
        return null;
      const id = item.id.trim().toLowerCase();
      const label = item.label.trim();
      if (!/^[a-z0-9-]{1,32}$/.test(id) || label.length === 0 || label.length > 40)
        return null;
      return { id, label };
    })
    .filter((option): option is { id: string; label: string } => option !== null);

  // First option must be the "all" filter — the UI depends on it.
  if (parsed.length < 2 || parsed[0].id !== "all") {
    return NextResponse.json(
      {
        error:
          "The first option must be the 'All Batch' filter (id: all), followed by at least one batch.",
      },
      { status: 400 },
    );
  }
  const ids = new Set<string>();
  for (const option of parsed) {
    if (ids.has(option.id)) {
      return NextResponse.json(
        { error: `Duplicate filter option id: ${option.id}` },
        { status: 400 },
      );
    }
    ids.add(option.id);
  }

  try {
    await saveBatchFilterOptions(body.scope, parsed, admin.uid);
  } catch {
    return NextResponse.json(
      { error: "Failed to save the filter options." },
      { status: 500 },
    );
  }
  return NextResponse.json({ options: await fetchBatchFilterOptions(body.scope) });
}
