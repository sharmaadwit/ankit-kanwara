# Local vs deployed – what’s ready and what isn’t on production

**Rule:** Nothing below is marked “must deploy.” Deploy **only** what you explicitly choose. This doc is the single list of what exists in your **updated local copy** that is **not** on production (or is unclear), so you can decide what to deploy.

**Production** = what’s live on Railway from the last push to `origin/main`.  
**Local** = current working tree in `Project PAT` (including uncommitted and unpushed changes).  
**Pricing Calc API:** Excluded from deploy (ignored per request). Route and DB table are not mounted/created.

---

## 1. Git state (as of this doc)

- **Branch:** `main` tracking `origin/main`.
- **Local changes:** Many **modified (M)** and **untracked (??)** files. Anything not committed and pushed is **not deployed**.

---

## 2. Code that is ready (implemented) – deploy only if you choose

### 2.1 App / server code (modified or new)

| Item | Where | Status | Deploy? |
|------|--------|--------|--------|
| **Pricing calculator API** | `server/routes/pricingCalculations.js` (new), `server/app.js` (mount), `server/db.js` (pricing_calculations table) | Implemented; accepts POST from pricing-calc, GET list/filters, stores in DB | Only if you want pricing-calc integration live |
| **Activities.js fixes (3)** | `pams-app/js/activities.js` | Issue #1: hide Use Case/Products for Customer Call & POC; #4: focus “Other” text when shown; #9: persist Products and Use Cases on project when saving activity | Deploy if you want these UX fixes in prod |
| **Admin / auth / storage / app** | `server/routes/adminUsers.js`, `server/routes/auth.js`, `server/routes/storage.js`, `server/app.js`, `server/db.js`, `server/middleware/auth.js`, `server/env.sample` | Various fixes and features (user list from server, reset password in DB, etc.) | Deploy if your last push didn’t include these |
| **Frontend (data, reports, bulk, etc.)** | `pams-app/js/data.js`, `pams-app/js/admin.js`, `pams-app/js/app.js`, `pams-app/js/remoteStorage.js`, `pams-app/js/bulkImport.js`, `pams-app/js/reports-v2.js`, `pams-app/index.html`, `pams-app/css/*` | Multiple changes across views and behavior | Deploy when you want this frontend state live |
| **Account+project lock (Option B)** | `server/lib/accountProjectLock.js` | Library exists; **not wired** into storage append/remove (no 423 or lock in routes) | Do **not** deploy as a “feature” until it’s integrated; or leave as dead code and don’t deploy |

### 2.2 Docs (no runtime impact – deploy only if you want them in repo)

- **Modified:** `docs/BACKLOG_BY_CATEGORY.md`, `docs/DATABASE_SCHEMA.md`, `docs/WHERE_TO_LOOK_ACTIVITIES.md`
- **New (untracked):** `docs/ARCHITECTURE_AND_OPTIMIZATION_MEMO.md`, `docs/ACTIVITY_LOSS_ANALYSIS_2026-03.md`, `docs/ALHAMRA_SOW_SIDDHARTH_FINDINGS.md`, `docs/BACKUP_CHECK_2026-03-02.md`, `docs/DATA_LOSS_AND_CONFLICT_BLINDSPOTS.md`, `docs/LOCAL_DEV_SNAPSHOT.md`, `docs/MERGE_BACKUPS_AND_PUSH.md`, `docs/PERFORMANCE_AND_LOAD.md`, `docs/PLAN_DRAFTS_SYNC_AND_DATES.md`, `docs/PRICING_CALC_INTEGRATION.md`, `docs/RAILWAY_LOGS_EXPLAINED.md`, `docs/STAGING_BUILDS_AND_LOGS_CHECK.md`, `docs/TECH_EVALUATION_AND_DATA_SAFETY_FIX.md`, `docs/USER_LOCAL_CACHE_EXPORT.md`, `docs/USER_RECOVERY_STEPS.md`, `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md`
- **This file:** `docs/LOCAL_VS_DEPLOYED_REFERENCE.md`

Deploy = include in commit/push so they’re in the repo; no effect on Railway app behavior.

---

## 3. Bugs and fixes (in local code)

| Bug / fix | File(s) | In DEPLOYED.md? | Deploy? |
|-----------|---------|------------------|--------|
| Hide Use Case / Products for Customer Call & POC | `pams-app/js/activities.js` | No | Only if you deploy activities.js |
| Focus “Other” text when “Other” selected | `pams-app/js/activities.js` | No | Same |
| Persist Products and Use Cases on project on activity save | `pams-app/js/activities.js` | No | Same |
| Admin users list: always fetch from server, no cache; keep loading screen | In a recent commit; confirm it’s on origin/main | Yes (commit msg) | If that commit is pushed, it’s deployed |
| Presales users: lazy load, DB fallback, reset-password in DB | Same | Yes (commit msg) | Same |

If you’re unsure whether a fix is on production, compare `git log origin/main --oneline` with the commit that introduced it; if the fix is only in local modifications (M), it is **not** deployed until you commit and push.

---

## 4. Features (in local code, not necessarily on prod)

| Feature | Where | Deploy? |
|---------|--------|--------|
| Pricing calculator integration (POST + GET, DB table) | `server/routes/pricingCalculations.js`, `server/app.js`, `server/db.js` | Only if you want pricing-calc to write/read from PAMS |
| Migration mode (if present in current code) | Migration routes + client | Per roadmap it’s “implemented but not fully tested”; deploy only if you’re ready to use it |
| Admin cleanup API (GET/POST cleanup, recompress migration) | Already in DEPLOYED.md / codebase | If it’s on origin/main, it’s deployed; if you have extra local changes in that route, deploy when you want them |

---

## 5. Do not deploy (unless you explicitly want them)

- **Backup / snapshot JSON files** in `backups/` (e.g. `from-git-*.json`, `merged-for-restore-*.json`, `pre-deploy-*.json`) – data artifacts, not app code. Don’t commit unless you want them in the repo.
- **One-off scripts** (e.g. `server/scripts/merge-backups-and-restore.js`, `server/scripts/search-storage-for-alhamra-sow.js`, `scripts/extract-cai-cube-*.js`, `scripts/fetch_logs.js`) – use locally or in CI; only add to repo if you want them versioned.
- **`server/lib/accountProjectLock.js`** – not used by any route. Deploy only if you later wire it and want that behavior.
- **`server/services/devSession.js`, `server/services/sessionCache.js`** – deploy only if they’re part of a feature you’re turning on.
- **`pams-app/archive/`** – legacy; usually don’t deploy.
- **`Migration Source Data/`** – data folder; typically don’t commit to app repo.

---

## 6. Summary

| Category | Deploy by default? | Action |
|----------|--------------------|--------|
| **App/server/frontend code (M)** | **No** | Deploy only what you explicitly choose (e.g. “deploy activities fixes” or “deploy pricing API”). |
| **New routes (pricingCalculations)** | **No** | Deploy only if you want pricing-calc integration. |
| **Docs** | Optional | Commit/push if you want them in the repo. |
| **Backups / scripts / archive** | **No** | Don’t deploy unless you explicitly say so. |

**To deploy something:** Commit the right files, push to `main`, let Railway deploy. Only do this after you’ve explicitly said what to deploy.

---

*Update this doc after you deploy or when local vs deployed changes.*
