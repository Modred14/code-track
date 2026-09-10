"use client";

import { formatDuration, formatLanguage } from "../../lib/format.js";

export default function LanguagesBreakdown({ languages }) {
  const rows = (languages || []).slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.seconds));

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">Languages</h3>
      <p className="mt-0.5 text-xs text-zinc-600">Last 30 days</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No activity yet.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.language} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-zinc-300">
                {formatLanguage(r.language)}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-accent"
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
