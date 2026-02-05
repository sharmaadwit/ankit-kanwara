# Daily Data Backup Setup

Automated daily backup of hosted storage using **GitHub Actions** (recommended) or **Railway cron**. The script `server/scripts/export-storage-snapshot.js` exports all storage keys from your live app into a JSON snapshot.

---

## What is the “live app storage API URL”? Where do I find it?

The **live app storage API URL** is the full URL of your **deployed** PAMS app’s storage endpoint. It always has this form:

`https://YOUR-APP-HOST/api/storage`

- **YOUR-APP-HOST** = the domain where your app is actually running (e.g. on Railway: `something.up.railway.app`).
- The path **`/api/storage`** is fixed; your server exposes storage at that path.

### Where to find it

**Option 1 – From the URL you use to open PAMS**

1. Open the app in your browser the way you normally do (e.g. a bookmark or a link from Railway).
2. Look at the **address bar**. You’ll see something like:  
   `https://ankit-kanwara-production.up.railway.app`  
   or  
   `https://project-pams-v2.up.railway.app`
3. Your **storage API URL** is that same URL with `/api/storage` added at the end (no extra path before it).  
   Examples:
   - If the app opens at `https://ankit-kanwara-production.up.railway.app`  
     → Storage API URL: `https://ankit-kanwara-production.up.railway.app/api/storage`
   - If the app opens at `https://project-pams-v2.up.railway.app`  
     → Storage API URL: `https://project-pams-v2.up.railway.app/api/storage`

**Option 2 – From Railway (if you deploy there)**

1. Go to **https://railway.app** and log in.
2. Open the **project** that contains your PAMS app.
3. Click the **service** that runs the web app (the one that serves the Node/Express server).
4. Open the **Settings** tab (or the **Deployments** tab and click the latest deployment).
5. Find **Public networking** or **Domains**. You’ll see the public URL, e.g. `your-app.up.railway.app`.
6. Your storage API URL is: `https://that-exact-host/api/storage`  
   (e.g. `https://your-app.up.railway.app/api/storage`).

**Option 3 – From the browser (Network tab)**

1. Open your **live** PAMS app in the browser and log in so the app loads data.
2. Open **Developer Tools** (F12 or right‑click → Inspect).
3. Go to the **Network** tab.
4. Refresh the page or perform an action that loads data (e.g. open Dashboard).
5. In the list of requests, find one whose URL contains **`/api/storage`** (e.g. `https://something.up.railway.app/api/storage` or `.../api/storage?keys=...`).
6. Click that request; the **full request URL** at the top is your storage API base (everything up to and including `/api/storage`). Use that as **REMOTE_STORAGE_BASE**.

**Summary:** Use the same host you use to open the app, add `https://` if needed, and append `/api/storage` with no trailing slash (e.g. `https://ankit-kanwara-production.up.railway.app/api/storage`).

---

## Step-by-step: Enable daily backup (GitHub Actions)

Do this once; after that, backups run daily at 02:00 UTC and you can run them manually anytime.

---

### Part A: Add the two repository secrets

You need to add two secrets so the backup workflow can call your live app’s storage API. Follow these steps exactly.

#### A1. Open your repository in the browser

1. Open a browser and go to: **https://github.com/sharmaadwit/ankit-kanwara**
   - (If your repo lives under a different org/user, replace `sharmaadwit/ankit-kanwara` with `OWNER/REPO`.)

#### A2. Go to the Settings tab

1. At the **top** of the repo page you’ll see: **Code** | **Issues** | **Pull requests** | **Actions** | **Projects** | **Wiki** | **Security** | **Insights** | **Settings**.
2. Click **Settings**.
3. You are now on the repository **Settings** page. (If you don’t see “Settings”, you may not have admin/maintainer access to this repo.)

#### A3. Open “Secrets and variables” → “Actions”

1. In the **left sidebar** of Settings, find the section **“Secrets and variables”**.
2. Under it, click **Actions**.
3. You’ll see the **Actions secrets and variables** page:
   - **Repository secrets** (and optionally **Variables**).
   - A green button: **“New repository secret”**.

