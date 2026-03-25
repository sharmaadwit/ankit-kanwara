# Data loss and conflict blind spots

This doc lists known edge cases and mitigations so we don’t lose data or get surprised by conflicts.

---

## Mitigations already in place

- **409 → lastVersion:** On storage conflict (409), the client sets `lastVersion[key] = err.updated_at` so “Submit again” from Drafts uses the latest version and can succeed (last-write-wins).
- **Activities sharding:** We never delete existing month buckets when saving; we only add/update. Prevents Jan/Feb (or any month) from being wiped by a partial in-memory list.
- **Draft backup:** Before “Submit all”, drafts are backed up to `__pams_drafts_backup__` in localStorage so they can be restored if something fails mid-run.
- **Drafts only removed on success:** A draft is removed only after its save succeeds; failed submits leave the draft in place.
- **Activities lastVersion on load:** When we refetch activities (e.g. on login), we now do a GET for the `activities` key and set `lastVersion['activities']` so the first save in the session uses optimistic locking and doesn’t blindly overwrite.

---

## Blind spots to be aware of

### 1. Submit again = last-write-wins (by design)

When a user clicks “Submit again” on a conflict draft, we send their draft payload with the **new** `If-Match` (from the 409 response). The server accepts and **overwrites** the current server value with that payload. So if another user (or another tab) saved in between, their changes are replaced by the draft. This is intentional so the user’s intent wins; multi-user merge is not implemented. **Mitigation:** Educate users that “Submit again” overwrites the current server state; avoid editing the same list in two places at once.

### 2. Restore from backup can re-submit the same data

`Drafts.restoreFromBackup()` brings back the snapshot taken at the **start** of the last “Submit all”. If some of those drafts were already submitted successfully, restoring adds them back to the draft list. A later “Submit all” would send them again and could create duplicates (e.g. duplicate activities). **Mitigation:** Use “Restore from backup” only when drafts were lost (e.g. accidental “Delete all” or tab crash before any submit). There is no “Restore” button in the UI; restore is via console: `Drafts.restoreFromBackup()`.

### 3. Multiple tabs / first save race

If two tabs are open and both load the app, both may have the same (or empty) `lastVersion` until a PUT returns. The first tab to save gets 200 and updates `lastVersion`; the second might still send an outdated or missing `If-Match` and overwrite the first tab’s save. **Mitigation:** We now set `lastVersion['activities']` (and other keys) when we refetch on login/reconcile (including a GET for `activities`). That reduces the window; true multi-tab safety would require e.g. a lock or CRDT-style merge.

### 4. Sync `setItem` path and 409

The **sync** `storage.setItem` path (used when code calls `localStorage.setItem` and we proxy to remote) does merge-before-save for activities/accounts/internalActivities and can hit 409. On 409 it merges and retries once in-process; it does **not** update `lastVersion` (that path doesn’t use the async API). So a sync-path 409 is handled by merge+retry; if the retry also conflicts, the error is thrown and the draft is updated. **Mitigation:** Prefer the async path (`setItemAsyncWithDraft`) for user-triggered saves (DataManager does this for activities/accounts). The sync path is still used by some legacy or internal flows.

### 5. Outbox without draft

If a user discards a draft that was created by a failed save, the corresponding outbox entry (if any) remains. When the outbox is flushed, we try to save that entry; on 409 we remove the outbox entry and try to update the draft by ID, but the draft is already gone so it’s a no-op. No data loss; the orphan outbox entry is just removed on 409 or on next success.

### 6. Server-side draft (Lost & Found)

On 409 the server can store the rejected payload in `pending_storage_saves` (Lost & Found). That’s a server-side backup. The client still keeps its own draft in localStorage. So we have two copies of “couldn’t save” state; neither is lost.

### 7. Rate limiting (429)

If the server returns 429 (e.g. on `/api/admin/activity` or storage), the client may show “Server is busy” and disable remote storage. Saves then fail and go to drafts. **Mitigation:** Back off and retry later; drafts are kept until the user submits again or discards.

