"use client";

import { formatDuration } from "../../lib/format.js";

export default function WeeklyChart({ weekly, todayKey }) {
  if (!weekly || weekly.length === 0) {
    return <Placeholder />;
  }

  const max = Math.max(60, ...weekly.map((d) => d.seconds)); // 60s floor avoids div-by-zero

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">This week</h3>
      <div className="mt-5 flex items-end gap-3 h-36">
        {weekly.map((d) => {
          const heightPct = Math.max(3, (d.seconds / max) * 100);
          const isToday = d.date === todayKey;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end">
                <div
                  className={
                    "w-full rounded-t-sm transition-[height] duration-500 " +
                    (isToday ? "bg-accent" : "bg-ink-600")
                  }
                  style={{ height: `${heightPct}%` }}
                  title={`${d.day}: ${formatDuration(d.seconds)}`}
                />
              </div>
              <span className={"text-xs " + (isToday ? "text-accent" : "text-zinc-500")}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">This week</h3>
      <p className="mt-4 text-sm text-zinc-600">No activity yet.</p>
    </div>
  );
}