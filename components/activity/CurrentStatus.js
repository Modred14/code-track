"use client";

import { usePolling } from "./usePolling.js";
import { formatDurationLong, formatLanguage, formatProjectName } from "../../lib/format.js";

export default function CurrentStatus() {
  const { data, loading } = usePolling("/api/coding/current", 30000);

  const active = data?.active;

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span
          className={
            "h-2 w-2 rounded-full " +
            (active ? "bg-accent pulse-dot" : "bg-zinc-600")
          }
        />
        <span className="text-sm text-zinc-400">
          {loading ? "Checking status…" : active ? "Coding now" : "Not coding"}
        </span>
      </div>

      {active ? (
        <div className="mt-4 flex flex-col gap-1">
          <div className="font-mono text-4xl font-medium tabular-nums text-zinc-50">
            {formatDurationLong(data.currentSessionSeconds)}
          </div>
          <div className="mt-3 flex flex-col gap-0.5 text-sm">
            <span className="text-zinc-200">{formatLanguage(data.language)}</span>
            <span className="text-zinc-500">{formatProjectName(data.project)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-zinc-500">
          No active session. Open VS Code and start typing to begin tracking.
        </div>
      )}
    </div>
  );
}
