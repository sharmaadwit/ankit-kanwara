# Merge backups and push restored data

## What was done

1. **Merge script added:** `server/scripts/merge-backups-and-restore.js`
   - Reads all `backups/storage-snapshot-*.json` and `backups/pre-deploy-*.json`
   - Merges **activities** from every file (by id, newer `updatedAt` wins) so Jan/Feb and other months are recovered from any backup that had them
   - Merges **accounts** and **internalActivities** the same way
   - Builds sharded activities (manifest + `activities:YYYY-MM` buckets) and writes one snapshot

2. **Merge run (dry-run then full):**
   - **Merged:** 3104 activities, 1646 accounts, 150 internalActivities (more than any single backup)
   - **Output file:** `backups/merged-for-restore-2026-03-02T0441.json`
   - **Push:** Failed with **401 Unauthorized** because the restore step needs auth

## How to push the merged snapshot

From the project root, with **auth** set so the server accepts storage PUTs:

```powershell
cd "c:\Project PAT Master Folder\Project PAT"

# Option A: admin user (same as when you log in to the app)
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin-email@example.com"
node server/scripts/merge-backups-and-restore.js --push
```

Or use the merged file directly with the existing restore script:

```powershell
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin-email@example.com"
$env:SNAPSHOT_FILE = "backups/merged-for-restore-2026-03-02T0441.json"
node server/scripts/restore-storage-from-snapshot.js
```

**Option B:** If your server uses an API key for storage:

```powershell
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_API_KEY = "your-storage-api-key"
node server/scripts/restore-storage-from-snapshot.js backups/merged-for-restore-2026-03-02T0441.json
```

After a successful push, reload the app; you should see the merged activities (including recovered Jan/Feb where present in backups).

## Re-run merge only (no push)

To regenerate the merged snapshot from backups (e.g. after adding more backup files):

```powershell
node server/scripts/merge-backups-and-restore.js --dry-run
```

This writes a new `backups/merged-for-restore-YYYY-MM-DDTHHMMSS.json` and does not call the remote.
