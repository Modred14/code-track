// Minimal, dependency-free payload validation. The heartbeat payload is
// small and fixed-shape, so a full schema-validation library (zod, yup,
// etc.) would be an unnecessary dependency for what's a handful of checks.

const MAX_STRING_LEN = 100;
// A conservative allow-list keeps garbage/typos from fragmenting the
// per-language stats (e.g. "JavaScript" vs "javascript" vs "js").
const KNOWN_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "python",
  "css",
  "scss",
  "less",
  "html",
  "json",
  "jsonc",
  "sql",
  "markdown",
  "yaml",
  "shellscript",
  "go",
  "rust",
  "java",
  "c",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "plaintext",
  "other",
]);

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= MAX_STRING_LEN;
}

/**
 * Validates the JSON body of POST /api/coding/heartbeat.
 * Returns { valid: true, data } or { valid: false, error }.
 */
export function validateHeartbeatPayload(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const { project, language, timestamp, clientId } = body;

  if (!isNonEmptyString(project)) {
    return { valid: false, error: "`project` must be a non-empty string." };
  }

  if (!isNonEmptyString(language)) {
    return { valid: false, error: "`language` must be a non-empty string." };
  }

  const normalizedLanguage = language.trim().toLowerCase();
  const safeLanguage = KNOWN_LANGUAGES.has(normalizedLanguage) ? normalizedLanguage : "other";

  if (timestamp === undefined || timestamp === null) {
    return { valid: false, error: "`timestamp` is required (ISO 8601 string or epoch ms)." };
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return { valid: false, error: "`timestamp` is not a valid date." };
  }

  const now = Date.now();
  // Reject timestamps that are wildly in the future/past — most likely a
  // client clock bug — rather than silently corrupting aggregates.
  const FIVE_MIN = 5 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (parsedTimestamp.getTime() > now + FIVE_MIN) {
    return { valid: false, error: "`timestamp` is in the future." };
  }
  if (parsedTimestamp.getTime() < now - ONE_DAY) {
    return { valid: false, error: "`timestamp` is too far in the past for a heartbeat." };
  }

  if (clientId !== undefined && clientId !== null && !isNonEmptyString(String(clientId))) {
    return { valid: false, error: "`clientId` must be a short string if provided." };
  }

  return {
    valid: true,
    data: {
      project: project.trim(),
      language: safeLanguage,
      timestamp: parsedTimestamp,
      clientId: clientId ? String(clientId).trim() : null,
    },
  };
}
