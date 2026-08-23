import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import {
  fetchAllPromotions,
  fetchActivePromotions,
  savePromotion,
  setPromotionActive,
  reorderPromotions,
  deletePromotion,
  type PromotionKind,
} from "@/lib/promotions";

export const dynamic = "force-dynamic";

function parseKind(request: NextRequest): PromotionKind | null {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "offers" ? "offer" : kind === "campaigns" ? "campaign" : null;
}

export async function GET(request: NextRequest) {
  const kind = parseKind(request);
  if (!kind) {
    return NextResponse.json({ error: "Unknown promotion kind." }, { status: 400 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const admin = await requirePermission(request, "manageContent");
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const promotions = await fetchAllPromotions(kind);
    return NextResponse.json(
      { promotions },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const promotions = await fetchActivePromotions(kind);
  return NextResponse.json(
    { promotions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Create or update a promotion. */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    id?: unknown;
    title?: unknown;
    description?: unknown;
    linkHref?: unknown;
    isActive?: unknown;
    startAt?: unknown;
    endAt?: unknown;
  } | null;

  const kind =
    body?.kind === "campaign"
      ? "campaign"
      : body?.kind === "offer"
        ? "offer"
        : null;
  if (!kind) {
    return NextResponse.json({ error: "Unknown promotion kind." }, { status: 400 });
  }
  if (typeof body?.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const promotions = await savePromotion({
      kind,
      id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined,
      title: body.title,
      description: typeof body.description === "string" ? body.description : null,
      linkHref: typeof body.linkHref === "string" ? body.linkHref : null,
      isActive:
        body.isActive === true || body.isActive === "true" || body.isActive === "1",
      startAt: typeof body.startAt === "string" ? body.startAt : null,
      endAt: typeof body.endAt === "string" ? body.endAt : null,
    });
    return NextResponse.json({ promotions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save the promotion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Toggle active status and/or change display order. */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    order?: unknown;
    updates?: unknown;
  } | null;

  const kind =
    body?.kind === "campaign"
      ? "campaign"
      : body?.kind === "offer"
        ? "offer"
        : null;
  if (!kind || !body) {
    return NextResponse.json({ error: "Unknown promotion kind." }, { status: 400 });
  }

  try {
    if (Array.isArray(body.updates)) {
      for (const raw of body.updates) {
        const entry = raw as Record<string, unknown>;
        if (typeof entry.id !== "string" || entry.id.length === 0) continue;
        if (typeof entry.isActive === "boolean") {
          await setPromotionActive(kind, entry.id, entry.isActive);
        }
      }
    }

    if (
      Array.isArray(body.order) &&
      body.order.every((item) => typeof item === "string")
    ) {
      await reorderPromotions(kind, body.order as string[]);
    }

    const promotions = await fetchAllPromotions(kind);
    return NextResponse.json({ promotions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update the promotions.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const kind = parseKind(request);
  if (!kind) {
    return NextResponse.json({ error: "Unknown promotion kind." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Missing promotion id." }, { status: 400 });
  }

  const promotions = await deletePromotion(kind, body.id);
  return NextResponse.json({ promotions });
}
