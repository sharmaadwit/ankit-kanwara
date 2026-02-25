# Storage, cleanup, and Git backup

Keep Railway light and fast: see what’s using space, clean it regularly, and back up to Git so the app DB stays small.

---

## 1. See where the data is (storage visibility)

From the app (same tab, logged in as admin), open the console (F12) and run:

```javascript
fetch('/api/admin/cleanup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Admin-User':(typeof Auth!=='undefined'&&Auth.currentUser&&Auth.currentUser.username)?Auth.currentUser.username:''},body:JSON.stringify({sizeOnly:true})}).then(r=>r.json()).then(console.log).catch(console.error);
```

This **POST with `sizeOnly: true`** returns the same report as GET (and avoids HTML/redirect issues). The response includes:

- **tableSizes** – each table’s size (MB); biggest first.
- **total_mb** – total DB size.
- **topStorageKeys** – top 15 storage keys by value size (often `activities`, `accounts`, `internalActivities`, `users`).
- **storage_history** – row count and total value bytes (archives on every PUT; main growth source).
- **storage_mutations_rows** – mutation log rows.
- **pending_storage_saves_rows** – failed/conflict drafts.

Use this to see what’s causing the spike and what to clean.

---

## 2. What to clean (and how)

| What | Causes growth | Clean how |
|------|----------------|-----------|
| **storage** | Live data (activities, accounts, users). Don’t delete; this is your app data. | — |
| **storage_history** | Every PUT archives the previous value; no auto retention. | Cleanup (by date or retention). |
| **login_logs** | One row per login. | Cleanup (90-day retention in app; or by date). |
| **activity_logs** | One row per action. | Cleanup (14-day retention in app). |
| **storage_mutations** | Optimistic-update log. | Full cleanup (older than 30 days). |
| **pending_storage_saves** | Conflict/draft queue. | Full cleanup (older than 7 days). |

**No duplicacy removal** is done on live **storage** keys (that would change app data). Duplicates are trimmed by cleaning **storage_history**, **storage_mutations**, and **pending_storage_saves** (old rows only).

---

## 3. Run cleanup from the app

**Logs + storage_history (by date, e.g. before 2025-06-01):**

```javascript
fetch('/api/admin/cleanup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Admin-User':(typeof Auth!=='undefined'&&Auth.currentUser&&Auth.currentUser.username)?Auth.currentUser.username:''},body:JSON.stringify({deleteBeforeDate:'2025-06-01'})}).then(r=>r.json()).then(console.log).catch(console.error);
```

**Full cleanup (logs + history + storage_mutations + pending_storage_saves + VACUUM):**

```javascript
fetch('/api/admin/cleanup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Admin-User':(typeof Auth!=='undefined'&&Auth.currentUser&&Auth.currentUser.username)?Auth.currentUser.username:''},body:JSON.stringify({full:true})}).then(r=>r.json()).then(console.log).catch(console.error);
```

Use **full: true** periodically to keep mutations and pending saves small. Retention: storage_mutations &gt; 30 days, pending_storage_saves &gt; 7 days (env: `STORAGE_MUTATIONS_RETENTION_DAYS`, `PENDING_STORAGE_RETENTION_DAYS`).

---

## 4. Git backup (keep Railway light)

Back up storage (and optionally logs) to your repo so you have history without growing the DB.

**Option A – Storage snapshot only (existing script)**

From your machine (with `REMOTE_STORAGE_BASE` set to your app’s storage API):

```bash
cd "c:\Project PAT Master Folder\Project PAT"
set REMOTE_STORAGE_BASE=https://ankit-kanwara-production.up.railway.app/api/storage
node server/scripts/export-storage-snapshot.js
```

This writes to `backups/storage-snapshot-YYYY-MM-DDTHHMMSS.json`. Commit that file (and/or `backups/storage-snapshot-latest.json` if you symlink/copy) to Git. Add a `.gitignore` rule if you don’t want every snapshot (e.g. keep only `storage-snapshot-latest.json` or one per month).

**Option B – Backup folder in repo**

- Create a folder, e.g. `backups/` (already used for snapshots).
- Run the export script periodically (or use a scheduled job that calls your app’s export and then commits).
- Commit `backups/*.json` to Git so backups live in the repo; Railway only holds the current DB.

**What to back up to Git**

- **Storage snapshot** – full key/value dump (activities, accounts, users, config, etc.). Good for disaster recovery.
- **Logs** – optional; you can export login_logs/activity_logs via a one-off script or admin export and commit the file. For “light” Railway, prefer keeping only recent logs in the DB and backing up storage; old logs can be exported occasionally and committed.

**Result:** Railway DB stays small (cleanup + short retention); history lives in Git.

---

## 5. Suggested routine

1. **Weekly or after big changes:** Run **GET /api/admin/cleanup** (see step 1) to check sizes.
2. **When total_mb or storage_history is high:** Run **POST /api/admin/cleanup** with `full: true` (step 3).
3. **Before major changes or monthly:** Export storage snapshot (step 4) and commit to Git.
4. **Keep retention:** Login logs 90 days, activity logs 14 days, storage_history 90 days (already applied when you run cleanup). Full cleanup also trims mutations and pending saves.

This keeps the app storage minimal, avoids duplication where it’s safe (history, mutations, pending), and backs up data in Git so Railway stays light and functional.
