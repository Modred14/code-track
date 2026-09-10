"use client";

export default function StreakBadge({ streakDays }) {
  const days = streakDays || 0;

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-card">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{days > 0 ? "🔥" : "—"}</span>
        <div>
          <div className="font-mono text-2xl font-medium tabular-nums text-zinc-50">
            {days}
          </div>
          <div className="text-sm text-zinc-500">{days === 1 ? "day streak" : "days streak"}</div>
        </div>
      </div>
    </div>
  );
}