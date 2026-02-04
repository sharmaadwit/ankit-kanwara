# Deploy with pre-deploy snapshot

Before deploying, capture a snapshot of production data so you can restore if needed.

## 1. Capture snapshot (before deploy)

**Option A – Local (with credentials)**

Set your production storage URL and auth, then run:

```bash
# Windows PowerShell
$env:REMOTE_STORAGE_BASE = "https://your-app.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin-email"   # or set REMOTE_STORAGE_API_KEY if using API key
node scripts/snapshot-before-deploy.js

# Or pass URL as argument (auth still from env)
node scripts/snapshot-before-deploy.js https://your-app.up.railway.app/api/storage
```

```bash
# Linux / macOS
export REMOTE_STORAGE_BASE="https://your-app.up.railway.app/api/storage"
export REMOTE_STORAGE_USER="your-admin-email"
node scripts/snapshot-before-deploy.js
```

Snapshot is written to **`backups/pre-deploy-YYYYMMDDTHHMMSS.json`**. Keep this file (or commit it) as your restore point.

**Option B – GitHub Actions**

1. Open the repo → **Actions** → **Daily storage backup**.
2. Click **Run workflow** and run it.
3. Snapshot is committed to **`backups/storage-snapshot-latest.json`**.

## 2. Deploy

Deploy as you usually do (e.g. push to `main` if Railway auto-deploys):

```bash
git add -A
git status
git commit -m "Your deploy message"
git push origin main
```

## 3. Restore (if needed)

If something goes wrong after deploy:

- Use the pre-deploy snapshot file (e.g. `backups/pre-deploy-*.json` or `backups/storage-snapshot-latest.json`).
- Restore flow depends on your setup: import script or admin restore that writes snapshot data back to the storage API. See `server/scripts/` and `docs/DAILY_BACKUP_SETUP.md` for restore options.
