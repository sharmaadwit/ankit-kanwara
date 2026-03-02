# Hourly backup (7-day trial)

## What’s on

- **Workflow:** `.github/workflows/hourly-backup-7days.yml`
- **Schedule:** Runs **every hour** (at :00 UTC).
- **Storage:** Each run creates `backups/storage-snapshot-YYYY-MM-DD-HH.json` and updates `backups/storage-snapshot-latest.json`, then commits and pushes to Git.
- **Retention:** Only the last **168** hourly files (7 days × 24 hours) are kept; older ones are removed before each commit.

## Requirements

- Repo secrets must be set (same as daily backup):
  - **REMOTE_STORAGE_BASE** – e.g. `https://your-app.up.railway.app/api/storage`
  - **REMOTE_STORAGE_USER** – admin email for storage API auth

## After 7 days

To stop hourly backups:

1. Open the repo on GitHub → **Actions**.
2. Click **Hourly backup (7 days)** in the left sidebar.
3. Click **⋯** (or “Disable workflow”) and choose **Disable workflow**.

Or delete the file:

- Remove `.github/workflows/hourly-backup-7days.yml` and push. The workflow will no longer run.

The daily backup workflow is unchanged and continues to run on its normal schedule.
