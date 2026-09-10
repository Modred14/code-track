"use client";

import { formatDuration } from "../../lib/format.js";

// Bucket thresholds (seconds) mapping to 5 shades, GitHub-style.
const BUCKETS = [0, 1, 30 * 60, 2 * 3600, 4 * 3600];
const SHADE_CLASSES = [
  "bg-ink-700",
  "bg-accent/25",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
];

function bucketFor(seconds) {
  let idx = 0;
  for (let i = 0; i < BUCKETS.length; i++) {
    if (seconds >= BUCKETS[i]) idx = i;
  }
  return idx;
}

export default function ActivityHeatmap({ heatmap }) {
  const days = heatmap || [];

  // Group into weeks (columns), Sunday-start doesn't matter much here since
  // we just want a dense grid — group sequentially in chunks of 7.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">Activity</h3>
      <p className="mt-0.5 text-xs text-zinc-600">Last {days.length || 182} days</p>

      <div className="mt-5 overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${formatDuration(d.seconds)}`}
                  className={`h-3 w-3 rounded-sm ${SHADE_CLASSES[bucketFor(d.seconds)]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
        <span>Less</span>
        {SHADE_CLASSES.map((c, i) => (
          <span key={i} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
