"use client";

// Small, reusable "● Coding now / 5h 42m today" indicator meant to be
// dropped into the homepage or a site header — independent of the full
// /activity dashboard. Import it anywhere in the app:
//
//   import CodingStatusWidget from "@/components/activity/CodingStatusWidget.js";
//   <CodingStatusWidget />
//
// It's self-contained (fetches its own data, polls independently) so it
// can safely sit outside the /activity route tree.

import { usePolling } from "./usePolling.js";
import { formatDuration } from "../../lib/format.js";

export default function CodingStatusWidget({ className = "" }) {
  const { data, loading } = usePolling("/api/coding/current", 45000);

  if (loading && !data) return null; // avoid a layout flash on first paint

  const active = data?.active;

  return (
    <a
      href="/activity"
      className={
        "inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-ink-600 " +
        className
      }
    >
      <span
        className={
          "h-1.5 w-1.5 rounded-full " + (active ? "bg-accent pulse-dot" : "bg-zinc-600")
        }
      />
      <span>{active ? "Coding now" : "Not coding"}</span>
      <span className="text-zinc-600">·</span>
      <span className="font-mono tabular-nums text-zinc-300">
        {formatDuration(data?.todaySeconds)} today
      </span>
    </a>
  );
}
