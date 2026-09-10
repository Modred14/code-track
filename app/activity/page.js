import CurrentStatus from "../../components/activity/CurrentStatus.js";
import TodayTotal from "../../components/activity/TodayTotal.js";
import TodaySessions from "../../components/activity/TodaySessions.js";
import StatsPanels from "../../components/activity/StatsPanels.js";

export const dynamic = "force-dynamic";

export default function ActivityPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-10">
        <p className="text-sm text-zinc-500">Modred</p>
        <h1 className="mt-1 text-2xl font-medium text-zinc-50">Coding activity</h1>
      </header>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrentStatus />
          <TodayTotal />
        </div>

        <StatsPanels />

        <TodaySessions />
      </div>

      <footer className="mt-16 text-xs text-zinc-700">
        Updated automatically every 30–60 seconds.
      </footer>
    </main>
  );
}
