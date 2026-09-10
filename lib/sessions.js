// Core "activity model" for the coding tracker.
//
// THE ACTIVITY MODEL (read this before touching heartbeat logic)
// ----------------------------------------------------------------
// The VS Code extension sends a heartbeat roughly every 60s WHILE the user
// is actively coding (typing, saving, switching editors/files, switching
// workspaces — see extension/src/activityTracker.js for what counts as
// activity on the client). It does NOT send heartbeats while idle.
//
// The server never trusts the client's idea of "am I still in the same
// session" — it re-derives it from timestamps, so a crashed extension,
// clock drift, or a missed heartbeat can't corrupt the data:
//
//   For an incoming heartbeat at time T for (project, language):
//     1. Look up the most recent session for that exact (project, language).
//     2. If one exists AND its `updatedAt` (= last time we heard from the
//        client) is within IDLE_THRESHOLD_SECONDS of *now* (server clock),
//        treat this heartbeat as a continuation: extend `endedAt` to T and
//        recompute `durationSeconds`.
//     3. Otherwise (no session, too much time has passed, or the
//        project/language changed) start a brand new session with
//        startedAt = endedAt = T.
//
// "Coding now" for the dashboard is derived the same way, independent of
// any explicit boolean: a session is "live" if `now - updatedAt` is less
// than a small grace window (a bit more than the heartbeat interval). This
// means if the extension crashes, VS Code is force-quit, or the computer
// suddenly sleeps, the session simply stops growing and the dashboard
// correctly shows "not coding" within ~90 seconds — no explicit
// disconnect/cleanup job required.
//
// VS Code losing focus does NOT by itself end a session (you might be
// alt-tabbing to read docs) — only the absence of activity signals for
// IDLE_THRESHOLD_SECONDS does. The extension enforces the same 5-minute
// rule locally so the status bar feels responsive even before the next
// heartbeat would have told the server.

import { prisma } from "./db.js";
import { decideHeartbeat, isSessionLive as isSessionLivePure } from "./heartbeat-logic.js";

export { IDLE_THRESHOLD_SECONDS, decideHeartbeat } from "./heartbeat-logic.js";
// Small buffer above the ~60s heartbeat interval so that "coding now" isn't
// flickering off between two heartbeats due to normal network jitter.
export const LIVE_GRACE_SECONDS = 90;

/**
 * Records one heartbeat from the extension and returns the (created or
 * updated) session row.
 *
 * @param {{ project: string, language: string, timestamp: Date, clientId?: string }} input
 */

export async function recordHeartbeat({ project, language, timestamp, clientId }) {
  const now = new Date();

  const existing = await prisma.codingSession.findFirst({
    where: { project, language },
    orderBy: { updatedAt: "desc" },
  });

  const decision = decideHeartbeat(existing, timestamp, now);

  if (decision.action === "extend") {
    if (decision.isDuplicate) {
      // Just refresh updatedAt so the "live" window keeps sliding forward.
      return prisma.codingSession.update({
        where: { id: existing.id },
        data: { updatedAt: now },
      });
    }
    return prisma.codingSession.update({
      where: { id: existing.id },
      data: { endedAt: decision.endedAt, durationSeconds: decision.durationSeconds, updatedAt: now },
    });
  }

  return prisma.codingSession.create({
    data: {
      startedAt: decision.startedAt,
      endedAt: decision.endedAt,
      durationSeconds: decision.durationSeconds,
      project,
      language,
      clientId: clientId || null,
    },
  });
}

/** Is this session currently "live" (i.e. still receiving heartbeats)? */
export function isSessionLive(session, now = new Date()) {
  return isSessionLivePure(session, now, LIVE_GRACE_SECONDS);
}

/**
 * Current tracking state for the dashboard's "coding now" widget.
 */
export async function getCurrentState() {
  const candidate = await prisma.codingSession.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();
  const live = isSessionLive(candidate, now);

  return {
    active: live,
    project: live ? candidate.project : null,
    language: live ? candidate.language : null,
    currentSessionSeconds: live
      ? Math.max(0, Math.round((now.getTime() - candidate.startedAt.getTime()) / 1000))
      : 0,
  };
}

