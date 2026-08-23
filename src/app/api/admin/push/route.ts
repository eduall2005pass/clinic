import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchPushSubscriptions,
  sendPushToAll,
} from "@/lib/push-admin";

export const dynamic = "force-dynamic";

/** Subscriber count for the admin page. */
export async function GET() {
  const subscriptions = await fetchPushSubscriptions();
  return NextResponse.json(
    { count: subscriptions.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Broadcast a push notification to every registered device. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    body?: unknown;
    url?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json(
      { error: "Title is required (2-120 characters)." },
      { status: 400 },
    );
  }
  if (text.length < 2 || text.length > 500) {
    return NextResponse.json(
      { error: "Message is required (2-500 characters)." },
      { status: 400 },
    );
  }
  const url =
    typeof body?.url === "string" && body.url.trim().startsWith("/")
      ? body.url.trim()
      : undefined;
  try {
    const result = await sendPushToAll({ title, body: text, url });
    await logAdminAction(
      admin,
      "push.send",
      `sent=${result.sent} failed=${result.failed} title=${title}`,
      request,
    );
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send the notification.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
