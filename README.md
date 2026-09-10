# Modred Coding Tracker

Tracks how much time you actively spend coding in VS Code and shows it on a
real-time dashboard at `/activity`.

```
VS Code  →  Modred extension  →  Next.js API  →  Postgres (Neon)  →  Dashboard
```

Stack: Next.js (App Router, JavaScript, no TypeScript), Prisma, PostgreSQL/Neon,
React, Tailwind CSS.

---

## 1. What's in this project

```
modred-tracker/
├── app/
│   ├── activity/page.js          the /activity dashboard
│   ├── api/coding/
│   │   ├── heartbeat/route.js    POST — extension sends activity here (auth required)
│   │   ├── current/route.js      GET  — live status, polled by the dashboard
│   │   ├── today/route.js        GET  — today's total + session list
│   │   └── stats/route.js        GET  — weekly/languages/projects/streak/heatmap
│   ├── layout.js
│   └── globals.css
├── components/activity/          dashboard UI components (see below)
├── lib/
│   ├── db.js                     Prisma client singleton
│   ├── auth.js                   bearer-token auth for the heartbeat endpoint
│   ├── validate.js               heartbeat payload validation
│   ├── heartbeat-logic.js        pure 5-minute idle-threshold logic (unit-tested)
│   ├── sessions.js               DB-backed session queries/aggregation
│   ├── timezone.js               APP_TIMEZONE-aware day boundaries (no extra deps)
│   └── format.js                 client-side display formatting
├── prisma/schema.prisma          the CodingSession model
├── tests/                        node --test unit tests (heartbeat logic + timezone)
├── extension/                    the "Modred Coding Tracker" VS Code extension
│   ├── extension.js              activation, commands
│   └── src/
│       ├── activityTracker.js    activity detection + idle/heartbeat loop
│       ├── apiClient.js          HTTP client for the heartbeat endpoint
│       ├── offlineQueue.js       local disk queue for outages
│       ├── statusBar.js          status bar item
│       └── config.js             reads VS Code settings / env token
├── .env.example
└── package.json
```

Dashboard components, each a focused presentational piece:

| Component | Shows |
|---|---|
| `CurrentStatus.js` | 🟢/⚫ live status, current project/language, session timer |
| `TodayTotal.js` | Big "coded today" number |
| `WeeklyChart.js` | Mon–Sun bar chart |
| `LanguagesBreakdown.js` | Time per language (last 30 days) |
| `ProjectsBreakdown.js` | Time per project (last 30 days) |
| `StreakBadge.js` | 🔥 consecutive-day streak |
| `ActivityHeatmap.js` | GitHub-style heatmap, last 182 days |
| `TodaySessions.js` | List of today's individual sessions |
| `CodingStatusWidget.js` | Small "● Coding now · 5h 42m today" pill for use anywhere else on your site (e.g. homepage) |

---

## 2. How the activity model works (read this)

The extension does **not** count "VS Code is open" time. It only counts time
where there's actual signal: typing, saving, switching the active
editor/file, or switching workspace folders. Losing window focus alone does
**not** end a session — you might alt-tab to read docs for a minute — only
5 minutes of no such signal does.

**The server is the real source of truth**, independent of the client's own
clock or crash state:

- On each heartbeat for a `(project, language)` pair, the API looks up the
  most recently-updated session for that exact pair.
- If that session's `updatedAt` (server-side "last heard from you" time) is
  within 5 minutes of now, the heartbeat **extends** it: `endedAt` moves to
  the heartbeat's `timestamp` (the time of the *actual last activity*, not
  "now") and `durationSeconds` is recomputed.
- Otherwise (gap too big, or no matching session, or the project/language
  changed) it **starts a new session**.
- "Coding now" is derived the same way: a session is "live" if its
  `updatedAt` is within ~90 seconds (heartbeat interval + jitter buffer) of
  the current time — no separate open/closed flag needed. If the extension
  crashes or the laptop is forced to sleep, the dashboard correctly falls
  back to "not coding" within about 90 seconds on its own.

