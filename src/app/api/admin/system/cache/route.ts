import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";

export const dynamic = "force-dynamic";

/**
 * Application cache management. Only in-memory/CDN caches are cleared —
 * no database data is ever read, modified or deleted here.
 */

const REVALIDATED = "Next.js page & data cache";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json(
    {
      targets: [
        {
          id: "next",
          label: REVALIDATED,
          description:
            "Purges cached pages and fetched data so visitors see fresh content immediately.",
        },
      ],
      note: "Database data is never touched by cache clearing.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Clear supported application caches. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageAdmins");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    // Purge the framework-level page/data caches for every route.
    revalidatePath("/", "layout");
    await logAdminAction(admin, "cache.clear", REVALIDATED, request);
    return NextResponse.json(
      {
        cleared: [REVALIDATED],
        clearedAt: new Date().toISOString(),
        note: "Database data was not modified.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear the cache.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
