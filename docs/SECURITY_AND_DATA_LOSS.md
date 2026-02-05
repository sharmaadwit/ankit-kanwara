# Security and data-loss prevention

## Current behaviour

### My drafts (end users)
- **Scope:** Only *your* failed activities on *this device* (browser `localStorage`).
- **Location:** Sidebar → **My drafts**.
- **Actions:** **Submit all** (retry saving), **Delete all** (clear drafts), or per-item Submit again / Edit / Discard.

### All drafts (admin only)
- **Scope:** Server-side drafts (saves that hit a 409 conflict and were stored in `pending_storage_saves`).
- **Location:** System Admin → Monitoring → **All drafts**.
- **Actions:** **Submit all** (apply each with merge into current data, then remove from list), **Refresh**, or per-row **Apply** / **Delete**.
- **API:** `GET /api/storage/pending` and `DELETE /api/storage/pending/:id` are **admin-only** (require admin auth).

---

## Recommendations for airtight security and no data loss

### 1. Backups (already in place)
- **Pre-deploy backup:** Always run a storage snapshot before deploy (see [DEPLOY_WITH_BACKUP.md](DEPLOY_WITH_BACKUP.md)).
- **Daily backup:** Use the daily backup workflow so you have recent snapshots (see [DAILY_BACKUP_SETUP.md](DAILY_BACKUP_SETUP.md)).
- **Restore path:** Use `npm run restore` with a snapshot file if data is lost.

### 2. Access control
- **Admin routes:** Ensure all admin endpoints (users, config, activity logs, **storage pending**) require admin auth (API key or validated admin session). The app already uses `requireAdminAuth` for `/api/storage/pending` and DELETE `/api/storage/pending/:id`.
- **Storage API:** Keep `STORAGE_API_KEY` (or equivalent) set in production so only your app (and backup/restore scripts) can write to storage.

### 3. Audit and restore
- **Activity audit log:** `activity_logs` stores create/update events with full snapshots where implemented. Use this to restore or verify data.
- **Storage history:** Old values are archived to `storage_history` before overwrite; use for point-in-time recovery if needed.
- **Pending drafts:** Server-side drafts in `pending_storage_saves` are a safety net for 409s; admins can apply or discard from **All drafts**.

### 4. Operational habits
- **Before risky changes:** Export a snapshot and/or run the pre-deploy backup.
- **After deploy:** Spot-check key data (e.g. activity counts, one recent account) and check **All drafts** for any stuck conflicts.
- **Duplicate prevention:** The app already checks for duplicate activities (by signature) on add and dedupes on merge; keep this enabled.

### 5. Optional hardening
- **Rate limiting:** Add rate limits on storage PUT and auth endpoints to reduce abuse risk.
- **Audit admin actions:** Log admin actions (e.g. apply/delete pending, user changes) to `activity_logs` or a dedicated admin-audit table.
- **Backup retention:** Keep at least 2–3 recent daily snapshots and pre-deploy snapshots; archive older ones if needed for compliance.

---

## What would rate limiting and admin audit logging do?

### Rate limiting
- **What it is:** A cap on how many requests a client (or IP) can make to an endpoint in a time window (e.g. 100 PUTs per minute per user).
- **What it does:** If someone (or a bug) sends too many requests, the server returns 429 Too Many Requests instead of processing them. That:
  - **Reduces abuse risk** (e.g. a leaked API key or script hammering storage or login).
  - **Reduces accidental overload** (e.g. a bug causing a save loop).
- **Trade-off:** You need to tune limits so normal use (e.g. many users saving at once, or backup/restore scripts) is not blocked. Usually applied to write endpoints (PUT storage, login) rather than read-only.

### Admin action audit logging
- **What it is:** Every time an admin does a sensitive action (e.g. apply/delete a server draft, add/remove user, change config), the server writes a record: who, when, and what (e.g. “admin X applied pending save id 5 for key accounts”).
- **What it does:** You get a **trace of who changed what** in production. That:
  - **Helps debug** (“why did win/loss change?” → check admin log).
  - **Deters mistakes** (admins know actions are logged).
  - **Supports compliance** (evidence of who did what, for audits).
- **Trade-off:** You need a place to store and optionally query these logs (e.g. a table or log aggregator) and a way for admins to view them.

Neither is required for the current data-safety design (drafts, backups, storage history), but both improve security and operability if you add them later.

---

## Comparing backups and restoring win/loss (accounts)

If win/loss data seems wrong, compare two backups and optionally restore only `accounts`:

```bash
node scripts/compare-backups-winloss.js [backup1.json] [backup2.json]
```

With no arguments it uses the two most recent `.json` files in `backups/`. It prints account/project counts and won/lost counts for each, and suggests which file to restore from. To restore only accounts (win/loss) from the chosen backup:

```bash
set REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage
set SNAPSHOT_FILE=backups\your-chosen-backup.json
set RESTORE_KEYS=accounts
node server/scripts/restore-storage-from-snapshot.js
```

(See [DEPLOY_WITH_BACKUP.md](DEPLOY_WITH_BACKUP.md) for auth env vars.)

---

## Summary

| Layer            | Purpose                                      |
|------------------|----------------------------------------------|
| My drafts        | User recovers their own failed saves locally |
| All drafts (admin)| Recover server-side 409 drafts site-wide    |
| Pre-deploy backup| Restore to last known good state             |
| Daily backup     | Recent snapshots for recovery                |
| Storage history  | Previous value before overwrite              |
| Activity logs    | Audit trail and restore from creates         |
