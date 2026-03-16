# Backup retention and archive

## Current policy (reduce size)

- **One backup file in repo:** `backups/storage-snapshot-latest.json` only.
- **Daily:** GitHub Action runs **once per day at 9 AM IST** (03:30 UTC). It overwrites `storage-snapshot-latest.json` and commits it. No dated copies; no 15-day retention.
- **On deploy:** Pushing to `main` triggers `snapshot-on-deploy.yml`, which also overwrites `storage-snapshot-latest.json` (so every deploy leaves one snapshot).

## Archive folder (merged older backups)

Before purging, you can merge all existing backups into a single file and store it locally:

- **Folder:** `backups/archive/`
- **Script:** `npm run purge-and-archive-backups`
  - Merges all `storage-snapshot-*.json` and `pre-deploy-*.json` (activities/accounts/internalActivities by id, newer wins).
  - Writes **`backups/archive/merged-archive-YYYY-MM-DD.json`**.
  - Keeps only the newest backup as **`backups/storage-snapshot-latest.json`** and deletes all other backup files from `backups/`.
- **Dry run:** `node server/scripts/purge-and-archive-backups.js --dry-run` (no writes or deletes).

Run this once locally to shrink the repo; then the daily workflow keeps only one file going forward. You can commit `backups/archive/` if you want the merged history in the repo, or keep it local only.

## Why backups can fail (CI) and how to fix

Backups in GitHub Actions often fail for one of these reasons:

1. **Missing secrets**  
   The workflow now fails fast with an error if `REMOTE_STORAGE_BASE` is not set.  
   **Fix:** In the repo go to **Settings → Secrets and variables → Actions** and add:
   - **REMOTE_STORAGE_BASE** – full storage API URL, e.g. `https://YOUR-APP.up.railway.app/api/storage` (no trailing slash is fine).
   - **REMOTE_STORAGE_USER** – an admin username or email (sent as `X-Admin-User`; the server uses this for storage auth in CI).

2. **401 Unauthorized**  
   The server may require an API key, or the header user may not be allowed.  
   **Fix:** If your Railway app has **STORAGE_API_KEY** set, add the same value in GitHub as **REMOTE_STORAGE_API_KEY**. The backup script will send it as `X-Api-Key`.  
   Also ensure **REMOTE_STORAGE_USER** is a valid Admin user in the app’s `users` table if the server checks it.

3. **Wrong REMOTE_STORAGE_BASE**  
   The base must be the storage API root (so that `GET <base>` returns the key list and `GET <base>/activities` returns the value).  
   **Fix:** Use `https://YOUR-APP.up.railway.app/api/storage` (include `/api/storage`).

After adding or fixing secrets, re-run the failed workflow (Actions → select the run → “Re-run all jobs”).

---

## Summary

| What                | When / where                          |
|---------------------|----------------------------------------|
| Daily backup        | 9 AM IST (1 run/day); overwrites latest |
| Deploy snapshot     | On push to `main`; overwrites latest   |
| Purge + archive     | One-time: `npm run purge-and-archive-backups` |
| Kept in repo        | `storage-snapshot-latest.json` (+ optional `backups/archive/`) |
