"use client";

import { usePolling } from "./usePolling.js";
import { formatDuration, formatLanguage, formatProjectName } from "../../lib/format.js";

function formatTimeRange(startedAt, endedAt) {
  const opts = { hour: "2-digit", minute: "2-digit" };
  const start = new Date(startedAt).toLocaleTimeString([], opts);
  const end = new Date(endedAt).toLocaleTimeString([], opts);
  return `${start} – ${end}`;
}

export default function TodaySessions() {
  const { data, loading } = usePolling("/api/coding/today", 60000);
  const sessions = data?.sessions || [];

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <h3 className="text-sm text-zinc-400">Today's sessions</h3>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No sessions yet today.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ink-700">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-200">
                  {formatProjectName(s.project)}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatLanguage(s.language)} · {formatTimeRange(s.startedAt, s.endedAt)}
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-400">
                {formatDuration(s.durationSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
