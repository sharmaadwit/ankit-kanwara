# PAMS Architecture & Optimization Memo (Lead Architect)

**Purpose:** Single view of what’s in PAMs, what to optimize for data/storage on Railway, what to remove, and how to strengthen data relationships and foundation. Informed by codebase review, PAMs roadmap, and past work (chats/archived docs).

---

## 1. Current State Summary (PAMs)

| Layer | What exists |
|-------|-------------|
| **App** | PAMS = Presales Activity Management System (v1.0.1). Vanilla JS SPA in `pams-app/`, Node server in `server/`. |
| **Data** | PostgreSQL on Railway: `storage` (key-value JSON), `users`, `sessions`, `login_logs`, `activity_logs`, `storage_history`, `pending_storage_saves`, `storage_mutations`, `pricing_calculations`. |
| **Auth** | Cookie-primary; header/API-key fallback still present (to remove per F-002). Users: DB `users` table is source of truth; storage key `users` is legacy/fallback. |
| **Chats** | No in-app chat. “Chats” in this doc = Cursor agent transcripts under `agent-transcripts/` (project metadata). No app chat archive in DB. |

---

## 2. Railway Storage Optimization (Make It Leaner)

### 2.1 Biggest growth: `storage_history`

- **Every PUT to storage** (except `migration_*` keys) inserts the previous value into `storage_history` before overwriting.
- High-churn keys (`activities`, `accounts`, `internalActivities`) cause **fast growth** and are the main disk cost on Railway.

**Actions:**

| Action | How |
|--------|-----|
| **Enforce retention** | Use `POST /api/admin/cleanup` regularly (or a cron). Rely on env: `STORAGE_HISTORY_RETENTION_DAYS` (default 90). Consider **30–60 days** for Railway to stay lean. |
| **Optional: skip archiving for hot keys** | Today only `migration_*` is skipped. You can extend `archiveCurrentValue` to skip archiving for `activities` (and optionally `accounts` / `internalActivities`) if you accept no “insurance” history for those keys. Trade-off: smaller DB vs no rollback from history for those keys. |
| **Schedule cleanup** | Run cleanup weekly (e.g. GitHub Action or Railway cron): `POST /api/admin/cleanup` with retention; optionally `full: true` to also trim `storage_mutations` and `pending_storage_saves`. |

### 2.2 Log tables

- **login_logs:** 90-day retention (configurable via `LOGIN_LOGS_RETENTION_DAYS`). Auto-cleanup in `loginLogs.js` every hour.
- **activity_logs:** 14-day retention in code; admin cleanup uses `ACTIVITY_LOGS_RETENTION_DAYS` (default 14). Keep as-is or reduce to 7 if you need to be leaner.

### 2.3 Mutations and pending

- **storage_mutations:** Idempotency for client writes; grows unbounded unless cleanup runs with `full: true`. Retention: `STORAGE_MUTATIONS_RETENTION_DAYS` (default 30).
- **pending_storage_saves:** “Lost & Found” on 409; retention: `PENDING_STORAGE_RETENTION_DAYS` (default 7). Safe to keep short (e.g. 7 days).

### 2.4 Main storage table (`storage`)

- **Compression:** Values can be `__gz__` (gzip). Ensure large keys (`activities`, `accounts`, `internalActivities`, `migration_*`) are written compressed where applicable (migration path already supports it).
- **Recompress migration keys:** Use `POST /api/admin/cleanup` with `recompressMigration: true` to gzip any uncompressed `migration_*` keys.
- **Avoid storing huge blobs:** Per roadmap (F-001, X-002), keep wins/attachments small or in separate keys with size limits.

### 2.5 Pricing calculations

- **pricing_calculations:** JSONB payloads; no retention in code. Add a **retention policy** (e.g. keep last 12 months) and run periodic delete + VACUUM, or expose via admin cleanup.

---

## 3. What to Remove or Trim

### 3.1 Safe to remove or archive (codebase)

