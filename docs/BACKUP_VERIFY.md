# Verify automatic backup ran

The daily storage backup runs via **GitHub Actions**:

- **Workflow:** `.github/workflows/daily-backup.yml`
- **Schedule:** `cron: '0 2 * * *'` (02:00 UTC every day)
- **Manual run:** Repo → **Actions** → "Daily storage backup" → **Run workflow**

## How to check

1. Open the repo on GitHub.
2. Go to **Actions**.
3. Select the workflow **"Daily storage backup"**.
4. Check the list of workflow runs for the expected dates (e.g. last 7 days).
5. If a run succeeded, the job will have committed `backups/storage-snapshot-latest.json` (see the "Commit and push snapshot" step).

## Requirements for the job to run

- **Secrets** must be set in the repo:
  - `REMOTE_STORAGE_BASE` – e.g. `https://your-app.up.railway.app/api/storage`
  - `REMOTE_STORAGE_USER` – (if your storage API requires it)
- If these are missing, the "Run storage snapshot export" step may fail; fix by adding the secrets under **Settings → Secrets and variables → Actions**.

## If the backup did not run

- Confirm the workflow file is on the default branch (e.g. `main`) and that the schedule is enabled (GitHub can disable schedules on inactive repos).
- Trigger a manual run from the Actions tab to confirm the job and secrets work.
