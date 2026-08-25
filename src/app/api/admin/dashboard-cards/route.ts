import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  deleteDashboardCard,
  fetchAllDashboardCards,
  insertDashboardCard,
  updateDashboardCard,
} from "@/lib/dashboard-cards";

export const dynamic = "force-dynamic";

/** All dashboard cards, including hidden ones. */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const cards = await fetchAllDashboardCards();
  return NextResponse.json(
    { cards },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Add a card to every student dashboard. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const href = typeof body?.href === "string" ? body.href.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const icon = typeof body?.icon === "string" ? body.icon : "book";
  if (title.length < 2) {
    return NextResponse.json(
      { error: "Card title must be at least 2 characters." },
      { status: 400 },
    );
  }
  if (!href.startsWith("/")) {
    return NextResponse.json(
      { error: "Link must be an internal path starting with /." },
      { status: 400 },
    );
  }
  try {
    const cards = await insertDashboardCard({ title, description, href, icon });
    await logAdminAction(admin, "dashboard-card.create", title, request);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json(
      { error: "Failed to add the card." },
      { status: 500 },
    );
  }
}

/** Edit card fields and/or show/hide it. */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key) {
    return NextResponse.json({ error: "Missing card key." }, { status: 400 });
  }
  const patch: Parameters<typeof updateDashboardCard>[1] = {};
  if (typeof body?.title === "string") patch.title = body.title.trim();
  if (typeof body?.description === "string") patch.description = body.description.trim();
  if (typeof body?.href === "string") patch.href = body.href.trim();
  if (typeof body?.icon === "string") patch.icon = body.icon;
  if (typeof body?.isActive === "boolean") patch.isActive = body.isActive;
  try {
    const cards = await updateDashboardCard(key, patch);
    await logAdminAction(admin, "dashboard-card.update", key, request);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json(
      { error: "Failed to update the card." },
      { status: 500 },
    );
  }
}

/** Remove a card from every student dashboard (?key=...). */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  let key = url.searchParams.get("key") ?? "";
  if (!key) {
    const body = (await request.json().catch(() => null)) as
      | { key?: unknown }
      | null;
    key = typeof body?.key === "string" ? body.key : "";
  }
  if (!key) {
    return NextResponse.json({ error: "Missing card key." }, { status: 400 });
  }
  try {
    const cards = await deleteDashboardCard(key);
    await logAdminAction(admin, "dashboard-card.delete", key, request);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete the card." },
      { status: 500 },
    );
  }
}
