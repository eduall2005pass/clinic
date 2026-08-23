import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { logAdminAction } from "@/lib/administration";
import {
  fetchPushSubscriptions,
  resolveStudentUidByEmail,
  sendPush,
} from "@/lib/push-admin";

export const dynamic = "force-dynamic";

/** Subscriber count for the admin page (?email=1 to preview a target's devices). */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (email && email.trim()) {
    const uid = await resolveStudentUidByEmail(email);
    if (!uid) {
      return NextResponse.json(
        { error: "No student found with that email." },
        { status: 404 },
      );
    }
    const subscriptions = await fetchPushSubscriptions(uid);
    return NextResponse.json({ count: subscriptions.length });
  }
  const subscriptions = await fetchPushSubscriptions();
  return NextResponse.json(
    { count: subscriptions.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Send a push notification.
 * Body: { title, body, url?, audience: "broadcast" | "specific", email? }
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "manageContent");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    body?: unknown;
    url?: unknown;
    audience?: unknown;
    email?: unknown;
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

  let targetUid: string | undefined;
  let targetEmail = "";
  if (body?.audience === "specific") {
    targetEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return NextResponse.json(
        { error: "A valid student email is required for a specific notification." },
        { status: 400 },
      );
    }
    try {
      targetUid = (await resolveStudentUidByEmail(targetEmail)) ?? undefined;
    } catch {
      targetUid = undefined;
    }
    if (!targetUid) {
      return NextResponse.json(
        { error: `No student registered with "${targetEmail}".` },
        { status: 404 },
      );
    }
  }

  try {
    const result = await sendPush({ title, body: text, url, targetUid });
    await logAdminAction(
      admin,
      "push.send",
      `audience=${targetUid ? `user:${targetEmail}` : "all"} sent=${result.sent} failed=${result.failed} title=${title}`,
      request,
    );
    return NextResponse.json({
      result,
      audience: targetUid ? `user:${targetEmail}` : "all",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send the notification.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
