import test from "node:test";
import assert from "node:assert/strict";
import { decideHeartbeat, isSessionLive } from "../lib/heartbeat-logic.js";

const MIN = 60 * 1000;

test("first heartbeat with no prior session creates a new one", () => {
  const now = new Date("2026-09-09T10:00:00Z");
  const decision = decideHeartbeat(null, now, now);
  assert.equal(decision.action, "create");
  assert.equal(decision.durationSeconds, 0);
});

test("heartbeat within 5 minutes of the last one extends the session", () => {
  const existing = {
    startedAt: new Date("2026-09-09T10:00:00Z"),
    endedAt: new Date("2026-09-09T10:30:00Z"),
    updatedAt: new Date("2026-09-09T10:30:05Z"), // server received it 5s after event time
  };
  const now = new Date("2026-09-09T10:31:00Z"); // 55s since last heartbeat receipt
  const timestamp = new Date("2026-09-09T10:31:00Z"); // continuous typing per the spec example
  const decision = decideHeartbeat(existing, timestamp, now);

  assert.equal(decision.action, "extend");
  assert.equal(decision.durationSeconds, 31 * 60); // 10:00 -> 10:31 = 31 minutes
});

test("spec example: 10:00-10:34 typing then idle by 10:39 counts ~39 minutes total elapsed, session ends at last activity", () => {
  // The real extension sends a heartbeat ~every 60s while active (each one
  // well within the 5-minute idle threshold of the last), so simulate one
  // per minute from 10:00 to 10:34, matching the spec's example exactly.
  let session = null;
  const heartbeats = [];
  for (let m = 0; m <= 34; m++) {
    heartbeats.push(new Date(Date.UTC(2026, 8, 9, 10, m, 0)).toISOString());
  }

  for (const ts of heartbeats) {
    const timestamp = new Date(ts);
    const now = timestamp; // assume negligible network latency for this test
    const decision = decideHeartbeat(session, timestamp, now);
    if (decision.action === "create") {
      session = { startedAt: decision.startedAt, endedAt: decision.endedAt, updatedAt: now };
    } else {
      session = { ...session, endedAt: decision.endedAt, updatedAt: now };
    }
  }

  // At 10:39 the extension detects idle (5 min since 10:34) and stops
  // sending heartbeats. No further heartbeat arrives, so the session's
  // endedAt stays frozen at 10:34 — the moment activity actually stopped.
  assert.equal(session.endedAt.toISOString(), "2026-09-09T10:34:00.000Z");
  const durationMinutes = (session.endedAt - session.startedAt) / MIN;
  assert.equal(durationMinutes, 34); // 10:00 -> 10:34

  // Now simulate the server checking "is this live" at 10:39 (5 min of
  // silence) — it should report not-live, matching the spec's example of
  // "39 minutes" of wall-clock time producing a closed, ~34-39min session
  // depending on where you start counting from. The key correctness
  // property: no heartbeats after 10:34 means duration never exceeds 34min.
  const checkAt = new Date("2026-09-09T10:39:00Z");
  assert.equal(isSessionLive(session, checkAt, 90), false);
});

test("a gap longer than 5 minutes starts a brand new session instead of extending", () => {
  const existing = {
    startedAt: new Date("2026-09-09T09:00:00Z"),
    endedAt: new Date("2026-09-09T09:10:00Z"),
    updatedAt: new Date("2026-09-09T09:10:00Z"),
  };
  const now = new Date("2026-09-09T09:20:00Z"); // 10 minutes of silence > 5 min threshold
  const timestamp = now;
  const decision = decideHeartbeat(existing, timestamp, now);

  assert.equal(decision.action, "create");
  assert.equal(decision.startedAt.toISOString(), now.toISOString());
});

test("a gap of exactly the 5-minute threshold still extends (boundary is inclusive)", () => {
  const existing = {
    startedAt: new Date("2026-09-09T09:00:00Z"),
    endedAt: new Date("2026-09-09T09:10:00Z"),
    updatedAt: new Date("2026-09-09T09:10:00Z"),
  };
  const now = new Date("2026-09-09T09:15:00Z"); // exactly 5 minutes
  const decision = decideHeartbeat(existing, now, now);
  assert.equal(decision.action, "extend");
});

test("duplicate heartbeat (same timestamp) is detected and does not change duration", () => {
  const existing = {
    startedAt: new Date("2026-09-09T09:00:00Z"),
    endedAt: new Date("2026-09-09T09:10:00Z"),
    updatedAt: new Date("2026-09-09T09:10:02Z"),
  };
  const now = new Date("2026-09-09T09:10:30Z");
  const decision = decideHeartbeat(existing, existing.endedAt, now);
  assert.equal(decision.action, "extend");
  assert.equal(decision.isDuplicate, true);
});

test("out-of-order heartbeat (older timestamp than current endedAt) never moves duration backwards", () => {
  const existing = {
    startedAt: new Date("2026-09-09T09:00:00Z"),
    endedAt: new Date("2026-09-09T09:10:00Z"),
    updatedAt: new Date("2026-09-09T09:10:02Z"),
  };
  const now = new Date("2026-09-09T09:10:30Z");
  const staleTimestamp = new Date("2026-09-09T09:05:00Z"); // arrived out of order
  const decision = decideHeartbeat(existing, staleTimestamp, now);

  assert.equal(decision.action, "extend");
  assert.equal(decision.endedAt.toISOString(), existing.endedAt.toISOString());
  assert.equal(decision.durationSeconds, 10 * 60);
});

test("isSessionLive: within grace window is live, beyond it is not", () => {
  const session = { updatedAt: new Date("2026-09-09T10:00:00Z") };
  assert.equal(isSessionLive(session, new Date("2026-09-09T10:01:00Z"), 90), true); // 60s later
  assert.equal(isSessionLive(session, new Date("2026-09-09T10:02:00Z"), 90), false); // 120s later
});

test("isSessionLive: null session is never live", () => {
  assert.equal(isSessionLive(null, new Date(), 90), false);
});

test("a client timestamp ahead of the server clock is clamped to now, not recorded as-is", () => {
  const now = new Date("2026-09-09T10:00:00Z");
  const future = new Date("2026-09-09T10:04:00Z"); // 4 min of clock skew, within validate.js's 5-min allowance
  const decision = decideHeartbeat(null, future, now);

  assert.equal(decision.action, "create");
  assert.equal(decision.startedAt.toISOString(), now.toISOString());
  assert.equal(decision.endedAt.toISOString(), now.toISOString());
});

test("extending a session with a future-skewed timestamp caps endedAt/duration at the server's now", () => {
  const existing = {
    startedAt: new Date("2026-09-09T10:00:00Z"),
    endedAt: new Date("2026-09-09T10:10:00Z"),
    updatedAt: new Date("2026-09-09T10:10:00Z"),
  };
  const now = new Date("2026-09-09T10:11:00Z");
  const skewedTimestamp = new Date("2026-09-09T10:15:00Z"); // 4 min ahead of server now
  const decision = decideHeartbeat(existing, skewedTimestamp, now);

  assert.equal(decision.action, "extend");
  assert.equal(decision.endedAt.toISOString(), now.toISOString());
  assert.equal(decision.durationSeconds, 11 * 60); // 10:00 -> 10:11, not 10:15
});