import { NextResponse } from "next/server";
import { getCurrentState, getTotalSecondsInRange } from "../../../../lib/sessions.js";
import { getTodayBounds } from "../../../../lib/timezone.js";
import { PUBLIC_CORS_HEADERS, corsPreflightResponse } from "../../../../lib/cors.js";

// Without this, Next.js can statically render this GET handler at build
// time (it doesn't read cookies/headers/searchParams, so nothing signals
// dynamism automatically) and every request afterward would replay that
// frozen build-time snapshot — e.g. permanently showing 0 seconds even as
// real heartbeats land in the database.
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflightResponse();
}

// GET /api/coding/current
// Public read-only endpoint used by the dashboard (polled every 30-60s) and
// safe to fetch from any other website — see lib/cors.js for why.
// No auth required to READ your own public dashboard data — only the
// heartbeat endpoint (which WRITES data) requires the bearer token.
export async function GET() {
  try {
    const current = await getCurrentState();
    const { start, end } = getTodayBounds();
    const todaySeconds = await getTotalSecondsInRange(start, end);

    return NextResponse.json(
      {
        active: current.active,
        todaySeconds,
        currentSessionSeconds: current.currentSessionSeconds,
        project: current.project,
        language: current.language,
      },
      { headers: PUBLIC_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[current] failed:", err);
    return NextResponse.json(
      { error: "Failed to load current state." },
      { status: 503, headers: PUBLIC_CORS_HEADERS }
    );
  }
}