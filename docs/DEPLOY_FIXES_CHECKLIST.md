# Deploy all fixes – checklist

Use this when deploying the data-safety, drafts, rate limit, and backup-recovery fixes.

---

## What’s included in this deploy

- **My drafts / All drafts:** User sees only their drafts (Submit all, Delete all); admin sees all server drafts and can Submit all.
- **Drafts include win/loss:** `storageKey` in drafts so accounts (customer accounts) resubmit to the correct key; no limit on account count.
- **Local backup recovery:** When saving accounts or internalActivities, if server has fewer items than local backup, we merge backup into server before save (72h max age, valid shape).
- **No 404 block for accounts:** We never block save on 404 for accounts; recovery via local backup on next save.
- **Rate limiting:** Storage 150 req/15 min per IP, admin 100 req/15 min per IP (configurable via env).
- **Server:** 404 GET logged (`storage_get_404`); GET/DELETE `/api/storage/pending` admin-only; DELETE `/api/storage/pending/:id` for cleanup.
- **Backup comparison:** `npm run compare-backups` and restore instructions in docs.

---

## 1. Pre-deploy backup (required)

**Option A – GitHub Actions (recommended)**

1. Go to your repo on GitHub → **Actions**.
2. Run **"Deploy"** workflow.
3. Enter branch: **main** (to run backup only and push snapshot), then **Run workflow**.
4. Wait for the backup job to finish (it will commit a snapshot to `backups/`).

**Option B – Local backup**

```powershell
$env:REMOTE_STORAGE_BASE = "https://YOUR-APP.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin-or-api-user"
npm run backup-before-deploy
```

Then commit the created file under `backups/` if you want it in the repo.

---

## 2. Deploy code

**Option A – Deploy workflow (backup + merge)**

1. Commit and push your fixes to a branch (e.g. `fix/data-safety` or `main`).
2. GitHub → **Actions** → **Deploy** → **Run workflow**.
3. Enter the **branch to deploy** (e.g. `fix/data-safety`). Use `main` only if you already pushed to main and just want backup.
4. Run workflow. It will: (1) Run backup, (2) Merge your branch into `main`, (3) Push to `main`. Railway will deploy from `main`.

**Option B – Push to main**

After backup (step 1) is done:

```bash
git add -A
git status
git commit -m "Deploy: data safety, drafts, rate limit, backup recovery, no account limit"
git push origin main
```

Railway will deploy from `main`.

---

## 3. After deploy

- Confirm the app loads and you can log in.
- Open **My drafts** (sidebar) and **All drafts** (System Admin → Monitoring) and confirm they load.
- Optionally set env on Railway: `RATE_LIMIT_STORAGE_MAX`, `RATE_LIMIT_ADMIN_MAX` if you want different limits (defaults: 150, 100).

---

## 4. Restore (if needed)

If something goes wrong:

- **Restore from pre-deploy backup:** See [DEPLOY_WITH_BACKUP.md](DEPLOY_WITH_BACKUP.md) section 4.
- **Compare win/loss in backups:** `npm run compare-backups` then `RESTORE_KEYS=accounts` with the chosen snapshot.