#### A4. Add the first secret: `REMOTE_STORAGE_BASE`

1. Click the green **“New repository secret”** button.
2. On the “New secret” form:
   - **Name** (first field): type exactly: `REMOTE_STORAGE_BASE`
   - **Secret** (second field): paste your **live app’s storage API URL**, e.g.  
     `https://ankit-kanwara-production.up.railway.app/api/storage`  
     Use your real Railway (or hosting) app URL; only the host part changes (e.g. `your-app.up.railway.app`), path should end with `/api/storage`.
3. Click **“Add secret”** at the bottom.
4. You’ll return to the Actions secrets list. You should see **REMOTE_STORAGE_BASE** listed (the value is hidden).

#### A5. Add the second secret: `REMOTE_STORAGE_USER`

1. Click **“New repository secret”** again.
2. On the “New secret” form:
   - **Name:** type exactly: `REMOTE_STORAGE_USER`
   - **Secret:** type exactly: `storage-proxy`  
     (This matches the header the PAMS frontend uses; your server accepts it for storage API access.)
3. Click **“Add secret”**.
4. Back on the secrets list you should now see both **REMOTE_STORAGE_BASE** and **REMOTE_STORAGE_USER**.

You’re done with secrets. Next: run the backup once to confirm it works.

---

### Part B: Run the first backup (manual run)

#### B1. Go to the Actions tab

1. At the **top** of the repo page, click **Actions** (same row as Code, Issues, Pull requests, etc.).
2. You’re on the **Actions** page. The left sidebar shows workflow names.

#### B2. Select the “Daily storage backup” workflow

1. In the **left sidebar**, under **“All workflows”**, find and click **“Daily storage backup”**.
2. The main area will show **“Daily storage backup”** and a yellow **“Run workflow”** dropdown button on the right.

#### B3. Trigger the workflow run

1. Click the **“Run workflow”** dropdown (yellow button).
2. A small panel opens. Leave **Branch** as **main** (or your default branch).
3. Click the green **“Run workflow”** button inside that panel.
4. The page will refresh; you’ll see a new run at the top with a yellow “in progress” icon.

#### B4. Open the run and see the steps (where to click)

After you click **Run workflow**, the page shows a list of workflow runs. Follow these steps to open **your** run and see each job step.

1. **Find your run in the list**
   - You stay on the same **Actions** page. In the **main (centre) area**, you’ll see a **list of runs**.
   - Each run is **one row**: on the left it shows the run title (e.g. “Run workflow” or the commit message), and on the right a **status icon**:
     - **Yellow circle** = in progress  
     - **Green check** = success  
     - **Red X** = failed  
   - Your new run is the **first row** at the top. Click **that whole row** (anywhere on the row) to open it.

2. **Open the run details page**
   - After you click the row, the page changes. You’re now on the **run details** page.
   - At the top you’ll see the run title again and the status (e.g. “Run workflow” with a green check or red X).
   - Below that you’ll see **one job**: a box titled **“backup”** (with the same status icon: yellow / green / red).  
   - **Click the “backup” box** (click on the word “backup” or inside that box).

3. **See the steps inside the job**
   - After you click **backup**, the box expands and you’ll see the **list of steps**:
     - **Checkout repository**
     - **Setup Node.js**
     - **Run storage snapshot export**
     - **Commit and push snapshot**
   - Each step has a **green check** (passed), **red X** (failed), or **yellow circle** (running).
   - **Wait** until all four show a green check (about 1–2 minutes). If the run is still in progress, refresh the page after a short wait.

4. **If a step failed (red X)**
   - Click the **step name** that has the red X (e.g. “Run storage snapshot export” or “Commit and push snapshot”).
   - The **log** for that step opens below. Read the error message:
     - **“Run storage snapshot export”** failed → usually wrong **REMOTE_STORAGE_BASE** or missing **REMOTE_STORAGE_USER** (or your live app is down). Fix the secrets in **Settings → Secrets and variables → Actions** and run the workflow again.
     - **“Commit and push snapshot”** failed → often a permissions or push error; the snapshot may have been created but not committed. Check the log for the exact error.

