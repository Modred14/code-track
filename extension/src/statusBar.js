const vscode = require("vscode");

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

class StatusBar {
  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "modred.showTodayTime";
    this.item.show();
    this.setStarting();
  }

  setStarting() {
    this.item.text = "$(clock) Modred";
    this.item.tooltip = "Modred Coding Tracker — starting up";
  }

  setActive(sessionSeconds, todaySeconds) {
    this.item.text = `$(pulse) Coding · ${formatDuration(sessionSeconds)}`;
    this.item.tooltip = `Modred — ${formatDuration(todaySeconds)} today (click for details)`;
  }

  setIdle(todaySeconds) {
    this.item.text = `$(circle-slash) Idle`;
    this.item.tooltip = `Modred — ${formatDuration(todaySeconds)} today (click for details)`;
  }

  setStopped() {
    this.item.text = `$(debug-pause) Modred stopped`;
    this.item.tooltip = "Modred Coding Tracker is paused. Run 'Modred: Start Tracking' to resume.";
  }

  setOffline(queuedCount) {
    this.item.text = `$(cloud-offline) Modred (offline${queuedCount ? `, ${queuedCount} queued` : ""})`;
    this.item.tooltip = "Can't reach the tracker API. Activity is being saved locally and will sync once it's back.";
  }

  dispose() {
    this.item.dispose();
  }
}

module.exports = { StatusBar, formatDuration };
