const vscode = require("vscode");

/**
 * Reads extension settings, preferring an environment variable for the
 * token so it's never accidentally committed inside VS Code's settings.json
 * (which people do sometimes sync/share).
 */
function getConfig() {
  const cfg = vscode.workspace.getConfiguration("modred");

  const apiUrl = (cfg.get("apiUrl") || "http://localhost:3000").replace(/\/+$/, "");
  const token = process.env.MODRED_TRACKER_TOKEN || cfg.get("apiToken") || "";
  const dashboardUrl = cfg.get("dashboardUrl") || `${apiUrl}/activity`;
  const idleThresholdMinutes = Number(cfg.get("idleThresholdMinutes")) || 5;
  const heartbeatIntervalSeconds = Number(cfg.get("heartbeatIntervalSeconds")) || 60;

  return {
    apiUrl,
    token,
    dashboardUrl,
    idleThresholdMinutes,
    heartbeatIntervalSeconds,
  };
}

module.exports = { getConfig };