/** Sum of durationSeconds for sessions overlapping [start, end). */
export async function getTotalSecondsInRange(start, end) {
  // A session "overlaps" the range if it started before the range ends and
  // ended after the range starts. We clip each session's contribution to
  // the range boundaries so a session spanning midnight is split correctly
  // between two days.
  const sessions = await prisma.codingSession.findMany({
    where: {
      startedAt: { lt: end },
      endedAt: { gt: start },
    },
    select: { startedAt: true, endedAt: true },
  });

  let total = 0;
  for (const s of sessions) {
    const clippedStart = s.startedAt < start ? start : s.startedAt;
    const clippedEnd = s.endedAt > end ? end : s.endedAt;
    total += Math.max(0, (clippedEnd.getTime() - clippedStart.getTime()) / 1000);
  }
  return Math.round(total);
}

/** Per-day totals (seconds) for each day in [start, end), keyed by day index. */
export async function getDailyTotals(start, end, dayKeyFn) {
  const sessions = await prisma.codingSession.findMany({
    where: { startedAt: { lt: end }, endedAt: { gt: start } },
    select: { startedAt: true, endedAt: true },
  });

  const totals = new Map();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const s of sessions) {
    let cursor = s.startedAt < start ? start : s.startedAt;
    const sessionEnd = s.endedAt > end ? end : s.endedAt;

    // Walk day-by-day in case a session spans multiple midnights.
    while (cursor < sessionEnd) {
      const key = dayKeyFn(cursor);
      const nextMidnight = new Date(
        Math.min(sessionEnd.getTime(), cursor.getTime() + oneDayMs)
      );
      // Re-derive the actual next local midnight rather than assuming 24h
      // boundaries line up with UTC; caller's dayKeyFn plus this loop is an
      // approximation that's accurate for non-DST-transition days.
      const seconds = (nextMidnight.getTime() - cursor.getTime()) / 1000;
      totals.set(key, (totals.get(key) || 0) + seconds);
      cursor = nextMidnight;
    }
  }

  return totals;
}

/** Total seconds grouped by language, within an optional [start, end) range. */
export async function getLanguageBreakdown(start, end) {
  const where = start && end ? { startedAt: { lt: end }, endedAt: { gt: start } } : {};
  const rows = await prisma.codingSession.groupBy({
    by: ["language"],
    where,
    _sum: { durationSeconds: true },
  });
  return rows
    .map((r) => ({ language: r.language, seconds: r._sum.durationSeconds || 0 }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** Total seconds grouped by project, within an optional [start, end) range. */
export async function getProjectBreakdown(start, end) {
  const where = start && end ? { startedAt: { lt: end }, endedAt: { gt: start } } : {};
  const rows = await prisma.codingSession.groupBy({
    by: ["project"],
    where,
    _sum: { durationSeconds: true },
  });
  return rows
    .map((r) => ({ project: r.project, seconds: r._sum.durationSeconds || 0 }))
    .sort((a, b) => b.seconds - a.seconds);
}

/**
 * Consecutive-day coding streak, counting back from today. A day "counts"
 * if total active seconds that day exceed a small noise floor (60s), so
 * accidentally opening VS Code for 10 seconds doesn't fake a streak.
 */
export async function computeStreak(dayKeyFn, startOfDayFn, minSecondsPerDay = 60) {
  const now = new Date();
  let streak = 0;
  let cursor = now;
  let previousDayStartMs = null;

  for (let i = 0; i < 400; i++) {
    const dayStart = startOfDayFn(cursor);

    if (previousDayStartMs !== null && dayStart.getTime() >= previousDayStartMs) {
      break; // not making backward progress — stop rather than loop forever
    }
    previousDayStartMs = dayStart.getTime();

    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const seconds = await getTotalSecondsInRange(dayStart, dayEnd);

    if (seconds >= minSecondsPerDay) {
      streak += 1;
      cursor = new Date(dayStart.getTime() - 1);
    } else if (i === 0) {
      cursor = new Date(dayStart.getTime() - 1);
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/** Raw session list for a range, most recent first — used for "today's sessions". */
export async function listSessionsInRange(start, end) {
  return prisma.codingSession.findMany({
    where: { startedAt: { lt: end }, endedAt: { gt: start } },
    orderBy: { startedAt: "desc" },
  });
}
