# Deploy with pre-deploy snapshot

**Pre-deploy backup is non-negotiable.** Every deployment must be preceded by a full storage backup (activities, accounts, internal activities, and all other keys). If you deploy without a backup and the deploy causes data loss, that data cannot be recovered.

---

## 1. Deploy (backup runs automatically)

**Recommended:** Use the **Deploy** workflow so backup always runs first.

1. Open the repo on GitHub → **Actions**.
2. Select **"Deploy"** in the workflow list.
3. Click **"Run workflow"**.
4. Enter the **branch to deploy** (e.g. `main` to only run a backup, or your feature branch name like `feature/xyz` to backup then merge that branch into `main` and trigger Railway).
5. Click **"Run workflow"**.
6. The workflow will: **(1) Backup** production storage to `backups/pre-deploy-YYYYMMDDTHHMMSS.json` and push it, then **(2) Deploy** by merging your branch into `main` (if you didn’t choose `main`). Railway will deploy from the updated `main`.

You do **not** need to run a separate backup step; the Deploy workflow runs it for you.

---

## 2. Backup only (manual, if needed)

If you only want to run a backup without deploying:

### Option A – GitHub Actions

1. **Actions** → **"Pre-deploy backup"** → **Run workflow**.
2. Wait for it to finish (timestamped file is committed to `backups/`).

### Option B – Local (with credentials)

Set production storage URL and auth, then run the pre-deploy snapshot:

```powershell
# Windows PowerShell
$env:REMOTE_STORAGE_BASE = "https://your-app.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "storage-proxy"   # or your admin email / API key
npm run backup-before-deploy
```

```bash
# Linux / macOS
export REMOTE_STORAGE_BASE="https://your-app.up.railway.app/api/storage"
export REMOTE_STORAGE_USER="storage-proxy"
npm run backup-before-deploy
```

Snapshot is written to **`backups/pre-deploy-YYYYMMDDTHHMMSS.json`**. Commit this file (or keep it) before you deploy.

---

## 3. Deploy via push (without using the Deploy workflow)

If you deploy by pushing to `main` directly, you **must** run a backup first (Actions → **Pre-deploy backup** or `npm run backup-before-deploy`), then:

```bash
git add -A
git status
git commit -m "Your deploy message"
git push origin main
```

---

## 4. Restore (if data was lost after deploy)

If activities or other data disappeared after a deploy, restore from a snapshot you took earlier (pre-deploy or daily backup).

**Restore all keys (activities, accounts, internal activities, and shards) to production:**

```powershell
# Windows PowerShell
$env:REMOTE_STORAGE_BASE = "https://your-app.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "storage-proxy"
$env:SNAPSHOT_FILE = "backups\pre-deploy-YYYYMMDDTHHMMSS.json"   # or storage-snapshot-latest.json
$env:RESTORE_KEYS = "all"
npm run restore
```

```bash
# Linux / macOS
export REMOTE_STORAGE_BASE="https://your-app.up.railway.app/api/storage"
export REMOTE_STORAGE_USER="storage-proxy"
export SNAPSHOT_FILE="backups/pre-deploy-YYYYMMDDTHHMMSS.json"
export RESTORE_KEYS="all"
npm run restore
```

Then reload the app (hard refresh or new tab).

**Note:** Restore overwrites the selected keys on the server with the snapshot. Use the most recent pre-deploy (or daily backup) that still has the data you need.

---

## 5. Push January merged (backup + online) to production

If you combined backup and online snapshots and want to push only the **January 2026** merged data (142 external + full internal with 47 January) to production:

1. Ensure you have both snapshot files: `backups/pre-deploy-2026-02-04T16362831.json` (or your backup) and `backups/storage-snapshot-latest.json` (or a recent export of production).
2. Set `REMOTE_STORAGE_BASE` and auth (same as restore), then run:

```powershell
# Windows PowerShell
$env:REMOTE_STORAGE_BASE = "https://your-app.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "storage-proxy"
npm run push-january
```

```bash
# Linux / macOS
export REMOTE_STORAGE_BASE="https://your-app.up.railway.app/api/storage"
export REMOTE_STORAGE_USER="storage-proxy"
npm run push-january
```

This writes **`activities:2026-01`** (142 activities) and **`internalActivities`** (full list with merged January internal) to production. Reload the app to see the data.
