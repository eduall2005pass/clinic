import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { isMysqlConfigured } from "@/lib/mysql";
import {
  fetchHomeCards,
  addHomeCard,
  updateHomeCard,
  deleteHomeCard,
  HOME_CARD_SECTIONS,
} from "@/lib/home-cards";

export const dynamic = "force-dynamic";

function isSection(value: unknown): value is (typeof HOME_CARD_SECTIONS)[number] {
  return (
    typeof value === "string" &&
    (HOME_CARD_SECTIONS as readonly string[]).includes(value)
  );
}

/** GET → ?section=why|success (omit for all sections, admin view). */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const sectionParam = request.nextUrl.searchParams.get("section");
  if (isSection(sectionParam)) {
    return NextResponse.json(
      { cards: await fetchHomeCards(sectionParam) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const [why, success] = await Promise.all([
    fetchHomeCards("why"),
    fetchHomeCards("success"),
  ]);
  return NextResponse.json(
    { cards: [...why, ...success] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST → add a card: { section, title, description?, value?, icon? }. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isMysqlConfigured) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const section = isSection(body?.section) ? body.section : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!section) {
    return NextResponse.json(
      { error: "Section must be 'why' or 'success'." },
      { status: 400 },
    );
  }
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json(
      { error: "Card title must be 2–120 characters." },
      { status: 400 },
    );
  }
  try {
    await addHomeCard({
      section,
      title,
      description:
        typeof body?.description === "string" ? body.description : undefined,
      value: typeof body?.value === "string" ? body.value : undefined,
      icon: typeof body?.icon === "string" ? body.icon : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to add the card." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { cards: await fetchHomeCards(section) },
    { status: 201 },
  );
}

/**
 * PATCH → update a card:
 * { key, title?, description?, value?, icon?, order?, isActive? }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "Missing card key." }, { status: 400 });
  }
  const updates: Parameters<typeof updateHomeCard>[1] = {};
  if (typeof body?.title === "string") updates.title = body.title.trim();
  if (typeof body?.description === "string")
    updates.description = body.description.trim();
  if (
    typeof body?.value === "string" ||
    body?.value === null
  )
    updates.value = body.value as string | null;
  if (typeof body?.icon === "string") updates.icon = body.icon;
  if (typeof body?.order === "number" && Number.isFinite(body.order))
    updates.order = Math.trunc(body.order);
  if (typeof body?.isActive === "boolean") updates.isActive = body.isActive;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  try {
    const ok = await updateHomeCard(key, updates);
    if (!ok) {
      return NextResponse.json(
        { error: "Unknown card or nothing changed." },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to update the card." },
      { status: 500 },
    );
  }
  const [why, success] = await Promise.all([
    fetchHomeCards("why"),
    fetchHomeCards("success"),
  ]);
  return NextResponse.json({ cards: [...why, ...success] });
}

/** DELETE → ?key=<card_key> */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const key = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!key) {
    return NextResponse.json({ error: "Missing card key." }, { status: 400 });
  }
  const ok = await deleteHomeCard(key);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to delete the card." },
      { status: 500 },
    );
  }
  const [why, success] = await Promise.all([
    fetchHomeCards("why"),
    fetchHomeCards("success"),
  ]);
  return NextResponse.json({ cards: [...why, ...success] });
}
