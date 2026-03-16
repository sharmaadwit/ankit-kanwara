# PreSight build manifest – feature-wise

Single reference for **what is in this build**, grouped by **feature** (not by file count). Every file required for each feature is listed so the build is complete and all files are tracked.

---

## 1. Product identity

- **PreSight** – Presales Activity Management (user-facing name in title, login, nav).
- **Files:** `pams-app/index.html`, `pams-app/js/auth.js`.

---

## 2. Core app (dashboard, activities, accounts, win/loss, reports)

- Dashboard, activity log (external/internal), accounts & projects, win/loss with MRR, reports and analytics.
- **Files:** `pams-app/index.html`, `pams-app/js/app.js`, `pams-app/js/activities.js`, `pams-app/js/data.js`, `pams-app/js/reports-v2.js`, `pams-app/css/main.css`, `pams-app/css/reports-v2.css`, `pams-app/js/bulkImport.js`, `pams-app/js/remoteStorage.js`, and shared assets (vendor, images as used).

---

## 3. Admin (configuration, users, industries, drafts, logs)

- Configuration (feature flags, dashboard visibility, dashboard month), user management, industries & use cases, pending suggestions, drafts, login logs, activity logs, admin cleanup.
- **Files:** `pams-app/js/admin.js`, `server/routes/adminConfig.js`, `server/routes/adminUsers.js`, `server/routes/adminLogs.js`, `server/routes/adminCleanup.js`, `server/routes/adminForcePassword.js`, `server/services/appConfig.js`, `server/services/featureFlags.js`, `server/services/dashboardVisibility.js`, `server/services/dashboardMonth.js`, `server/services/loginLogs.js`, and related server routes.

---

## 4. Auth and API (cookie-first, bootstrap, storage)

- Cookie-first session, login/logout, bootstrap (config + user), storage API (GET/PUT/DELETE, If-Match, rate limit).
- **Files:** `server/app.js`, `server/routes/auth.js`, `server/routes/storage.js`, `server/routes/users.js`, `server/routes/entities.js`, `server/middleware/auth.js`, `server/services/session.js`, `pams-app/js/auth.js`, `server/db.js` (users, sessions tables).

---

## 5. Storage validation and activity submission logging

- Server-side validation of storage payloads (accounts, activities, internalActivities) and logging of activity submission outcomes for audit.
- **Files:** `server/lib/storageValidation.js`, `server/lib/activitySubmissionLog.js`, `server/routes/activitySubmissionLogs.js`, `server/routes/storage.js` (uses both libs), `server/db.js` (activity_submission_logs table).

---

## 6. Normalized tables (D-002) – behind feature flag

- Optional normalized tables (accounts, projects, activities, internal_activities) and dual-write from storage. **Off** unless `NORMALIZED_TABLES_ENABLED=true`. Used for future read-path cutover or reporting.
- **Files:** `server/lib/normalizedDualWrite.js`, `server/db.js` (D-002 table creation gated by flag), `server/routes/storage.js` (calls dual-write; no-op when flag off), `server/env.sample` (documents flag).

---

## 7. Backups and export

- Export storage snapshot, backup workflows (daily 9 AM IST, snapshot on deploy), purge-and-archive script.
- **Files:** `server/scripts/export-storage-snapshot.js`, `server/scripts/purge-and-archive-backups.js`, `.github/workflows/daily-backup.yml`, `.github/workflows/snapshot-on-deploy.yml`, and other backup-related workflows.

---

## 8. Documentation and config

- Schema, deploy checklist, deployed features list, backup retention, build manifest.
- **Files:** `docs/DATABASE_SCHEMA.md`, `docs/DEPLOY_CHECKLIST.md`, `docs/DEPLOYED.md`, `docs/BACKUP_RETENTION_AND_ARCHIVE.md`, `docs/BUILD_MANIFEST.md`, `server/env.sample`, `package.json`, `nixpacks.toml`, `Procfile`.

---

## 9. Removed from build

- **Migration mode** – Removed. No migration API, no migration UI, no migration feature flag. Storage keys `migration_*` remain protected from API delete (data retention); migration route and view are deleted.

---

## Files that must be tracked (required for build to run)

All of the following must be committed so the app starts and features work:

- **Server:** `server/app.js`, `server/db.js`, `server/index.js`, `server/logger.js`, `server/env.sample`, `server/routes/*.js` (except `migration.js`, deleted), `server/middleware/*.js`, `server/services/appConfig.js`, `server/services/featureFlags.js`, `server/services/session.js`, and any other services used by the routes above; `server/lib/storageValidation.js`, `server/lib/activitySubmissionLog.js`, `server/lib/normalizedDualWrite.js`.
- **Frontend:** `pams-app/index.html`, `pams-app/js/app.js`, `pams-app/js/admin.js`, `pams-app/js/activities.js`, `pams-app/js/auth.js`, `pams-app/js/data.js`, `pams-app/js/bulkImport.js`, `pams-app/js/reports-v2.js`, `pams-app/js/remoteStorage.js`, `pams-app/css/main.css`, `pams-app/css/reports-v2.css`, and any other JS/CSS loaded by the app.
- **Docs:** `docs/BUILD_MANIFEST.md`, `docs/DATABASE_SCHEMA.md`, `docs/DEPLOY_CHECKLIST.md`, `docs/DEPLOYED.md`, `docs/BACKUP_RETENTION_AND_ARCHIVE.md`.
- **Config / workflows:** `package.json`, `nixpacks.toml`, `Procfile`, `.github/workflows/*.yml` (as used).

*Last updated when migration mode was removed and normalized tables were put behind NORMALIZED_TABLES_ENABLED.*