This means the spec's worked example — typing 10:00→10:34, idle by 10:39 —
produces a session with `startedAt = 10:00`, `endedAt = 10:34`,
`durationSeconds = 34 min`, which is exactly what the tests in
`tests/heartbeat-logic.test.js` assert.

Duplicate and out-of-order heartbeats (retries, offline-queue replay) are
handled by never moving `endedAt` backwards and by treating an unchanged
timestamp as a no-op refresh.

---

## 3. Local setup

### 3.1 Install dependencies

```bash
cd modred-tracker
npm install
```

### 3.2 Set up Neon (Postgres)

1. Create a project at https://neon.tech.
2. From the Neon dashboard, copy the **pooled** connection string into
   `DATABASE_URL`, and the **direct** connection string into `DIRECT_URL`
   (used only for running migrations).

### 3.3 Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `DIRECT_URL`, a random `TRACKER_API_TOKEN`
(`openssl rand -hex 32`), and `APP_TIMEZONE` (e.g. `Africa/Lagos`).

### 3.4 Run the database migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

> Note: this sandbox environment couldn't reach `binaries.prisma.sh` to
> download the Prisma query engine, so the migration itself hasn't been run
> here — run it in your own environment where that host is reachable.

### 3.5 Run the Next.js app

```bash
npm run dev
```

Visit `http://localhost:3000/activity`. It'll show "Not coding" / all-zero
stats until the extension starts sending real heartbeats.

---

## 4. Running the extension locally

```bash
cd extension
npm install
code .
```

Then press **F5** in VS Code (with the `extension/` folder open) to launch
an Extension Development Host — a second VS Code window with the extension
active.

In that dev-host window, set the extension's settings (Settings → search
"Modred") or add to its `settings.json`:

```json
{
  "modred.apiUrl": "http://localhost:3000",
  "modred.apiToken": "the-same-value-as-TRACKER_API_TOKEN-in-.env"
}
```

(Prefer setting `MODRED_TRACKER_TOKEN` as a real environment variable
instead of `modred.apiToken` in settings, since settings.json is often
synced/shared — see `extension/src/config.js`.)

Start typing in a file inside an open folder. Within ~60 seconds you should
see the status bar change to `$(pulse) Coding · 0m`, and `/activity` should
update on its next poll.

### Testing the extension locally — practical checklist

- **10 minutes of active coding**: type continuously; confirm the status
  bar timer climbs and `/activity`'s "Coding today" grows.
- **Going idle**: stop typing for 5+ minutes; confirm the status bar
  switches to `$(circle-slash) Idle` and the dashboard's "Coding now"
  turns off within ~90s.
- **Returning from idle**: type again; confirm a *new* session starts
  (check `GET /api/coding/today` — you should see two separate sessions,
  not one continuous one, if the gap exceeded 5 minutes).
- **Closing VS Code**: close the window mid-session; confirm the dashboard
  shows "not coding" within ~90s (no explicit close signal is needed — see
  §2).
- **Restarting VS Code**: reopen; confirm tracking resumes and a new
  session starts on the next activity.
- **Losing internet connection**: disconnect Wi-Fi while coding; confirm
  the status bar shows `$(cloud-offline) Modred (offline, N queued)` and
  no data is lost (check `extension globalStorage`'s
  `pending-heartbeats.json`).
- **Reconnecting**: reconnect; confirm the queue drains (status bar returns
  to `$(pulse) Coding`) and the queued time appears in the dashboard.
- **Switching projects / languages**: open a different workspace folder or
  file type; confirm the previous session closes and a new one starts
  under the new project/language (per §2, a project/language change always
  starts a new session).
- **Midnight/day rollover**: hardest to test live — instead, verify via
  `tests/timezone.test.js`, which asserts day-boundary correctness in
  `Africa/Lagos` directly (already passing).
