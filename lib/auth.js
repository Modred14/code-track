// Shared-secret auth between the VS Code extension and this API.
//
// This is a personal, single-user tracker, so a single long-lived bearer
// token (kept in an env var, never in source) is enough. It is NOT meant to
// scale to multiple users — if you ever add other people, switch to
// per-user tokens stored (hashed) in the database instead.

import { timingSafeEqual } from "node:crypto";

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates the `Authorization: Bearer <token>` header on an incoming
 * Next.js Route Handler request.
 *
 * @param {Request} request
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function requireTrackerAuth(request) {
  const expected = process.env.TRACKER_API_TOKEN;

  if (!expected) {
    // Fail closed: never allow requests through if the server itself isn't
    // configured with a token. This prevents an accidental public endpoint.
    return {
      ok: false,
      status: 500,
      message: "Server misconfigured: TRACKER_API_TOKEN is not set.",
    };
  }

  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return { ok: false, status: 401, message: "Missing bearer token." };
  }

  const token = match[1].trim();

  if (!safeCompare(token, expected)) {
    return { ok: false, status: 401, message: "Invalid bearer token." };
  }

  return { ok: true };
}
