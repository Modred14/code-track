import { NextResponse } from "next/server";
import { getTodayBounds } from "../../../../lib/timezone.js";
import { getTotalSecondsInRange, listSessionsInRange } from "../../../../lib/sessions.js";

// GET /api/coding/today
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { start, end } = getTodayBounds();
    const [totalSeconds, sessions] = await Promise.all([
      getTotalSecondsInRange(start, end),
      listSessionsInRange(start, end),
    ]);

    return NextResponse.json({
      totalSeconds,
      sessions: sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds: s.durationSeconds,
        project: s.project,
        language: s.language,
      })),
    });
  } catch (err) {
    console.error("[today] failed:", err);
    return NextResponse.json({ error: "Failed to load today's activity." }, { status: 503 });
  }
}
