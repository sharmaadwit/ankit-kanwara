# Drafts recovery

If your drafts vanished after clicking **Submit all**, use these options to recover or inspect them.

## 1. Same browser: Restore from backup (recommended)

Before each **Submit all**, the app backs up your current drafts to browser storage. If the list disappeared but some items didn’t actually submit:

1. Open **My drafts** in the app.
2. If a **Restore from backup** button appears (e.g. “Restore from backup (7 items, 2026-03-03 14:30)”), click it. Your previous drafts will be restored so you can submit again or edit.
3. If the button doesn’t appear, try in the browser console (F12 → Console):
   - `Drafts.getBackup()` — see if a backup exists (object with `drafts` and `at`).
   - If it returns an object with a `drafts` array: `Drafts.restoreFromBackup()` then refresh the Drafts view or reload the page.

**Note:** The backup is from *before* the last Submit all. Some of those items may already have been submitted successfully. After restoring, remove or skip any that are already in Activities.

## 2. Where drafts and backup live (client)

- **Current drafts:** `localStorage` key `__pams_drafts__` (array of draft objects).
- **Backup (pre–Submit all snapshot):** `localStorage` key `__pams_drafts_backup__` (object `{ at, drafts }`).

Drafts are stored only in the browser; they are not sent to the server until you submit them.

## 3. Server “Lost & Found” (pending saves after 409)

When a save fails with a **409 conflict**, the server stores the rejected payload in the **pending_storage_saves** table (Lost & Found). This is not the same as “My drafts”; it only contains payloads that reached the server and were rejected.

- **List (admin only):** `GET /api/storage/pending`
  - Optional: `?hours=24` to limit to the last 24 hours; `?limit=200` (max 500).
- **Auth:** Admin user (e.g. `X-Admin-User` header or your admin auth).

To review last 24h from the command line (with env set):

```bash
# In project root, with .env containing REMOTE_STORAGE_BASE and REMOTE_STORAGE_USER (or API key)
node server/scripts/list-drafts-and-pending.js
# Or only server pending:
node server/scripts/list-drafts-and-pending.js --pending-only
node server/scripts/list-drafts-and-pending.js --hours=48
```

## 4. Backup files on disk

The `backups/` folder contains server storage snapshots (e.g. `storage-snapshot-*.json`). Those files only include keys that exist on the **server** (e.g. `activities`, `accounts`). The key `__pams_drafts__` is **client-only** and is not stored on the server, so normal server snapshots do **not** contain drafts.

If you have a separate export that includes localStorage (e.g. a merged or manual backup that has `__pams_drafts__`), you can:

- Run: `node server/scripts/list-drafts-and-pending.js` — it scans `backups/*.json` for any `__pams_drafts__` or `data.__pams_drafts__` and prints file name and count.
- To restore from such a file you’d need to copy the `__pams_drafts__` array into browser `localStorage` (e.g. via a small script or manually in the console).

## 5. Why drafts might vanish after Submit all

- **Success:** Each draft is removed only after its submit succeeds. If all 7–8 submitted successfully, the list correctly becomes empty and the activities appear under Activities.
- **Backup:** If something went wrong (e.g. partial submit then error), the in-browser backup should still hold the pre–Submit all list. Use **Restore from backup** (or `Drafts.restoreFromBackup()` in the console).
- **Different device/profile:** Drafts and backup are per-browser (per origin). They don’t sync across devices or browsers.

If you believe some drafts were removed without a successful submit, report it and we can check the Submit-all flow (each draft is removed only after a successful `persistDraftListByKey` / `addActivity` / etc.).
