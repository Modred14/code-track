const vscode = require("vscode");
const os = require("os");
const { getConfig } = require("./src/config");
const { StatusBar } = require("./src/statusBar");
const { OfflineQueue } = require("./src/offlineQueue");
const { ActivityTracker } = require("./src/activityTracker");

let tracker = null;
let statusBar = null;

function activate(context) {
  const config = getConfig();
  statusBar = new StatusBar();
  context.subscriptions.push(statusBar);

  const offlineQueue = new OfflineQueue(context.globalStorageUri.fsPath);
  const clientId = `${os.hostname()}`;

  tracker = new ActivityTracker({ config, statusBar, offlineQueue, clientId });
  tracker.start();
  context.subscriptions.push({ dispose: () => tracker.dispose() });

  context.subscriptions.push(
    vscode.commands.registerCommand("modred.showTodayTime", async () => {
      const cfg = getConfig();
      try {
        const res = await fetch(`${cfg.apiUrl}/api/coding/current`, { method: "GET" });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        const hours = Math.floor((data.todaySeconds || 0) / 3600);
        const minutes = Math.floor(((data.todaySeconds || 0) % 3600) / 60);
        vscode.window.showInformationMessage(
          `Modred: ${hours}h ${String(minutes).padStart(2, "0")}m coded today.` +
            (data.active ? ` Currently coding on ${data.project} (${data.language}).` : "")
        );
      } catch (err) {
        vscode.window.showWarningMessage(
          `Modred: couldn't reach the tracker API (${err.message}). Local tracking continues offline.`
        );
      }
    }),

    vscode.commands.registerCommand("modred.startTracking", () => {
      if (tracker) tracker.start();
      vscode.window.showInformationMessage("Modred: tracking started.");
    }),

    vscode.commands.registerCommand("modred.stopTracking", () => {
      if (tracker) tracker.stop();
      vscode.window.showInformationMessage("Modred: tracking stopped.");
    }),

    vscode.commands.registerCommand("modred.openDashboard", () => {
      const cfg = getConfig();
      vscode.env.openExternal(vscode.Uri.parse(cfg.dashboardUrl));
    })
  );
}

function deactivate() {
  if (tracker) tracker.dispose();
}

module.exports = { activate, deactivate };
