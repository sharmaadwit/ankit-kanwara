# Staging / build failures – check and logs (last 12 hours)

## What was checked

- **GitHub Actions** workflow runs for repo `sharmaadwit/ankit-kanwara` (API used for recent runs).
- **“Staging”** – This repo deploys one app to Railway (`ankit-kanwara-production`). There is no separate staging workflow in the repo; “builds” here = GitHub Actions (backup/snapshot) and Railway deploys (triggered by push to `main`).

---

## GitHub Actions – last 12 hours

From the latest runs (roughly last 24–48 hours of data):

- **Hourly backup (7 days)** – multiple runs, all **success**.
- **Snapshot on deploy** – recent runs **success** (e.g. 2026-03-02 04:47, 05:58).
- **Daily storage backup** – **success**.

So in the **recent** runs there are **no failures in the last 12 hours**.

---

## One past failure (outside last 12h)

- **Workflow:** Snapshot on deploy  
- **When:** 2026-02-26 09:50 UTC  
- **Run:** https://github.com/sharmaadwit/ankit-kanwara/actions/runs/22436759254  
- **Failed step:** **“Run storage snapshot”** (step 5 – runs `export-storage-snapshot.js`).  
- **Commit:** `f0256a9` (“Railway: health check /api/health, static logging, 404 troubleshootin…”).

**Likely cause:** The snapshot script calls your app’s storage API (`REMOTE_STORAGE_BASE`). It can fail with:

1. **401 Unauthorized** – secrets `REMOTE_STORAGE_BASE` or `REMOTE_STORAGE_USER` missing/wrong in repo **Settings → Secrets and variables → Actions**.
2. **Network/timeout** – app or network temporarily down when the job ran.
3. **Non-2xx from GET /** – e.g. 500 from the app.

So the only failure we see is an **older** “Snapshot on deploy” run; nothing failing in the last 12 hours in GitHub Actions.

---

## How to check logs yourself

### GitHub Actions (last 12 hours)

1. Open: https://github.com/sharmaadwit/ankit-kanwara/actions  
2. Click each workflow (e.g. “Hourly backup (7 days)”, “Snapshot on deploy”, “Daily storage backup”).  
3. Open any run (green = success, red = failure).  
4. Open the job and expand the failed step to see the log (e.g. “Run storage snapshot” or “Run hourly storage snapshot”).

### Railway (deploy/build logs)

Railway builds and runtime logs are **not** in this repo. To see “staging” or deploy failures there:

1. Go to https://railway.app → your project.  
2. Open the **service** (e.g. ankit-kanwara-production).  
3. **Deployments** tab – see recent deploys; red = failed build/deploy.  
4. **Logs** (or “View logs”) – build output and runtime logs for the last period (e.g. 12 hours).

If you have a **separate Railway “staging” service**, use the same steps for that service.

---

## If “Snapshot on deploy” or “Hourly backup” keeps failing

1. **Secrets**  
   In GitHub: **Settings → Secrets and variables → Actions** ensure:
   - `REMOTE_STORAGE_BASE` = `https://ankit-kanwara-production.up.railway.app/api/storage`  
   - `REMOTE_STORAGE_USER` = your admin email (or the account that can call the storage API).

2. **App up**  
   When the workflow runs, the app must be up and returning 200 for `GET /api/storage`. If the app was down or returned 401/5xx, the snapshot step will fail.

3. **Re-run**  
   On the failed run page, use “Re-run all jobs” to see if it was a one-off (e.g. timeout or brief outage).

---

## Summary

| Where              | Last 12 hours      | Older failure |
|--------------------|--------------------|---------------|
| GitHub Actions     | No failures seen   | 1× Snapshot on deploy (26 Feb), step “Run storage snapshot” |
| Railway (builds)   | Check Railway dashboard | Not visible from repo |

For “staging” specifically: if that means a **second Railway environment**, its build and deploy logs are only in the Railway project for that service; use the same Deployment and Logs tabs there.
