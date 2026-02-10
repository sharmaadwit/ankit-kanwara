# Restore suggestions/bugs from backup

The latest backup (`backups/storage-snapshot-latest.json`) **already contains** your suggestions and bugs data:

- **5 suggestions/bugs** (e.g. Product dropdown bug, Industry selection, Add BRL, Add Closed Date, Bulk Edit/Deletion)
- **9 pending industries** (Media, Transportation/Logistics, Wellness, Real Estate, NBFC, etc.)
- **4 pending use cases** (Customer Advisory, User Engagement, Customer Support Chatbot, Messaging)

If the live app is not showing them, restore only these keys from the snapshot (without overwriting activities or users).

---

## 1. Deploy the latest code (optional)

To get the backup/restore and feedback-key fixes live:

1. Commit and push your changes to your branch, then open **GitHub → Actions → Deploy**.
2. Run the workflow with branch = your current branch (e.g. `main` or feature branch).  
   This runs a pre-deploy backup, then merges to `main` and triggers Railway.

Or push directly to `main`; the snapshot-on-deploy workflow will run a backup after deploy.

---

## 2. Restore suggestions/bugs to live storage

From the project root, with your **live app storage URL** and auth set:

**PowerShell (Windows):**

```powershell
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "storage-proxy"
$env:RESTORE_KEYS = "suggestionsAndBugs,pendingIndustries,pendingUseCases"
npm run restore-feedback -- backups/storage-snapshot-latest.json
```

**Cmd (Windows):**

```cmd
set REMOTE_STORAGE_BASE=https://ankit-kanwara-production.up.railway.app/api/storage
set REMOTE_STORAGE_USER=storage-proxy
set RESTORE_KEYS=suggestionsAndBugs,pendingIndustries,pendingUseCases
npm run restore-feedback -- backups/storage-snapshot-latest.json
```

**Linux / macOS:**

```bash
export REMOTE_STORAGE_BASE=https://ankit-kanwara-production.up.railway.app/api/storage
export REMOTE_STORAGE_USER=storage-proxy
export RESTORE_KEYS=suggestionsAndBugs,pendingIndustries,pendingUseCases
npm run restore-feedback -- backups/storage-snapshot-latest.json
```

Then **reload the PAMS app** in the browser; the Suggestions & Bugs view and Admin pending items should show the restored data.

---

## 3. Inspect what’s in a backup (without restoring)

To list and print the feedback data from any snapshot:

```bash
npm run extract-feedback -- backups/storage-snapshot-latest.json
```

To save to a file:

```bash
npm run extract-feedback -- backups/storage-snapshot-latest.json -- --out recovered-feedback.json
```

(Note: `--` passes the following args to the script; `--out` is a script option.)
