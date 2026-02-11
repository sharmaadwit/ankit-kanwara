# PAMS – What Is Deployed

Single reference for what is **live in production**. Build ID = Git commit SHA (`git rev-parse HEAD`). Rollback = deploy from the desired commit.

---

## App version

- **Version:** 1.0.1 (`package.json`)
- **Deploy:** Push to `main`; Railway (or host) builds and deploys from `main`.

---

## Features live in production

### Core app
- **Dashboard** – Stats, charts, activity mix, win/loss summary, project health.
- **Activities** – Log external/internal activities; filters (industry, region, type, owner); card and list views; drafts on save failure.
- **Accounts & projects** – CRUD; win/loss per project; MRR with multi-currency (INR, USD, EUR, GBP, **BRL**).
- **Win/Loss** – Status (won/lost/active), SFDC link, reason, competitor, **currency (incl. BRL R$)**, MRR, month of win, presales who won; format and display for all supported currencies.
- **Reports** – Presales reports, analytics table presets, filters.
- **Admin** – Industries and use cases (add/remove/**edit** industry name and use case name), pending industries/use cases (accept/reject/merge), sales reps (incl. **BRL**), drafts, feature flags, dashboard visibility, presales target, login logs, activity logs, force password change, user management.
- **Industries & use cases** – **Auto-generated use cases** for any industry that has none (default list created and saved). **Use cases always sorted A–Z.** Edit industry and use case names from Admin (rename propagates to accounts/projects).

### Auth and API
- **Phase 0–2** – `/api/health` (DB check), structured logs, reconcile in background, “Syncing…” indicator, async storage (`getItemAsync`, `setItemAsyncWithDraft`), `/api/config` (remoteStorage, featureFlags, dashboardVisibility, dashboardMonth, **cookieAuth** when `FORCE_COOKIE_AUTH=true`).
- **Phase 3 (cookie-first)** – Session middleware reads session cookie, sets `req.user` and `x-admin-user`; **header/API-key still work** as fallback. `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; `GET /api/users`; client can use cookie auth when `FORCE_COOKIE_AUTH=true` (login via API, session restore via `/api/auth/me`, `credentials: 'include'` on fetch).
- **Phase 4** – `GET /api/entities/accounts`, `/accounts/:id`, `/activities`, `/activities/:id` (with `?month=YYYY-MM` for activities).
- **Storage** – `/api/storage` (GET/PUT/DELETE), conditional PUT (If-Match), pending drafts; rate limit on PUT/DELETE only.

### Stabilization (deployed)
- **Entity keys server-only (phased)** – For `accounts`, `activities`, `internalActivities`, `users`: no localStorage fallback when async fails (return `[]`); after save, cache invalidated so next read refetches from server.
- **Reconcile = refetch only** – On login, reconcile refetches entity keys from server and invalidates DataManager cache; no merge with local backup for those keys.
- **Async callers** – Bulk import and activities use `await` for DataManager entity getters; no sync-only paths for entity data in those flows.

### Performance optimizations (load time)
- **Bootstrap** – Init uses `GET /api/bootstrap` (config + user in one request) when cookie auth; avoids separate `/api/config` and `/api/auth/me` on first load.
- **Deferred analytics presets** – `loadAnalyticsTablePresets` runs in background; does not block first paint.
- **Batch reconcile** – On login, reconcile fetches `internalActivities`, `accounts`, `users` in one `GET /api/storage/batch?keys=...` instead of 3 separate requests; activities still fetched separately (sharded).

### Build 1, 2, 4 (recently deployed)
- **4.1 (FB7) 15-day backup retention** – Daily backup workflow keeps last 15 dated snapshots; `storage-snapshot-latest.json` plus dated files.
- **1.3 (FB2) Activities refresh on date change** – After activity save (create/update), activities cache is invalidated and list/cards refetch and re-render so the activity appears in the correct month.
- **1.4 (FB4) Remember last activity date** – Per user, last-used activity date stored in localStorage; activity form date input defaults to that value when opening; value updated after each successful save.

### Backups
- **Daily backup** – GitHub Action (e.g. 02:00 UTC) runs storage snapshot; commits `backups/storage-snapshot-latest.json`; **15-day retention** (keep last 15 dated snapshots). Requires repo secrets: `REMOTE_STORAGE_BASE`, optionally `REMOTE_STORAGE_USER` / API key.
- **Snapshot on deploy** – Workflow can run on push to `main` to capture snapshot with `[skip ci]`.
- **Verify** – Actions → “Daily storage backup” (or deploy workflow) to confirm runs and secrets.

### Database and ops
- **PostgreSQL** – `storage` table (key-value JSON), `sessions`, `users` (for Phase 3), `pending_storage_saves`, `activity_logs`, `admin_logs`, etc. See schema in codebase if needed.
- **Env** – `DATABASE_URL`, `PORT`, `FORCE_REMOTE_STORAGE`, `STORAGE_API_KEY`; optional `SESSION_COOKIE_NAME`, `SESSION_TTL_SEC`, `FORCE_COOKIE_AUTH` for cookie auth; `CORS_ALLOW_ORIGINS`, `APP_PUBLIC_URL`; Gmail/OAuth for notifications if used.

---

## Quick reference

| What            | Where / how |
|-----------------|-------------|
| Build ID        | `git rev-parse HEAD` or GitHub/Railway commit |
| Health          | `GET /api/health` |
| Bootstrap       | `GET /api/bootstrap` (config + user in one; init uses this when cookie auth) |
| Config          | `GET /api/config` |
| Backup run      | GitHub Actions → Daily storage backup (or deploy workflow) |
| Cookie auth on  | Set `FORCE_COOKIE_AUTH=true`; run user migration if using DB users |
