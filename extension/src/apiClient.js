// Uses the global `fetch` available in VS Code's Node runtime (Node 18+,
// bundled since VS Code 1.83). No extra HTTP dependency needed.

/**
 * @param {{ apiUrl: string, token: string }} config
 * @param {{ project: string, language: string, timestamp: string, clientId: string }} payload
 * @param {number} timeoutMs
 * @returns {Promise<{ ok: true, data: any } | { ok: false, error: string, retryable: boolean }>}
 */
async function sendHeartbeat(config, payload, timeoutMs = 8000) {
  if (!config.token) {
    return { ok: false, error: "No API token configured.", retryable: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.apiUrl}/api/coding/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (res.status === 401) {
      return { ok: false, error: "Invalid or missing API token (401).", retryable: false };
    }
    if (!res.ok) {
      // 5xx / network-adjacent failures are worth retrying; 4xx (other than
      // 401) usually indicate a bad payload and would just fail again.
      const retryable = res.status >= 500;
      return { ok: false, error: `Server responded ${res.status}.`, retryable };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    // Network unreachable, DNS failure, timeout/abort — all retryable.
    return { ok: false, error: err.message || "Network error.", retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendHeartbeat };
