import { NextResponse } from "next/server";
import {
  getAppTimeZone,
  startOfDayInTZ,
  dayKeyInTZ,
  getLastNDaysBounds,
  getCurrentMonthBounds,
} from "../../../../lib/timezone.js";
import {
  getTotalSecondsInRange,
  getDailyTotals,
  getLanguageBreakdown,
  getProjectBreakdown,
  computeStreak,
} from "../../../../lib/sessions.js";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoWeekday(date, timeZone) {
  // Monday = 0 ... Sunday = 6, computed from the day key so it respects TZ.
  const key = dayKeyInTZ(date, timeZone); // YYYY-MM-DD
  const [y, m, d] = key.split("-").map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return (utcDay + 6) % 7; // 0=Mon..6=Sun
}

// GET /api/coding/stats
// Public read-only aggregate endpoint for the dashboard.
export async function GET() {
  try {
    const timeZone = getAppTimeZone();

    // --- This calendar week (Mon-Sun) ---
    const now = new Date();
    const todayWeekdayIdx = isoWeekday(now, timeZone);
    const mondayAnchor = new Date(now.getTime() - todayWeekdayIdx * 24 * 60 * 60 * 1000);
    const weekStart = startOfDayInTZ(mondayAnchor, timeZone);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dailyTotalsMap = await getDailyTotals(weekStart, weekEnd, (d) => dayKeyInTZ(d, timeZone));
    const weekly = WEEKDAY_LABELS.map((label, idx) => {
      const dayDate = new Date(weekStart.getTime() + idx * 24 * 60 * 60 * 1000);
      const key = dayKeyInTZ(dayDate, timeZone);
      return { day: label, date: key, seconds: Math.round(dailyTotalsMap.get(key) || 0) };
    });

    // --- Last 30 days totals + languages/projects breakdown ---
    const last7 = getLastNDaysBounds(7, timeZone);
    const last30 = getLastNDaysBounds(30, timeZone);
    const currentMonth = getCurrentMonthBounds(timeZone);

    const [
      last7Seconds,
      last30Seconds,
      monthSeconds,
      allTimeSeconds,
      languages,
      projects,
      streak,
    ] = await Promise.all([
      getTotalSecondsInRange(last7.start, last7.end),
      getTotalSecondsInRange(last30.start, last30.end),
      getTotalSecondsInRange(currentMonth.start, currentMonth.end),
      getTotalSecondsInRange(new Date(0), new Date(Date.now() + 24 * 60 * 60 * 1000)),
      getLanguageBreakdown(last30.start, last30.end),
      getProjectBreakdown(last30.start, last30.end),
      computeStreak(
        (d) => dayKeyInTZ(d, timeZone),
        (d) => startOfDayInTZ(d, timeZone)
      ),
    ]);

    // --- Heatmap: last ~182 days (GitHub-style) ---
    const heatmapRange = getLastNDaysBounds(182, timeZone);
    const heatmapTotals = await getDailyTotals(heatmapRange.start, heatmapRange.end, (d) =>
      dayKeyInTZ(d, timeZone)
    );
    const heatmap = [];
    for (let i = 0; i < 182; i++) {
      const d = new Date(heatmapRange.start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = dayKeyInTZ(d, timeZone);
      heatmap.push({ date: key, seconds: Math.round(heatmapTotals.get(key) || 0) });
    }

    return NextResponse.json({
      timeZone,
      weekly,
      totals: {
        last7Seconds,
        last30Seconds,
        currentMonthSeconds: monthSeconds,
        allTimeSeconds,
      },
      streakDays: streak,
      languages,
      projects,
      heatmap,
    });
  } catch (err) {
    console.error("[stats] failed:", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 503 });
  }
}
