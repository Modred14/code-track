import { NextResponse } from "next/server";
import { getCurrentState, getTotalSecondsInRange } from "../../../../lib/sessions.js";
import { getTodayBounds } from "../../../../lib/timezone.js";

// GET /api/coding/current
// Public read-only endpoint used by the dashboard (polled every 30-60s).
// No auth required to READ your own public dashboard data — only the
// heartbeat endpoint (which WRITES data) requires the bearer token.
export async function GET() {
  try {
    const current = await getCurrentState();
    const { start, end } = getTodayBounds();
    const todaySeconds = await getTotalSecondsInRange(start, end);

    return NextResponse.json({
      active: current.active,
      todaySeconds,
      currentSessionSeconds: current.currentSessionSeconds,
      project: current.project,
      language: current.language,
    });
  } catch (err) {
    console.error("[current] failed:", err);
    return NextResponse.json({ error: "Failed to load current state." }, { status: 503 });
  }
}
