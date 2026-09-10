"use client";

import { usePolling } from "./usePolling.js";
import WeeklyChart from "./WeeklyChart.js";
import LanguagesBreakdown from "./LanguagesBreakdown.js";
import ProjectsBreakdown from "./ProjectsBreakdown.js";
import StreakBadge from "./StreakBadge.js";
import ActivityHeatmap from "./ActivityHeatmap.js";

// Stats change far less often than "current status" — poll once a minute
// rather than every 30s to keep this cheap.
export default function StatsPanels() {
  const { data } = usePolling("/api/coding/stats", 60000);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <WeeklyChart weekly={data?.weekly} />
        </div>
        <StreakBadge streakDays={data?.streakDays} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LanguagesBreakdown languages={data?.languages} />
        <ProjectsBreakdown projects={data?.projects} />
      </div>

      <ActivityHeatmap heatmap={data?.heatmap} />
    </>
  );
}
