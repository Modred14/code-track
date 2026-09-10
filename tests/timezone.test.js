import test from "node:test";
import assert from "node:assert/strict";
import {
  startOfDayInTZ,
  endOfDayInTZ,
  dayKeyInTZ,
  getLastNDaysBounds,
} from "../lib/timezone.js";

test("startOfDayInTZ: Africa/Lagos (UTC+1) midnight maps to 23:00 UTC previous day", () => {
  // Sept 9 2026, 22:30 Lagos time -> should still be "Sept 9" in Lagos.
  const someInstant = new Date("2026-09-09T21:30:00.000Z"); // 22:30 in Lagos (UTC+1)
  const start = startOfDayInTZ(someInstant, "Africa/Lagos");
  assert.equal(start.toISOString(), "2026-09-08T23:00:00.000Z");
});

test("startOfDayInTZ: late-night coding does not roll into the wrong day (Lagos)", () => {
  // 23:50 Lagos time on Sept 9 -> local day should still be Sept 9.
  const lateNight = new Date("2026-09-09T22:50:00.000Z"); // 23:50 Lagos
  const key = dayKeyInTZ(lateNight, "Africa/Lagos");
  assert.equal(key, "2026-09-09");

  // 5 minutes later crosses into Sept 10 local time.
  const afterMidnight = new Date("2026-09-09T23:05:00.000Z"); // 00:05 Lagos, Sept 10
  const key2 = dayKeyInTZ(afterMidnight, "Africa/Lagos");
  assert.equal(key2, "2026-09-10");
});

test("endOfDayInTZ is exactly 24h after startOfDayInTZ", () => {
  const d = new Date("2026-01-15T12:00:00.000Z");
  const start = startOfDayInTZ(d, "America/New_York");
  const end = endOfDayInTZ(d, "America/New_York");
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});

test("dayKeyInTZ: UTC vs Lagos differ near midnight boundary", () => {
  const instant = new Date("2026-09-09T23:30:00.000Z");
  assert.equal(dayKeyInTZ(instant, "UTC"), "2026-09-09");
  assert.equal(dayKeyInTZ(instant, "Africa/Lagos"), "2026-09-10");
});

test("getLastNDaysBounds(7) spans exactly 7 local days", () => {
  const { start, end } = getLastNDaysBounds(7, "Africa/Lagos");
  const spanDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  assert.equal(spanDays, 7);
});
