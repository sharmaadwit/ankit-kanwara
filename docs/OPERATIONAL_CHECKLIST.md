# Operational checklist: data safety, load, multi-user, drafts

Use this to confirm the app is fully operational and safe for multiple users.

---

## 1. No data loss

- **Before every overwrite** (except migration keys), the server runs `archiveCurrentValue`: the current value is written to `storage_history` before the new value is saved. So you always have the previous version in history.
- **On 409 conflict**, the rejected payload is saved to `pending_storage_saves` (Lost & Found). Nothing is dropped.
- **Cleanup** deletes only by retention (e.g. `STORAGE_HISTORY_RETENTION_DAYS`, default 90). Current storage and recent history are never deleted by cleanup.

---

## 2. Optimal load and saves

- **First load:** Reconcile runs once (single batch: internalActivities, accounts, activities, users). Result is cached via `DataManager.setCacheFromBatch`. Both login and init-with-session **await** reconcile before switching views, so the first screen uses cache and does not refetch.
- **Saves:** Each storage update goes through the normal PUT path with optional compression; archive runs before overwrite. See `docs/PERFORMANCE_AND_LOAD.md` for details.

---

## 3. Multiple users and concurrent edits

- **Sessions:** Each login creates a new session. There is no single-session lock; multiple users (and multiple devices/browsers per user) can be logged in at once.
- **Storage:** Shared. Concurrency is handled with **If-Match** (optimistic locking). If User B saves after User A, User B’s PUT can get **409** (stale version). The server then:
  - Keeps A’s value as current.
  - Writes B’s payload to `pending_storage_saves`.
  - Returns 409 with current value and `updated_at`.
- **Client:** On 409, the failing write is removed from the outbox and the draft is updated with a conflict message. The client updates `lastVersion[key]` from the 409 response so that **Submit again** from Drafts uses the latest version and can succeed (last-write-wins for that key).

---

## 4. Draft process

- **Creating drafts:** `setItemAsyncWithDraft` adds a draft and an outbox entry. If the save fails (e.g. 409 or 401), the draft is updated with an error message and the payload is either retried from the outbox or (on 409) stored server-side in `pending_storage_saves`.
- **Drafts UI:** Drafts tab supports Submit all, Edit, Discard. Submitting a draft uses the same save path; after 409, “Submit again” uses the updated `lastVersion` so the next save can succeed.
- **Migration drafts** (`migration_draft_*`) use a separate confirm flow and are not mixed with the main draft list.

---

## 5. Cleanup and retention

- **Run cleanup** via `POST /api/admin/cleanup` (admin only). Use `{ "sizeOnly": true }` to inspect sizes without deleting. Use `{ "full": true }` to delete by retention (default 90 days for `storage_history`).
- **Env:** `STORAGE_HISTORY_RETENTION_DAYS` (default 90), plus retention for login_logs and activity_logs. See `docs/CLEANUP_STEP_BY_STEP.md` and `docs/DATA_AND_DISK_GROWTH.md`.

---

## Quick verification

| Check | How |
|-------|-----|
| No data loss on overwrite | Archive in `server/routes/storage.js` before overwrite; history retention. |
| No data loss on conflict | 409 → save to `pending_storage_saves`. |
| Multi-user login | Multiple sessions allowed; no single-session lock in auth. |
| Draft “Submit again” works | On 409, client sets `lastVersion[key] = err.updated_at` so next submit can succeed. |
| Load is single-batch | Reconcile batch; await before switchView on login and init. |
| Cleanup is safe | Retention-based only; current data not deleted. |

You’re good to run with multiple users, drafts, and retention-based cleanup without losing data.
