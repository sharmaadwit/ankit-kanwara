# Deploy checklist – capture build number and snapshot before deploy

Before **every** deploy (and especially before testing migration or major changes):

1. **Capture the build number currently live in production** and take a **full snapshot of all data** (industries, users, accounts, activities, internalActivities, config, etc.).
2. Then deploy and test.

---

## Step 1: Run pre-deploy snapshot (build number + full data)

From the **Project PAT** directory, with production URL and (if required) admin user:

```bash
# Set your production storage API base and, if your API requires it, admin user
set REMOTE_STORAGE_BASE=https://YOUR-APP.up.railway.app/api/storage
set REMOTE_STORAGE_USER=your-admin@example.com

npm run snapshot-before-deploy
```

Or in one line:

```bash
REMOTE_STORAGE_BASE=https://YOUR-APP.up.railway.app/api/storage REMOTE_STORAGE_USER=your-admin@example.com npm run snapshot-before-deploy
```

**What this does:**

- Calls production **GET /api/version** and records the **current production build number** (version + buildId).
- Exports **all** storage keys from production (industries, users, accounts, activities, internalActivities, regions, globalSalesReps, universalUseCases, industryUseCases, config, activity shards, etc.) into a timestamped snapshot file.
- Writes:
  - **`backups/pre-deploy-YYYY-MM-DDTHHMMSS.json`** – full snapshot with `productionVersionAtSnapshot` and `productionBuildIdAtSnapshot` at the top level.
  - **`backups/pre-deploy-manifest-YYYY-MM-DDTHHMMSS.json`** – short manifest with build number and snapshot path.
  - **`backups/local-insurance-YYYY-MM-DDTHHMMSS.json`** – same as snapshot (local copy; keep, do not push).

**Note:** The script needs to **reach production**. If you run it from your machine, production must be publicly reachable and (if your API uses auth) you must pass the same credentials your app uses (e.g. cookie or X-Admin-User). If you run it from a CI job, set `REMOTE_STORAGE_BASE` (and any auth) for the live app.

---

## Step 2: Record “previous build name” (optional but recommended)

- Open **`backups/pre-deploy-manifest-<timestamp>.json`** and note:
  - **`productionVersionAtSnapshot`** – app version that was live (e.g. `1.0.1`).
  - **`productionBuildIdAtSnapshot`** – deployment id if set (e.g. Railway deploy ID or commit SHA).
- Share this **“previous build name”** with the team (e.g. in your deploy ticket or Slack): “Pre-deploy snapshot taken; production was **version 1.0.1**, buildId **abc123**. Snapshot: `backups/pre-deploy-<timestamp>.json`.”

---

## Step 3: Deploy

- Deploy your new code (e.g. push to `main`, trigger Railway deploy).
- After deploy, the **new** build will be live; the snapshot you took is the state **before** this deploy.

---

## Step 4: Test

- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) and test as needed.
- If something goes wrong, you can restore from the snapshot using the restore script (see server docs or `restore-storage-from-snapshot.js`).

---

## API: current production build number

- **GET /api/version** (no auth) returns:
  - **`version`** – from `package.json` or `APP_VERSION` env.
  - **`buildId`** – from `BUILD_ID`, `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_DEPLOYMENT_COMMIT_SHA`, or `VERCEL_GIT_COMMIT_SHA` if set.
- Use this to know what is **currently live** before you run the snapshot (the snapshot script calls it for you and stores the result in the snapshot and manifest).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Run `npm run snapshot-before-deploy` with `REMOTE_STORAGE_BASE` (and auth if needed). |
| 2 | Note “previous build name” from `backups/pre-deploy-manifest-<timestamp>.json` and share with team. |
| 3 | Deploy. |
| 4 | Test; if needed, restore from snapshot. |

Snapshot = **full application data** (all storage keys). Build number = **version + buildId** that was live at snapshot time.
