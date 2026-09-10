const vscode = require("vscode");
const { sendHeartbeat } = require("./apiClient");

/**
 * ACTIVITY MODEL (client side)
 * ----------------------------
 * These events count as "activity" and reset the idle clock:
 *   - typing/editing (onDidChangeTextDocument)
 *   - saving a file (onDidSaveTextDocument)
 *   - switching the active editor/file (onDidChangeActiveTextEditor)
 *   - switching workspace folders (onDidChangeWorkspaceFolders)
 *
 * Losing/gaining window focus is deliberately NOT treated as activity and
 * does NOT end a session by itself — you might alt-tab to read docs for a
 * minute. The 5-minute idle threshold (checked purely against the time of
 * the last real activity event) is the single source of truth for when a
 * session ends, exactly as specified.
 *
 * Every `heartbeatIntervalSeconds` (default 60s), if we're within the idle
 * threshold of the last activity, we send a heartbeat whose `timestamp` is
 * the time of that last activity — NOT "now". This matters: it means a
 * session's recorded end time is always the real last keystroke/save/switch,
 * never inflated by however long the heartbeat timer happens to keep firing
 * during the grace period before idle is declared.
 */
class ActivityTracker {
  constructor({ config, statusBar, offlineQueue, clientId }) {
    this.config = config;
    this.statusBar = statusBar;
    this.offlineQueue = offlineQueue;
    this.clientId = clientId;

    this.lastActivityAt = null; // Date | null
    this.localSessionStartedAt = null; // Date | null — for the status bar only
    this.isIdle = true;
    this.enabled = true;

    this.todaySecondsCache = 0; // best-effort, refreshed from server responses

    this.disposables = [];
    this.heartbeatTimer = null;
    this.idleCheckTimer = null;
  }

  start() {
    this.enabled = true;
    this._registerEditorListeners();
    this._registerTimers();
    this._touchActivity(); // don't start "cold" — count enabling as activity
  }

  stop() {
    this.enabled = false;
    this._clearTimers();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.statusBar.setStopped();
  }

  dispose() {
    this.stop();
  }

  // ---- Event wiring -------------------------------------------------

  _registerEditorListeners() {
    const touch = () => this._touchActivity();

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        // Ignore no-op events some extensions/formatters fire without real
        // content changes.
        if (e.contentChanges.length > 0) touch();
      }),
      vscode.workspace.onDidSaveTextDocument(touch),
      vscode.window.onDidChangeActiveTextEditor(touch),
      vscode.workspace.onDidChangeWorkspaceFolders(touch)
    );
  }

  _registerTimers() {
    const idleCheckIntervalMs = 15 * 1000;
    this.idleCheckTimer = setInterval(() => this._checkIdle(), idleCheckIntervalMs);

    const heartbeatIntervalMs = this.config.heartbeatIntervalSeconds * 1000;
    this.heartbeatTimer = setInterval(() => this._tick(), heartbeatIntervalMs);
  }

  _clearTimers() {
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.idleCheckTimer = null;
    this.heartbeatTimer = null;
  }

  // ---- Activity state -------------------------------------------------

  _touchActivity() {
    const now = new Date();
    this.lastActivityAt = now;
    if (this.isIdle) {
      this.isIdle = false;
      this.localSessionStartedAt = now;
    }
  }

  _checkIdle() {
    if (!this.enabled || this.isIdle || !this.lastActivityAt) return;

    const idleMs = Date.now() - this.lastActivityAt.getTime();
    const thresholdMs = this.config.idleThresholdMinutes * 60 * 1000;

    if (idleMs >= thresholdMs) {
      this.isIdle = true;
      this.localSessionStartedAt = null;
      this.statusBar.setIdle(this.todaySecondsCache);
    }
  }

  // ---- Heartbeats -------------------------------------------------

  async _tick() {
    if (!this.enabled) return;

    // Always try to flush anything queued from a previous outage first, so
    // history stays in the right order.
    await this._flushQueue();

    if (this.isIdle || !this.lastActivityAt) {
      return; // nothing to report this cycle
    }

    const editorInfo = this._currentEditorInfo();
    if (!editorInfo) return; // no open editor / no workspace — nothing to attribute this to

    const payload = {
      project: editorInfo.project,
      language: editorInfo.language,
      timestamp: this.lastActivityAt.toISOString(),
      clientId: this.clientId,
    };

    const result = await sendHeartbeat(this.config, payload);

    if (result.ok) {
      this.todaySecondsCache = result.data.todaySeconds ?? this.todaySecondsCache;
      const sessionSeconds = this.localSessionStartedAt
        ? Math.round((Date.now() - this.localSessionStartedAt.getTime()) / 1000)
        : 0;
      this.statusBar.setActive(sessionSeconds, this.todaySecondsCache);
    } else if (result.retryable) {
      this.offlineQueue.enqueue(payload);
      this.statusBar.setOffline(this.offlineQueue.size());
    } else {
      // Non-retryable (e.g. bad token) — surface once, don't spam retries.
      console.error("[Modred] heartbeat rejected:", result.error);
      vscode.window.setStatusBarMessage(`Modred: ${result.error}`, 5000);
    }
  }

  async _flushQueue() {
    const pending = this.offlineQueue.peekAll();
    if (pending.length === 0) return;

    let sentCount = 0;
    for (const payload of pending) {
      const result = await sendHeartbeat(this.config, payload);
      if (result.ok) {
        sentCount += 1;
      } else if (result.retryable) {
        break; // still offline — stop and try again next tick
      } else {
        // Bad payload/token — drop it rather than blocking the queue forever.
        sentCount += 1;
      }
    }

    if (sentCount > 0) {
      this.offlineQueue.removeFront(sentCount);
    }
  }

  // ---- Project / language detection -------------------------------------------------

  _currentEditorInfo() {
    const editor = vscode.window.activeTextEditor;
    const language = editor ? this._mapLanguageId(editor.document.languageId) : "other";
    const project = this._currentProjectName(editor);

    if (!project) return null;

    return { project, language };
  }

  _currentProjectName(editor) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;

    if (editor) {
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (folder) return folder.name;
    }

    // No active editor, or the active file isn't inside any workspace
    // folder (e.g. an untitled scratch file) — fall back to the first
    // workspace folder rather than dropping the heartbeat entirely.
    return folders[0].name;
  }

  _mapLanguageId(languageId) {
    // VS Code's languageId values already match our server-side allow-list
    // for the common cases (javascript, typescript, python, css, html,
    // json, sql, ...). Anything unrecognized is normalized to "other" by
    // the server anyway, so we just pass it through as-is.
    return languageId || "other";
  }

  // ---- Public helpers for commands -------------------------------------------------

  getTodaySecondsCache() {
    return this.todaySecondsCache;
  }

  isCurrentlyIdle() {
    return this.isIdle;
  }
}

module.exports = { ActivityTracker };