- **Computer sleep/wake**: put the machine to sleep mid-session, wake it
  later; confirm the session correctly ended at the last real activity
  before sleep (no heartbeats are sent while asleep, so this falls out of
  the idle-threshold logic automatically) and a new session starts on
  waking + typing.
- **Duplicate heartbeat prevention**: covered by
  `tests/heartbeat-logic.test.js` ("duplicate heartbeat" and "out-of-order
  heartbeat" cases).

### Building/packaging the extension

```bash
cd extension
npm install
npx vsce package
```

This produces `modred-coding-tracker-1.0.0.vsix`. Install it into any VS
Code with:

```bash
code --install-extension modred-coding-tracker-1.0.0.vsix
```

---

## 5. Deploying the backend

Any Next.js host works (Vercel is the path of least friction given Neon's
native integration):

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the same environment variables from `.env` (`DATABASE_URL`,
   `DIRECT_URL`, `TRACKER_API_TOKEN`, `APP_TIMEZONE`) in the Vercel project
   settings.
4. Deploy. Run `npx prisma migrate deploy` once against production (Vercel's
   build step, or manually from your machine with the production
   `DIRECT_URL`).

### Pointing the extension at production

Update the extension's settings (or your synced VS Code settings) to:

```json
{
  "modred.apiUrl": "https://your-domain.com",
  "modred.dashboardUrl": "https://your-domain.com/activity"
}
```

and set `MODRED_TRACKER_TOKEN` in your shell profile (`~/.zshrc` etc.) to
the same value as production's `TRACKER_API_TOKEN`, so it's never stored in
settings.json.

---

## 6. Automated tests

```bash
npm test
```

Runs `tests/heartbeat-logic.test.js` (the 5-minute idle threshold, including
the spec's exact 10:00–10:34→idle-by-10:39 example, boundary conditions,
duplicate/out-of-order heartbeats) and `tests/timezone.test.js` (day-boundary
math in a real UTC+1 timezone, verifying late-night coding is never
attributed to the wrong day). All 14 tests currently pass.

---

## 7. Known limitations

- **Single user, single shared token.** This is intentionally not
  multi-tenant. If you ever add other people, switch `TRACKER_API_TOKEN`
  to per-user tokens stored (hashed) in the database.
- **DST transitions.** `lib/timezone.js` computes day boundaries without an
  external timezone library to avoid the dependency; it's correct on
  ordinary days but can be off by up to an hour of streak/heatmap bucketing
  on the two DST-transition days per year in zones that observe DST.
- **Offline queue cap.** The extension caps its local offline queue at 2000
  heartbeats (roughly a day of continuous coding) and drops the oldest
  entries beyond that rather than growing unboundedly.
- **Heartbeat timestamp validation window.** The server rejects heartbeats
  timestamped more than 24h in the past (guards against clock-bug garbage
  data), so an outage longer than 24h will lose the tail end of the queued
  backlog rather than silently corrupting stats.
- **`vsce package` / `prisma generate` need network access** to
  `marketplace.visualstudio.com` / `binaries.prisma.sh` respectively — not
  available in every sandboxed environment, so run those two commands from
  your own machine.
- **Multi-window VS Code.** If you run two VS Code windows on the same
  machine simultaneously, both will send heartbeats independently; since
  they typically share the same project/language they'll usually just
  extend the same session (which is the desired behavior), but truly
  overlapping different projects will be tracked as separate, correctly
  independent sessions.

---

## 8. First MVP checklist (what to verify before adding extras)

1. Install the extension, open a project, start typing.
2. Confirm heartbeats reach `POST /api/coding/heartbeat` (check server logs
   or Prisma Studio: `npx prisma studio`).
3. Stop typing; after 5 minutes confirm the session's `endedAt` stopped
   advancing.
4. Open `/activity`; confirm "Coding today" matches what you just did.
5. Start coding again; confirm the dashboard updates on its next poll
   (≤60s) and a second session appears in "Today's sessions".

Only after this loop is solid should the rest (languages/projects/streaks/
heatmap — already built, but verify against real data) be trusted.
# atlas
# code-track