5. **If “Commit and push snapshot” shows a hollow circle (skipped)**
   - That step only runs when the file **backups/storage-snapshot-latest.json** exists after the export. If the export wrote a different filename (e.g. before the workflow was fixed) or the file wasn’t created, the step is **skipped** and no backup is committed.
   - A workflow fix ensures the export step always writes **backups/storage-snapshot-latest.json**. After pulling the latest code and re-running the workflow, “Commit and push snapshot” should run (green check) and the backup file will appear under **Code → backups/**.

#### B5. Confirm the backup file was committed

1. Go back to the repo root: click the repo name at the top, or open **https://github.com/sharmaadwit/ankit-kanwara**.
2. Click the **Code** tab so you see the file tree.
3. In the file tree, open the **backups** folder.
4. You should see **storage-snapshot-latest.json** (or it was just updated). You can click it to see the JSON (it’s the full storage snapshot).
5. Optionally, click **Commits** above the file tree and check the latest commit message: it should be something like **“chore: daily storage snapshot backup [skip ci]”**.

---

### You’re done

- Backups will run **automatically every day at 02:00 UTC**.
- To run a backup **manually** anytime: **Actions** (top bar) → **Daily storage backup** (left sidebar) → **Run workflow** (dropdown) → **Run workflow** (green button).

---

## Auto run (schedule)

- **Enabled:** The workflow is triggered on a **schedule** as well as manually.
- **When:** **Every day at 02:00 UTC** (`cron: '0 2 * * *'` in `.github/workflows/daily-backup.yml`).
- **What runs:** The same job as a manual run: export all storage keys from your live app → write `backups/storage-snapshot-latest.json` → commit and push to the branch (usually `main`).
- You do not need to do anything for auto run once the workflow and secrets are in place.

---

## What the backup contains

The snapshot file **backups/storage-snapshot-latest.json** includes:

- **generatedAt** – ISO timestamp of the export.
- **source** – Storage API base URL that was backed up.
- **totalKeys** – Number of keys exported.
- **data** – Object mapping **every storage key** to its **decoded value** (JSON where applicable).

**How it’s built:** The script calls your live app’s storage API: (1) `GET /api/storage` to list all keys, (2) `GET /api/storage/:key` for each key. Values stored with `__lz__` (LZString) or `__gz__` (gzip) are decompressed before being written to the snapshot.

**What the PAMS app stores (all are captured if present):**

| Key | Purpose |
|-----|--------|
| `accounts` | Account/project list |
| `activities` | Legacy single-key activities (if still used) |
| `activities:YYYY-MM` | Activity shards by month (e.g. `activities:2026-01`) |
| `__shard_manifest:activities__` | Manifest for activity shards |
| `internalActivities` | Internal activities |
| `users` | User list |
| `globalSalesReps` | Sales reps |
| `regions` | Regions |
| `industries` | Industries |
| `industryUseCases` | Industry → use cases mapping |
| `pendingIndustries` | Pending industry suggestions |
| `pendingUseCases` | Pending use case suggestions |
| `suggestionsAndBugs` | Suggestions/bugs list |
| `presalesActivityTarget` | Presales activity target |
| `analyticsAccessConfig` | Analytics access config |
| `analyticsTablePresets` | Analytics table presets |
| `interfacePreference` | UI preference |
| `colorSchemePreference` | Theme preference |

The backup does **not** filter keys: it exports **every key** returned by the storage API. So anything your app writes to remote storage (including any future keys) is included. The only data not in this backup is anything that lives **outside** the storage API (e.g. other DB tables or external services); for PAMS, app state is in storage, so the snapshot is a full backup of that state.

---

## Prerequisites

- **REMOTE_STORAGE_BASE** – Your app’s storage API base URL (e.g. `https://your-app.up.railway.app/api/storage`).
- **REMOTE_STORAGE_USER** (optional) – Sent as `X-Admin-User`. Use `storage-proxy` if your server allows it (same as the PAMS frontend); otherwise use an admin username or set **REMOTE_STORAGE_API_KEY** to match `STORAGE_API_KEY` on the server.
- **REMOTE_STORAGE_HEADERS** (optional) – JSON object of extra headers if needed.

---

## Run backup now (manual)

From the project root, with env vars set:

**Windows (PowerShell):**
```powershell
$env:REMOTE_STORAGE_BASE = "https://your-app.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin-email"   # optional
npm run backup
```

**Linux / macOS:**
```bash
REMOTE_STORAGE_BASE="https://your-app.up.railway.app/api/storage" npm run backup
```

Output is written to:
- **Default:** `backups/storage-snapshot-<timestamp>.json`
- **Override:** set `SNAPSHOT_FILE=backups/storage-snapshot-latest.json` for a fixed filename, or `SNAPSHOT_DIR` for a different directory.

---

## Option B: Railway cron (daily on Railway)

Run the backup **on Railway** on a schedule. Snapshots are written to the filesystem; use a **volume** so they persist.

### 1. New service for backup

1. In your Railway project, add a **new service** (same repo as your app).
2. **Build:** same as main app (e.g. no build, or `npm install` if you need deps).
3. **Start command:**
   ```bash
   node server/scripts/export-storage-snapshot.js
   ```
   The script runs once and exits, which is required for cron.

### 2. Environment variables

On this service, set:

- **REMOTE_STORAGE_BASE** = `https://<your-main-app>.up.railway.app/api/storage` (your live app URL).
- **REMOTE_STORAGE_USER** (optional) – admin user if your storage API requires it.
- **SNAPSHOT_DIR** (optional) – e.g. `/data/backups` if you mount a volume at `/data`.

### 3. Cron schedule

1. Open the backup service → **Settings**.
2. Under **Cron Schedule**, set a crontab expression (UTC), e.g.:
   - `0 8 * * *` – daily at 08:00 UTC  
   - `0 2 * * *` – daily at 02:00 UTC  
3. Save. Railway will run this service on that schedule.

### 4. Persist snapshots (recommended)

Railway’s filesystem is ephemeral. To keep backups:

1. Add a **volume** to the backup service and mount it (e.g. at `/data`).
2. Set **SNAPSHOT_DIR** = `/data/backups` (or similar).
3. Snapshots will be stored on the volume across runs.

---

## Option C: GitHub Actions (daily in the repo)

The workflow **`.github/workflows/daily-backup.yml`** runs the backup and commits the latest snapshot to the repo.

### 1. Secrets

In the repo: **Settings → Secrets and variables → Actions**, add:

- **REMOTE_STORAGE_BASE** (required) – e.g. `https://your-app.up.railway.app/api/storage`
- **REMOTE_STORAGE_USER** (optional) – admin user if your API needs it

### 2. Schedule and manual run

- **Schedule:** runs daily at **02:00 UTC**.
- **Manual run:** **Actions → “Daily storage backup” → Run workflow**.

### 3. Where the backup is stored

The workflow writes the snapshot to **`backups/storage-snapshot-latest.json`** and commits it to the branch that ran the workflow (usually `main`). Each run overwrites this file so the repo doesn’t grow with many copies.

---

## Summary

| Method              | When it runs        | Where snapshot goes                          |
|---------------------|--------------------|----------------------------------------------|
| **Manual**          | When you run it    | `backups/` (or `SNAPSHOT_DIR` / `SNAPSHOT_FILE`) |
| **Railway cron**    | Per cron schedule  | Service filesystem (use a volume to persist) |
| **GitHub Actions**  | Daily 02:00 UTC + manual | `backups/storage-snapshot-latest.json` in repo |

After adding **REMOTE_STORAGE_BASE** (and optional **REMOTE_STORAGE_USER**) for Option B or C, automation is in place. To run a backup **right now**:

1. **GitHub Actions:** Repo → **Actions** → **Daily storage backup** → **Run workflow** (after adding the secrets below).
2. **Local:** Set `REMOTE_STORAGE_BASE` and run `npm run backup` (see “Run backup now” above).
