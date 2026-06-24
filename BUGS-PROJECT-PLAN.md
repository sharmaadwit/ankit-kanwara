# PreSight / PAMS — Bug Project Plan

_Audit date: 2026-06-24. Scope: bugs and missing functionality only (no feature work). Findings verified by reading the surrounding code; confidence noted per item. This is a triage/work plan — nothing here is fixed yet unless marked ✅._

## How to read this
- **Severity**: Critical (data loss / security) → High (broken behavior) → Medium (degraded UX/edge) → Low (cleanup/dead code).
- **Confidence**: High = verified in code; Med = logic clear, real-world frequency uncertain.
- Each item: what's wrong · where · why it matters · suggested fix.

---

## Phase 0 — Already fixed this week ✅
- ✅ Activity **delete 401** — `removeActivityViaServer` now sends `X-Admin-User`.
- ✅ **Double-logging** on save — `saveActivity` re-entrancy guard + button disable.
- ✅ **Team-level** dashboard/reports (owner filter default `all`, cache invalidation).
- ✅ **Industry use cases** in the log form — `refreshUseCaseOptions` now loads per-industry options (+ extra render trigger + diagnostic log added for verification).
- ✅ **Drafts** show per-activity failed syncs (not legacy bulk), with Edit.
- ✅ Background activity submit (form hides immediately; durable via Drafts + retries).

---

## Phase 1 — Critical: security & data loss (do first)

### C1. Storage API fully open when `STORAGE_API_KEY` is unset
- `server/middleware/auth.js:70-73` — `if (!expectedKey) return next();`.
- If the env var isn't set, **all** `/api/storage`, `/api/users`, `/api/entities`, `/api/export`, `/api/reports` calls bypass auth. Unauthenticated read/write/delete of every activity & account.
- **Fix**: require a valid session (`req.user`) OR a configured key; never fail-open. Treat missing key as "session required," not "allow all." Confidence: High.

### C2. `X-Admin-User` header trusted without verification
- `server/middleware/auth.js:65-68` — any non-empty `X-Admin-User` passes storage auth, no DB check.
- Anyone can self-assert a username, write/remove activities, and pollute audit logs under a spoofed name.
- **Fix**: only accept `X-Admin-User` when backed by a valid server session, or verify against `users` like `requireAdminAuth` does. Confidence: High.
- ⚠️ Note: our client relies on `X-Admin-User` for writes, so this needs a coordinated change (prefer cookie/session, keep header only as server-set).

### C3. Migration/diagnostic endpoints use a hardcoded default token
- `server/app.js:216` and `server/routes/activitiesDiagnostic.js` — `MIGRATION_TOKEN || 'temp-migration-2026'`, no session/admin auth.
- If `MIGRATION_TOKEN` is unset in prod, the well-known default lets anyone dump any storage key (incl. `users`) and rewrite the activities blob.
- **Fix**: require `MIGRATION_TOKEN` to be set (refuse to mount if absent), or gate behind `requireAdminAuth`. **Remove these temporary endpoints once the current investigations close.** Confidence: High.

### C4. Signature-dedupe silently drops distinct activities
- `data.js:2717` (`_dedupeActivitiesBySignature`, used in 409 retry `data.js:2849`), `remoteStorage.js:265`, `app.js:1407`.
- Key = `accountId|projectId|day|type`. Two real activities for the same account+project on the same day of the same type (e.g. two customer calls) collapse to one (Map keeps last) — and this runs in merge-before-write, so the dropped one is overwritten server-side.
- **Fix**: include `id` (and/or a timestamp) in the signature; only dedupe true id-duplicates. Confidence: High (logic); Med (frequency).

### C5. Lost-append race on the first activity of a new bucket/empty key
- `server/routes/storage.js:601` (`appendActivityWithClient`; internal `:646`).
- `SELECT … FOR UPDATE` locks nothing when the `activities` row doesn't exist yet. Two concurrent first-appends each see empty and `INSERT … ON CONFLICT DO UPDATE` — second overwrites first.
- **Fix**: serialize via an advisory lock (`pg_advisory_xact_lock` on a key hash) or upsert-append in SQL. Confidence: High.

### C6. Account merge never persists merged projects / edits
- `app.js:8226` (`mergeAccounts`) mutates the target account in memory but never `saveAccounts`; it relies on `deleteAccount(source)` which re-reads from storage, discarding the mutations.
- Merged project list and resolved industry/salesRep are lost; only activity re-pointing + name change survive.
- **Fix**: `await DataManager.saveAccounts(...)` after mutating, before deleting the source. Confidence: High.

---

## Phase 2 — High: broken / incorrect functionality

### H1. "Channels" is required but never saved or validated
- `activities.js:812` (required label); selections live in `this.selectedChannels` but are never written to the activity/project on save; no empty-guard. `getChannelsWithOther()` (`:3070`) is dead.
- Channel data is captured nowhere for any activity.
- **Fix**: persist channels onto the activity (and/or project) in the save path like products/use-cases; validate non-empty if it should stay required. Confidence: High.

### H2. "Primary Use Case" & "Products Interested" required labels not enforced
- `activities.js:780,795`; save path validates only account/project/region/rep/industry + type fields.
- Custom multi-selects can be left empty and still save despite the `required` label.
- **Fix**: add explicit non-empty validation (and persist them, which products/use-cases already do). Confidence: High.

### H3. Numeric `user.id` crashes the entire Users admin list
- `admin.js:1354` — `(user.id || '').replace(...)` throws `TypeError` on numeric id, aborting `loadUsers().forEach` → no users render, no Edit/Delete/Reset.
- **Fix**: `String(user.id || '')` (every other id-in-template already wraps with `String`). Confidence: High.

