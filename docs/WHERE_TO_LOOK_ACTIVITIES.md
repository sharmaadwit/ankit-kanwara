# Where to look when Activities are missing (admin)

If you did activities yesterday but nothing shows in the app, check these in order.

---

## 1. Server Lost & Found (pending saves after 409)

When a save hit a conflict (409), the rejected payload is stored in **pending_storage_saves**. As admin you can list them.

From **Project PAT** folder (with `.env` containing `REMOTE_STORAGE_BASE` and `REMOTE_STORAGE_USER` or API key):

```bash
node server/scripts/list-drafts-and-pending.js --pending-only --hours=48
```

If you see rows for `storage_key` = `activities` (or `activities:YYYY-MM`), that payload can be re-applied (script or manual step). If nothing appears, your save may not have hit 409.

---

## 2. Backup files (best way to restore)

Hourly/deploy snapshots are in **`backups/`**. Each file has a full copy of storage at that time, including activities.

**See how many activities are in recent backups:**

```bash
node server/scripts/activity-count-in-backups.js
```

Or manually for one file (PowerShell, from Project PAT):

```powershell
node -e "const d=require('./backups/storage-snapshot-2026-03-04.json'); const data=d.data||d; let c=0; Object.keys(data).filter(k=>k==='activities'||k.startsWith('activities:')).forEach(k=>{const v=data[k]; c+=Array.isArray(v)?v.length:0;}); console.log('Activities:', c);"
```

**Restore activities from a backup file to the live app:**

From **Project PAT**, with `.env` set (`REMOTE_STORAGE_BASE`, `REMOTE_STORAGE_USER` or API key):

```bash
set REMOTE_STORAGE_BASE=https://YOUR-APP.up.railway.app/api/storage
set REMOTE_STORAGE_USER=your-admin-email

REMOTE_STORAGE_BASE=https://YOUR-APP.up.railway.app/api/storage REMOTE_STORAGE_USER=your-admin-email node server/scripts/restore-storage-from-snapshot.js backups/storage-snapshot-2026-03-04.json
```

To restore **only** the `activities` key (and activity shards) and leave other keys untouched:

```bash
set RESTORE_KEYS=activities
node server/scripts/restore-storage-from-snapshot.js backups/storage-snapshot-2026-03-04.json
```

(You must still set `REMOTE_STORAGE_BASE` and admin auth.) The script restores every key that matches: `activities` and `activities:YYYY-MM`. After it finishes, **hard-refresh the app** (Ctrl+Shift+R) and check Activities.

Pick a snapshot from **when you still had data** (e.g. yesterday morning or last good day). Example names: `storage-snapshot-2026-03-04.json`, `storage-snapshot-2026-03-03-14.json`.

---

## 3. Storage history (DB archive)

Every time a storage key is overwritten, the **previous** value is saved in the **storage_history** table. So if "activities" was overwritten, the old value may still be in the DB.

There is no built-in UI for this. A DB admin can run:

```sql
SELECT key, updated_at, archived_at, length(value) AS value_length
FROM storage_history
WHERE key = 'activities' OR key LIKE 'activities:%'
ORDER BY archived_at DESC
LIMIT 20;
```

To restore from that you’d need to export the `value` of the chosen row and push it back via the storage API or a one-off script. If you use backup files (section 2), you usually don’t need this.

---

## Summary

| Where              | What to do |
|--------------------|------------|
| **Pending (409)**  | Run `list-drafts-and-pending.js --pending-only --hours=48`. If activities payload appears, re-apply it. |
| **Backup files**   | Use `restore-storage-from-snapshot.js` with a snapshot from when data was good (e.g. `backups/storage-snapshot-2026-03-04.json`). Optionally `RESTORE_KEYS=activities`. Then refresh the app. |
| **Storage history**| Query DB for recent archived `activities`; export and re-push if needed. |

Most reliable: **restore from a backup file** (section 2) from yesterday or today that has the right activity count.
