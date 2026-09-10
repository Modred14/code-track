// Pure decision logic for turning heartbeats into sessions. No I/O, no
// Prisma import — this is what makes the 5-minute idle rule unit-testable
// without spinning up a database. See lib/sessions.js for the big-picture
// explanation of the activity model.

export const IDLE_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

/**
 * @param {{ startedAt: Date, endedAt: Date, updatedAt: Date } | null} existing
 *   Most recent session for this exact (project, language), or null.
 * @param {Date} timestamp - activity time reported by the client
 * @param {Date} now - server clock at receipt time
 * @returns
 *   { action: "extend", endedAt, durationSeconds, isDuplicate } — continue
 *     the existing session, or
 *   { action: "create", startedAt, endedAt, durationSeconds } — start a new
 *     session (idle gap exceeded, or no prior session).
 */
export function decideHeartbeat(existing, timestamp, now) {
  // The validation layer allows a client timestamp up to 5 minutes ahead of
  // the server clock (to tolerate ordinary clock skew), but nothing here
  // should ever record a session that ends in the future — that would
  // inflate today's total and current-session duration until real time
  // catches up. Clamp to `now` before doing anything else with it.
  const clampedTimestamp = timestamp > now ? now : timestamp;

  const gapMs = existing ? now.getTime() - existing.updatedAt.getTime() : Infinity;
  const withinThreshold = gapMs <= IDLE_THRESHOLD_SECONDS * 1000;

  if (existing && withinThreshold) {
    // Never move endedAt backwards (guards against out-of-order/duplicate
    // heartbeats caused by client retries or clock skew).
    const newEndedAt = clampedTimestamp > existing.endedAt ? clampedTimestamp : existing.endedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((newEndedAt.getTime() - existing.startedAt.getTime()) / 1000)
    );
    const isDuplicate = newEndedAt.getTime() === existing.endedAt.getTime();

    return { action: "extend", endedAt: newEndedAt, durationSeconds, isDuplicate };
  }

  return {
    action: "create",
    startedAt: clampedTimestamp,
    endedAt: clampedTimestamp,
    durationSeconds: 0,
  };
}

/** Is this session currently "live" (i.e. still receiving heartbeats)? */
export function isSessionLive(session, now, liveGraceSeconds) {
  if (!session) return false;
  const ageMs = now.getTime() - session.updatedAt.getTime();
  return ageMs <= liveGraceSeconds * 1000;
}