---

## What we should do (recommendations)

### High impact, low effort

| Blind spot | What to do |
|------------|------------|
| **1. Submit again = last-write-wins** | **UX:** In the Drafts view, when a draft’s error is “Conflict – someone else saved…”, show a short line: “Submitting again will replace the current saved data with this draft.” So users knowingly overwrite. Optionally add a one-time tooltip on first conflict draft. |
| **2. Restore from backup** | **UX:** Add a “Restore from backup” button in My drafts that only shows when `Drafts.getBackup()` exists and is non-empty. On click: confirm “This will bring back drafts from before the last Submit all. Only do this if you lost drafts (e.g. accidental Delete all). Submitting them again may create duplicates.” Then call `Drafts.restoreFromBackup()` and refresh the list. **Code:** Button in `draftsView` header; `loadDraftsView` shows/hides it and wires the confirm + restore. |
| **7. Rate limiting (429)** | **Backend:** Review rate limits for storage and `/api/admin/activity`. Increase limits or add a short backoff so normal use doesn’t hit 429. **Frontend:** Already keeps drafts; optionally show “You can try again in X minutes” when we get 429 and we know Retry-After. |

### Medium impact, medium effort

| Blind spot | What to do |
|------------|------------|
| **3. Multiple tabs / first save race** | **Option A (pragmatic):** On focus or visibility change, if the tab hasn’t refetched in the last N minutes, trigger a reconcile (refetch entity keys and set `lastVersion`) so the next save uses fresh versions. **Option B (stricter):** Use BroadcastChannel or localStorage event so when one tab saves, other tabs clear/invalidate `lastVersion` for that key and show a small “Data was updated in another tab. Refresh to see latest.” and optionally auto-refresh the list. Start with Option A (refetch on focus after idle). |
| **4. Sync `setItem` and 409** | **Code:** In the sync `setItem` path, when we catch a 409 and have `error.updated_at`, set `lastVersion[key] = error.updated_at` before merging and retrying (same as we do in the async path). That way a second retry or a later “Submit again” uses the right version. Find the catch block for 409 in the sync setItem and add the lastVersion update. |

### Lower priority / accept or document

| Blind spot | What to do |
|------------|------------|
| **5. Outbox without draft** | **Accept:** No data loss; orphan outbox entry is cleaned on next 409 or success. Optional improvement: when the user discards a draft, remove any outbox entry that has `draftId === draft.id` so we don’t retry a discarded draft. |
| **6. Server Lost & Found** | **Document:** Ensure admin/support know that 409 payloads are in `pending_storage_saves` and can be inspected or replayed from the admin UI. No code change required. |

---

## Implementation order (suggested)

1. **Conflict draft UX (Blind spot 1)** – Add the one-line warning for conflict drafts so users know “Submit again” overwrites.
2. **Restore from backup (Blind spot 2)** – Add the “Restore from backup” button with confirm; prevents confusion and avoids console-only restore.
3. **Sync path lastVersion on 409 (Blind spot 4)** – One small change in remoteStorage sync setItem catch block.
4. **Refetch on focus after idle (Blind spot 3)** – Refetch entity keys when the tab gains focus and last refetch was e.g. &gt; 2 minutes ago.
5. **429 handling (Blind spot 7)** – Tune server limits and optionally show Retry-After in the UI.

---

## Quick checklist for safe behaviour

- Use one tab per user when editing the same accounts/activities if you want to avoid overwrites.
- Use “Submit all” when you have many drafts; backup is taken automatically before submit.
- Use “Submit again” after a conflict; it will use the latest version and overwrite server state with your draft.
- Don’t restore from backup unless drafts were actually lost; otherwise you may re-submit and duplicate data.
- After a long idle or multi-tab use, refresh before doing a big save so `lastVersion` is fresh from the server.
