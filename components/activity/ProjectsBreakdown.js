"use client";

import { formatDuration, formatProjectName } from "../../lib/format.js";

export default function ProjectsBreakdown({ projects }) {
  const rows = (projects || []).slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.seconds));

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">Projects</h3>
      <p className="mt-0.5 text-xs text-zinc-600">Last 30 days</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No activity yet.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.project} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-zinc-300">
                {formatProjectName(r.project)}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.max(4, (r.seconds / max) * 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500">
                {formatDuration(r.seconds)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