| Item | Recommendation |
|------|----------------|
| **docs/archive/** | Already archived. Keep for reference; do not delete. No impact on Railway. |
| **Header/API-key auth fallback** | Remove once cookie-only cutover is done (F-002). Reduces code paths and confusion. |
| **Unused scripts** | Per T-002: review `inspect-wins-xlsx.js`, `extract-cai-cube-*`, `extract-migration-mapping.js`, `preloadMigration` (wins from xlsx at startup). Remove or document; avoid duplicate logic with P-024 (in-app wins upload). |
| **Stale storage keys** | If you have one-off keys (e.g. old feature flags or deprecated config), delete via `DELETE /api/storage/:key` after confirming unused. |

### 3.2 Do not remove

- **storage_history** table or archiving for non-hot keys: needed for “insurance” and conflict recovery.
- **pending_storage_saves:** needed for 409 Lost & Found.
- **storage_mutations:** needed for idempotent writes.
- **Migration keys** (`migration_*`): keep until migration is fully run and promoted; then you can clear draft/confirmed keys via admin or script and leave only live data in main keys.

### 3.3 Cursor agent transcripts (“chats”)

- **Location:** `agent-transcripts/` (Cursor project folder), not in the PAMS repo or DB.
- **Content:** JSONL (+ optional .txt) per conversation; some with `subagents/`.
- **Recommendation:** These are local Cursor metadata. For “optimization”:
  - You can **manually delete old conversation folders** if you want to free local disk; no impact on Railway or PAMS.
  - No need to “optimize” them for DB or app; they are not part of PAMS data.

---

## 4. Data Relationships & Architecture (Strong Foundation)

### 4.1 Current model (documented in DATABASE_SCHEMA.md + code)

- **Normalized (DB):** `users`, `sessions` (FK to users), `login_logs`, `activity_logs`, `pricing_calculations`. Clear structure and indexes.
- **Key-value (storage table):** `users` (legacy), `accounts`, `activities`, `internalActivities`, `globalSalesReps`, `industries`, `regions`, config keys, optional bucket keys. **No FKs;** relationships are in JSON only (e.g. `activity.userId`, `activity.accountId`, `project.accountId`).

### 4.2 Gaps and risks (from schema doc “Future Considerations”)

- No referential integrity for storage-backed entities.
- No DB-level validation; full blob load per key.
- DATABASE_SCHEMA.md is **out of date**: it does not list `storage_history`, `pending_storage_saves`, `storage_mutations`, `users`, `sessions`, or `pricing_calculations`.

### 4.3 Recommendations for a clear, strong foundation

| Priority | Action |
|----------|--------|
| **1. Document accurately** | Update `docs/DATABASE_SCHEMA.md` to include all tables created in `server/db.js`: storage_history, pending_storage_saves, storage_mutations, users, sessions, pricing_calculations. Add retention and cleanup notes. |
| **2. Single source of truth for users** | Complete cookie cutover (F-002) and stop reading from storage `users` for auth; use only DB `users` + `sessions`. Keep storage `users` only if still needed for admin roster sync; otherwise deprecate. |
| **3. Server-side merge everywhere** | Activities already use server-side merge (append/remove + merge on PUT). Add the same for **accounts** (O-005) and **internalActivities** (O-006) so one stale save cannot wipe the list. |
| **4. Month-scoped activities** | Implement O-002 (month-scoped/batched activities API) so you don’t always load the full `activities` blob; reduces memory and payload size. |
| **5. Retention and cleanup as part of design** | Document env vars for all retention (storage_history, login_logs, activity_logs, storage_mutations, pending_storage_saves, and future pricing_calculations). Run cleanup on a schedule. |
| **6. No big schema rewrite yet** | Staying on Railway-as-is (no Redis, single process), keep the current hybrid model: normalized tables for auth/audit/pricing; key-value for app entities. Normalizing activities/accounts into tables would be a larger migration; do only when scale or query patterns justify it. |

### 4.4 Relationship map (logical)

```
users (DB) ←→ sessions (DB)
    ↓
storage keys: users (legacy), accounts, activities, internalActivities, ...
    ↓ (logical refs in JSON only)
activity.userId → user.id
activity.accountId → account.id
project.accountId → account.id
```

Keep this map in the schema doc and in this memo so the foundation is explicit.

---

## 5. What Needs to Be Done (Prioritised)

From PAMs roadmap + this review:

| Order | Area | Items |
|-------|------|--------|
| 1 | **Storage lean** | Set `STORAGE_HISTORY_RETENTION_DAYS` (e.g. 60); run `POST /api/admin/cleanup` on a schedule; optionally add retention for `pricing_calculations`. |
| 2 | **Schema doc** | Update `DATABASE_SCHEMA.md` with all tables and retention/cleanup. |
| 3 | **Data safety** | O-001 (draft conflict UX), O-005/O-006 (server-side merge for accounts/internalActivities). |
| 4 | **Scale** | O-002 (month-scoped activities API). |
| 5 | **Auth** | F-002 (cookie-only; remove header/API-key). |
| 6 | **Dead code** | T-002 (review/remove or document scripts and unused paths). |
| 7 | **Migration** | R-001, R-002, T-001 (migration cleanup, runbook, one E2E). |

---

## 6. References

- **Schema:** `docs/DATABASE_SCHEMA.md` (to be updated)
- **Roadmap:** `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md`
- **Backlog:** `docs/PLANNED_AND_BACKLOG.md`, `docs/BACKLOG_BY_CATEGORY.md`
- **Cleanup:** `server/routes/adminCleanup.js`, `server/scripts/cleanup-storage-history.js`, `server/scripts/cleanup-logs-and-history.js`
- **Data growth:** `docs/DATA_AND_DISK_GROWTH.md`, `docs/STORAGE_AND_BACKUP.md`
- **Deployed:** `docs/DEPLOYED.md`

---

*Lead architect memo. Revise when retention policy or schema changes.*
