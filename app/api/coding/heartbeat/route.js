import { NextResponse } from "next/server";
import { requireTrackerAuth } from "../../../../lib/auth.js";
import { validateHeartbeatPayload } from "../../../../lib/validate.js";
import { recordHeartbeat, getCurrentState } from "../../../../lib/sessions.js";
import { getTodayBounds } from "../../../../lib/timezone.js";
import { getTotalSecondsInRange } from "../../../../lib/sessions.js";

export async function POST(request) {
  // 1. Authenticate the extension.
  const auth = requireTrackerAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // 2. Validate the payload.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateHeartbeatPayload(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 3 & 4. Determine activity + create/update the current session.
  try {
    await recordHeartbeat(validation.data);
  } catch (err) {
    console.error("[heartbeat] failed to record session:", err);
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  // 5 & 6. Return the current tracking state so the extension's status bar
  // can update immediately without a second round trip.
  try {
    const [current, { start, end }] = [await getCurrentState(), getTodayBounds()];
    const todaySeconds = await getTotalSecondsInRange(start, end);

    return NextResponse.json({
      active: current.active,
      todaySeconds,
      currentSessionSeconds: current.currentSessionSeconds,
      project: current.project,
      language: current.language,
    });
  } catch (err) {
    console.error("[heartbeat] recorded but failed to build response:", err);
    // The heartbeat itself succeeded; a stale status bar is better than
    // making the extension think the heartbeat failed and retry it.
    return NextResponse.json({ active: true }, { status: 200 });
  }
}

// Explicitly reject other methods rather than letting Next.js 404 silently.
export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
