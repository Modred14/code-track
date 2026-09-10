const fs = require("fs");
const path = require("path");

// Cap the queue so a long outage can't grow the file unboundedly. Heartbeats
// are ~1/min while actively coding, so 2000 entries is well over a day of
// continuous offline coding — more than enough headroom for realistic
// outages while keeping this "not an unnecessarily complicated sync system"
// per the brief.
const MAX_QUEUE_SIZE = 2000;

class OfflineQueue {
  /** @param {string} storageDir - a writable directory unique to this extension (globalStorageUri.fsPath) */
  constructor(storageDir) {
    this.filePath = path.join(storageDir, "pending-heartbeats.json");
    this._ensureDir(storageDir);
  }

  _ensureDir(dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // best-effort; read/write calls below will surface real errors
    }
  }

  _readAll() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // file missing or corrupt -> treat as empty, don't crash
    }
  }

  _writeAll(items) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(items), "utf8");
    } catch (err) {
      console.error("[Modred] failed to persist offline queue:", err.message);
    }
  }

  enqueue(payload) {
    const items = this._readAll();
    items.push(payload);
    if (items.length > MAX_QUEUE_SIZE) {
      items.splice(0, items.length - MAX_QUEUE_SIZE); // drop oldest
    }
    this._writeAll(items);
  }

  peekAll() {
    return this._readAll();
  }

  size() {
    return this._readAll().length;
  }

  /** Removes the first `count` items (the ones that were successfully sent). */
  removeFront(count) {
    const items = this._readAll();
    this._writeAll(items.slice(count));
  }

  clear() {
    this._writeAll([]);
  }
}

module.exports = { OfflineQueue };
