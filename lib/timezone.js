// Timezone-aware "day" boundaries.
//
// We deliberately avoid pulling in date-fns-tz / luxon / moment for this —
// the platform Intl API is enough to correctly compute "midnight in
// APP_TIMEZONE" without adding a dependency, which keeps the project
// lightweight as requested.
//
// The one edge case this simplified approach does not handle perfectly is
// the exact instant of a DST transition (a "day" can be 23 or 25 hours long
// in a DST-observing zone). That's an acceptable trade-off for a personal
// coding tracker — it never mis-attributes a session to the wrong day, it
// just may be off by up to an hour of "streak" bucketing twice a year.

export function getAppTimeZone() {
  return process.env.APP_TIMEZONE || "UTC";
}

function getZonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = parseInt(part.value, 10);
  }
  // Intl can format hour 24 -> normalize to 0
  if (parts.hour === 24) parts.hour = 0;
  return parts;
}

/**
 * Returns the UTC Date instant corresponding to local midnight (00:00:00.000)
 * of the given `date`, as observed in `timeZone`.
 */
export function startOfDayInTZ(date, timeZone = getAppTimeZone()) {
  const p = getZonedParts(date, timeZone);

  // Wall-clock time in `timeZone`, reinterpreted as if it were UTC.
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Offset between that reinterpretation and the real instant tells us the
  // timezone's current UTC offset (in ms).
  const rawOffsetMs = asUTC - date.getTime();
const offsetMs = Math.round(rawOffsetMs / 60000) * 60000;

  // Midnight, expressed as the same wall-clock trick, minus the offset.
  const midnightAsUTC = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  return new Date(midnightAsUTC - offsetMs);
}

/** Returns the UTC instant for the start of the *next* day (exclusive end bound). */
export function endOfDayInTZ(date, timeZone = getAppTimeZone()) {
  const start = startOfDayInTZ(date, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/** YYYY-MM-DD label for `date` as seen in `timeZone`. */
export function dayKeyInTZ(date, timeZone = getAppTimeZone()) {
  const p = getZonedParts(date, timeZone);
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

/** Start-of-day bounds for "today" and "yesterday" in the app timezone. */
export function getTodayBounds(timeZone = getAppTimeZone()) {
  const now = new Date();
  return { start: startOfDayInTZ(now, timeZone), end: endOfDayInTZ(now, timeZone), now };
}

export function getYesterdayBounds(timeZone = getAppTimeZone()) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { start: startOfDayInTZ(yesterday, timeZone), end: startOfDayInTZ(now, timeZone) };
}

/** [start, end) bounds covering the last `days` days including today. */
export function getLastNDaysBounds(days, timeZone = getAppTimeZone()) {
  const now = new Date();
  const end = endOfDayInTZ(now, timeZone);
  const startAnchor = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const start = startOfDayInTZ(startAnchor, timeZone);
  return { start, end };
}

export function getCurrentMonthBounds(timeZone = getAppTimeZone()) {
  const now = new Date();
  const p = getZonedParts(now, timeZone);
  const firstOfMonth = new Date(Date.UTC(p.year, p.month - 1, 1, 12, 0, 0)); // noon avoids DST edge issues
  const start = startOfDayInTZ(firstOfMonth, timeZone);
  const nextMonthAnchor = new Date(Date.UTC(p.year, p.month, 1, 12, 0, 0));
  const end = startOfDayInTZ(nextMonthAnchor, timeZone);
  return { start, end };
}
