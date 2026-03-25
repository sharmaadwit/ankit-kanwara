# Local dev: reports update + data snapshot

## Reports update on deployed version

The **PDF manual wins** (Prabhudas Liladhar Capital, YouTube Shopping) are in the repo and committed. To get them on the **live app**:

1. Push to your deploy branch (e.g. `main`):  
   `git push origin main`  
   Railway (or your host) will redeploy; the Reports → Monthly → March 2026 PDF will then show the two new wins.

2. Test on the deployed URL (e.g. `https://ankit-kanwara-production.up.railway.app`):  
   Reports → Monthly → select **March 2026** → open **Monthly report (PDF)** → check the **Wins** section.

---

## Download data snapshot for local testing

To pull a **fresh storage snapshot** from production into `backups/` (so you have real data for local scripts or restore):

1. In the **Project PAT** folder, ensure `.env` has:
   - `REMOTE_STORAGE_BASE=https://ankit-kanwara-production.up.railway.app/api/storage`
   - `REMOTE_STORAGE_USER=` your admin email (the one you use to log in)

2. Run:
   ```powershell
   npm run backup
   ```
   The script will write a file under `backups/` (e.g. `storage-snapshot-20260309T….json`).

If you get **401 Unauthorized**, the app requires auth: set `REMOTE_STORAGE_USER` (or `REMOTE_STORAGE_API_KEY` if your app uses that) in `.env` and run again.

You already have some snapshot files in `backups/` (e.g. `merged-for-restore-*.json`, `from-git-*.json`) from earlier runs; you can use those for restore or comparison without re-downloading.
