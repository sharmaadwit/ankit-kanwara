# Deployment & Git runbook

Single reference for **sharing the repo**, **deploying to production**, **backups**, **region cleanup**, and **one-off scripts**. Use this when starting a new chat or onboarding someone.

**Canonical git repo (deploy from here):**

| Item | Value |
|------|--------|
| Remote | `https://github.com/sharmaadwit/ankit-kanwara.git` |
| Default branch | `main` |
| Working directory | `Project PAT` (not the parent `Project PAT Master Folder` unless that folder is only a wrapper) |
| Production app | `https://ankit-kanwara-production.up.railway.app` |
| Storage API | `https://ankit-kanwara-production.up.railway.app/api/storage` |
| Health | `GET /api/health` |
| Version (live build) | `GET /api/version` |

**Related docs:** `DEPLOY_WITH_BACKUP.md`, `DEPLOY_CHECKLIST.md`, `PRESALES_VS_FIELD_REP_EMAIL.md`, `WHERE_TO_LOOK_ACTIVITIES.md`

---

## 1. How to share this Git repository

### Give someone access (private repo)

1. Open **https://github.com/sharmaadwit/ankit-kanwara**
2. **Settings** → **Collaborators** (or **Manage access** for an org)
3. **Add people** → enter their GitHub username or email → choose role:
   - **Read** – clone, pull, view Actions (if allowed)
   - **Write** – push branches, open PRs
   - **Admin** – settings, secrets (use sparingly)

They clone with:

```bash
git clone https://github.com/sharmaadwit/ankit-kanwara.git
cd ankit-kanwara
```

HTTPS will prompt for GitHub login or a **Personal Access Token** (PAT) with `repo` scope.

### SSH instead of HTTPS

They add an SSH key in GitHub **Settings → SSH keys**, then:

```bash
git clone git@github.com:sharmaadwit/ankit-kanwara.git
```

### Share without full write access

| Goal | Approach |
|------|----------|
| Review only | Collaborator **Read**, or send a **zip** of a tag |
| One branch / PR | Fork on GitHub → PR back to your repo |
| CI / deploy machine only | **Deploy key** (repo Settings → Deploy keys, read-only or write) |
| Public read | Repo **Settings → General → Change visibility** (only if you intend public code) |

### What to tell collaborators

- App runs on **Railway**; pushes to **`main`** trigger production deploy (after backup if using the Deploy workflow).
- **Do not commit** `.env`, API keys, or `REMOTE_STORAGE_API_KEY` in git.
- GitHub Actions needs secrets (see §4); ask a repo **Admin** to add them, not in chat.

---

## 2. Standard production deploy (recommended)

**Rule:** Every production deploy should have a **full storage backup** first.

### Option A – GitHub Actions “Deploy” workflow (backup + merge)

1. Push your work to a branch (e.g. `feature/my-change`).
2. GitHub → **Actions** → **Deploy** → **Run workflow**.
3. **Branch input:**
   - Feature branch name → runs backup, then **merges into `main`** → Railway deploys `main`.
   - `main` → **backup only** (no merge); you still need to push commits to `main` to deploy.

Workflow file: `.github/workflows/deploy.yml`

### Option B – Push to `main` directly

1. From **`Project PAT`**:

   ```powershell
   npm run syntax-check
   ```

2. Run backup first (§3), then:

   ```powershell
   git add -A
   git status
   git commit -m "Describe the change"
   git push origin main
   ```

3. Railway picks up `main` and redeploys.
4. Hard refresh the app: **Ctrl+Shift+R**.

### After deploy

- Confirm: `https://ankit-kanwara-production.up.railway.app/api/health`
- Check version: `https://ankit-kanwara-production.up.railway.app/api/version`

---

## 3. Backups (pre-deploy and daily)

### GitHub Actions

| Workflow | Purpose |
|----------|---------|
| **Deploy** | Pre-deploy backup (+ optional merge to `main`) |
| **Pre-deploy backup** | Backup only |
| **Daily backup** | Scheduled snapshot |
| **Snapshot on deploy** | Updates `backups/storage-snapshot-latest.json` on deploy |

Artifacts: Actions run → download **deploy-backup-*** artifact if the file was not committed.

### Local backup (Windows PowerShell)

```powershell
cd "C:\Project PAT Master Folder\Project PAT"
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin@example.com"   # or storage-proxy / API key
npm run backup-before-deploy
```

