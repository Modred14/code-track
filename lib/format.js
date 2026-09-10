// Presentation-only helpers. Kept separate from lib/sessions.js because
// these run in the browser (client components) and shouldn't import
// anything Prisma-related.

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h === 0 && m === 0) return "0m";
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatDurationLong(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  javascriptreact: "JavaScript (JSX)",
  typescriptreact: "TypeScript (TSX)",
  python: "Python",
  css: "CSS",
  scss: "SCSS",
  less: "LESS",
  html: "HTML",
  json: "JSON",
  jsonc: "JSON",
  sql: "SQL",
  markdown: "Markdown",
  yaml: "YAML",
  shellscript: "Shell",
  go: "Go",
  rust: "Rust",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  php: "PHP",
  ruby: "Ruby",
  plaintext: "Plain text",
  other: "Other",
};

export function formatLanguage(id) {
  if (!id) return "—";
  return LANGUAGE_LABELS[id] || id;
}

export function formatProjectName(id) {
  if (!id) return "—";
  // "accommodation-finder" -> "Accommodation Finder"
  return id
    .split(/[-_]/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