### H4. Normalized tables never delete on activity remove
- `server/lib/normalizedDualWrite.js` is upsert-only; `/activities/remove` (`storage.js:849`) calls it but never deletes the removed id from the normalized `activities` table.
- Self-heal that rebuilds the blob from normalized tables can resurrect deleted activities.
- **Fix**: delete the id from normalized tables in the remove path. Confidence: High.

### H5. `POST /api/admin/activity` accepts unauthenticated audit writes
- `server/routes/activityLogs.js:11`, mounted `app.js:256` with only `adminLimiter` (GET is admin-gated, POST is not).
- Anyone can inject arbitrary audit rows (log forgery).
- **Fix**: add `requireAdminAuth` to the POST. Confidence: High.

### H6. Pricing single-record GET has no auth (IDOR)
- `server/routes/pricingCalculations.js:330` — no `requirePricingApiKey`/`requireSession`, unlike sibling routes.
- If `PRICING_CALC_API_KEY` unset, guessing a `calculation_id` exposes any user's payload (email, pricing, inputs).
- **Fix**: apply the same auth guard as the list/link routes. Confidence: High (missing guard); Med (impact).

### H7. `switchLoginTab(tab)` ignores its argument
- `auth.js:130` — hardcodes `'presales'`; multi-tab login can't select other tabs (abandoned/half-built).
- **Fix**: honor `tab`, or remove the dead tab UI. Confidence: High.

### H8. Channel & POC analytics charts use one month in Annual mode
- `analytics.js:586,646` pass `analytics.month` while the rest aggregates over `monthsInPeriod`.
- Year view under-reports channel/POC outcomes vs other charts.
- **Fix**: aggregate these two over the full period like the others. Confidence: High.

---

## Phase 3 — Medium: degraded UX / edge cases
- **M1** `internalActivities` full-list PUT isn't id-merged (`storage.js:294,1009`) — stale PUT can overwrite; only shrink-guard backstops. 
- **M2** Async 409 path resolves the draft but never auto-resaves merged data (`remoteStorage.js:974`) — change lost if tab closes.
- **M3** Login reconcile wipes pending offline activity saves from the outbox (`remoteStorage.js:1382`).
- **M4** POC env/status update no-ops on numeric id mismatch (`admin.js:2618`) — edit looks accepted, silently lost.
- **M5** Feature-flag matrix defaults every flag ON (`admin.js:2708`) — a Save can flip server-off flags on.
- **M6** Plain-CSV exports don't quote fields (`admin.js:1379,3293,3602`) — commas in names shift columns.
- **M7** No double-submit guard on draft "Deploy" / login / Win-Loss save (`app.js:3601,568,9122`).
- **M8** `storageDraftsSubmitAll` over-reports success (`admin.js:605`) — inner catch swallows failures.
- **M9** Stale entity-cache read window during draft saves (`remoteStorage.js:876` vs `792`).
- **M10** `mergeArrayById` crashes on items without `id` (`remoteStorage.js:199`).
- **M11** Forced-password-change writes a session with no `sessionId`/`role` (`auth.js:622`).

---

## Phase 4 — Low: cleanup / dead code
- **L1** `accountProjectLock` is entirely dead; the documented 60s lock / HTTP 423 path doesn't exist, yet the client still handles 423 (`data.js:3320`). Concurrency is actually Postgres `FOR UPDATE`. Remove or implement.
- **L2** Append response omits the `duplicate` field the client reads (`data.js:2944`) — trace-only mismatch.
- **L3** Dead helpers: `getProjectProductsWithOther`, `getChannelsWithOther` (activities.js), `buildAnnualMonthlyActivitySeries`, `canvasToPngWithWhiteBackground` (reports-v2.js), `loadRecentActivities`, `moveFebruaryIncompleteActivitiesToDrafts`, `draftsSubmitAll` (app.js).
- **L4** Dead analytics-tabs island calls non-existent `switchAnalyticsPeriodMode` (`app.js:275`); whole `buildAnalytics*` subsystem + in-file chart renderers are overridden at load and unused in prod.
- **L5** `draftsSubmitAll` discards `_activityUpdate` drafts without saving (`app.js:3797`) — data-loss landmine, mitigated only because it's unwired.
- **L6** `ActivityViews` (calendar/table) is demo scaffolding on dummy data with `alert()`/`console.log` stubs (`activity-views.js`) — must be wired to real data or kept out of prod nav.
- **L7** Leftover DEBUG logs/no-ops: dashboard `console.log` blocks (`app.js:1596,1633`), identical-branch ternaries (`app.js:1734`, `activities.js:64`), triple-duplicate `_pricingCalc` branches (`app.js:3626`).

---

## Suggested execution order
1. **Phase 1 C1–C3** (security) — small, high-impact middleware/endpoint changes; coordinate C2 with the client header dependency.
2. **C4, C6, H4** (silent data loss) — dedupe signature, merge persistence, normalized delete.
3. **C5** (append race) — advisory lock.
4. **H1–H3** (channels not saved, required not enforced, users list crash) — user-visible correctness.
5. **H5–H8**, then Phase 3.
6. **Phase 4** cleanup last (low risk, reduces confusion / future bugs).

## Notes (checked — NOT bugs)
- `saveActivity` already has a working double-submit guard (`_activitySaveInFlight`).
- For an existing `activities` row, concurrent appends are correctly serialized by `FOR UPDATE` + merge-by-id (only the cold-start case C5 races).
- `pricing-calc-review/`, `pricing-calc-shallow/` are a separate Python/Flask app — out of scope for this JS audit.
- `Review/`, `.cursor/`, `effort-calculation-review.md` contained no bug notes; `Error/` holds a screen recording, not notes.
