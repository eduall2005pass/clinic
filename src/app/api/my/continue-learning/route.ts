import { NextRequest, NextResponse } from "next/server";
import { getFirebaseUser } from "@/lib/auth-api";
import { isMysqlConfigured } from "@/lib/mysql";
import { getContinueLearningItems } from "@/lib/my-learning";

export const dynamic = "force-dynamic";

/** In-progress learning items for the Continue Learning dashboard page. */
export async function GET(request: NextRequest) {
  const user = await getFirebaseUser(request);
  if (!user || !isMysqlConfigured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const items = await getContinueLearningItems(user.uid);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load your continue-learning data." },
      { status: 500 },
    );
  }
}
