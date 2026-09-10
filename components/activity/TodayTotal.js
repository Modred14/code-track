"use client";

import { usePolling } from "./usePolling.js";
import { formatDuration } from "../../lib/format.js";

export default function TodayTotal() {
  const { data, loading } = usePolling("/api/coding/current", 30000);

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <div className="font-mono text-4xl font-medium tabular-nums text-zinc-50">
        {loading ? "—" : formatDuration(data?.todaySeconds)}
      </div>
      <div className="mt-2 text-sm text-zinc-500">Coding today</div>
    </div>
  );
}