Output: `backups/pre-deploy-<timestamp>.json` and manifest.

### Restore from snapshot

```powershell
$env:REMOTE_STORAGE_BASE = "https://ankit-kanwara-production.up.railway.app/api/storage"
$env:REMOTE_STORAGE_USER = "your-admin@example.com"
$env:SNAPSHOT_FILE = "backups\pre-deploy-YYYYMMDDTHHMMSS.json"
$env:RESTORE_KEYS = "all"
npm run restore
```

Then hard refresh the app. See `DEPLOY_WITH_BACKUP.md` for details.

---

## 4. GitHub Actions secrets (repo Settings → Secrets)

Required for backup / region scripts that hit production:

| Secret | Example / notes |
|--------|------------------|
| `REMOTE_STORAGE_BASE` | `https://ankit-kanwara-production.up.railway.app/api/storage` |
| `REMOTE_STORAGE_USER` | Admin email or `storage-proxy` |
| `REMOTE_STORAGE_API_KEY` | Storage API key (if used instead of user) |

Without these, backup and region-cleanup workflows fail at the “Check backup secrets” step.

---

## 5. Railway (hosting)

- **Dashboard:** [railway.app](https://railway.app) → project **ankit-kanwara** (or your service name).
- **Deploy trigger:** GitHub `main` branch (connected repo).
- **Logs / shell:** Railway → service → **Deployments** / **SSH**.

Run a script **on production** (DB uses `postgres.railway.internal` — not reachable from your laptop `.env`):

```powershell
railway login
railway link
railway ssh --service ankit-kanwara "node server/scripts/your-script.js"
```

Replace service name if Railway shows a different one.

---

## 6. Region cleanup (presales regions)

**Important:** Presales region = `assignedUserEmail` / logger → Users `defaultRegion`. **Do not** use field sales rep (`salesRepEmail`) for presales cleanup. See `docs/PRESALES_VS_FIELD_REP_EMAIL.md`.

| Step | How |
|------|-----|
| Dry-run | Actions → **Region cleanup dry-run** OR `node server/scripts/region-cleanup-dryrun-remote.js` |
| Latest report in repo | `reports/region-cleanup-latest.json` (after workflow commits it) |
| Apply **migration_* keys only** | Actions → **Region cleanup annual apply** OR `DRY_RUN=false APPLY=true node server/scripts/region-cleanup-apply-annual-remote.js` |
| Sync Users table regions | `POST /api/admin/presales-regions/sync` (admin auth) |

Manual roster code: `server/scripts/lib/manualPresalesRegionByEmail.js`  
Annual-report-only extras: `server/scripts/lib/annualReportPresalesRegions.js`

---

## 7. Useful npm scripts (from `Project PAT`)

```text
npm run syntax-check          # required before deploy
npm run backup-before-deploy  # full production storage export
npm run restore               # restore from SNAPSHOT_FILE
npm run export:annual-users   # annual user activity export script
npm run backfill-normalized-dry
npm run backfill-normalized   # on Railway only, if using normalized tables
```

---

## 8. API snippets (production)

**Annual user activity export (admin header):**

```bash
curl -H "X-Admin-User: ankit.kanwara@gupshup.io" \
  "https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity?from=2025-07-01&to=2026-05-20"
```

**Region cleanup dry-run (admin):**

```text
GET /api/admin/region-cleanup/dry-run
```

---

## 9. Quick checklist (copy for each deploy)

1. [ ] `npm run syntax-check` passes locally
2. [ ] Pre-deploy backup (Actions **Deploy** or **Pre-deploy backup**, or `npm run backup-before-deploy`)
3. [ ] Note `productionVersionAtSnapshot` from manifest (optional)
4. [ ] Merge/push to `main` (or run Deploy workflow with your branch)
5. [ ] Wait for Railway deploy green
6. [ ] `GET /api/health` + smoke test in browser (hard refresh)
7. [ ] If data wrong: restore from latest `backups/pre-deploy-*.json`

---

## 10. Cursor / new chat

When context is lost, point the agent at:

- This file: `docs/DEPLOYMENT_AND_GIT_RUNBOOK.md`
- Transcript (if needed): ask for path under `.cursor/projects/.../agent-transcripts/`

Do not paste secrets into chat; use GitHub Secrets and local `.env` only.

---

*Last updated: 2026-05-19 — consolidate deploy, git share, region cleanup, and Railway notes.*
