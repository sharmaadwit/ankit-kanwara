# Data Optimisation Agent — Build Instructions

**Purpose:** This document is the **single source of truth for the Data Optimisation Agent**. When asked to "run the build" for data optimisation, the agent should execute any **remaining** work described here.

**Status (as of roadmap review):** **D-001** and **D-002** are **implemented and deployed** (server-side validation, normalized tables, dual-write, backfill, activity_submission_logs). See `docs/DEPLOYED.md` and `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md` §2.1. **New P1** is Revenue & compliance (F-001, F-002). Remaining data work (optional): read-path cutover for D-002 (`READ_FROM_NORMALIZED_TABLES`), or extend validation to more keys/shapes.

**Constraint:** Railway as-is only (Node + PostgreSQL; no Redis, no new services).

---

## Build order (if not yet done)

1. **D-001** — Server-side validation & schema checks *(done)*.
2. **D-002** — Data normalization migration *(done: tables, dual-write, backfill)*. Optional: read-path cutover.

---

## D-001: Server-side validation & schema checks

**Goal:** Validate all incoming storage/entity payloads on the server. Reject malformed or invalid data before writing to `storage`. No client-only trust.

### Where to implement

- **Primary:** `server/routes/storage.js` — before any `INSERT`/`UPDATE` into `storage`, run validators for the key.
- **Also:** Any route that does append/remove for `activities` or `internalActivities` (e.g. `POST /api/storage/activities/append`, `POST /api/storage/activities/remove`).

### Keys to validate

| Key | Validation rules (minimum) |
|-----|----------------------------|
| `activities` | Array of objects; each item: `id` (string), `activityDate` or `date` (valid ISO date or parseable date), `activityType` (string), optional `durationHours`/`durationDays` (number, ≥ 0, ≤ 24 for hours; ≤ 31 for days), optional `accountId`/`projectId` (string). Reject if required fields missing or types wrong. |
| `internalActivities` | Same shape as activities; enforce same date and duration bounds. |
| `accounts` | Array of objects; each item: `id` (string), `name` (string, non-empty). Optional `projects` array; each project: `id`, `name`. Reject if id/name missing or not string. |
| `users` | Array of objects; each item: `id` (string), `username` (string), optional `email` (string). Reject if id/username missing. |

### Validation rules to enforce

- **Dates:** `activityDate` / `date` must be parseable (e.g. `new Date(x)` valid and not Invalid Date) and within a reasonable range (e.g. 2020–2030).
- **Enablement duration:** If `activityType` is enablement (or similar), `durationHours` and/or `durationDays` if present: numbers, ≥ 0, hours ≤ 24 per day, days ≤ 31. If missing, allow but optional (per P-003; can add warning later).
- **IDs:** Non-empty strings; no script-injection patterns if you sanitize (optional but recommended).
- **Payload size:** Reject if decompressed value length exceeds a safe limit (e.g. 5MB) to avoid OOM.

### Deliverables

1. **Validation module:** e.g. `server/lib/storageValidation.js` — functions `validateActivities(value)`, `validateInternalActivities(value)`, `validateAccounts(value)`, `validateUsers(value)`. Each returns `{ valid: boolean, error?: string }`.
2. **Wire into storage.js:** Before writing to `storage` for keys `activities`, `internalActivities`, `accounts`, `users`, call the corresponding validator. If invalid, return **400** with a clear error message and do not write.
3. **Append/remove:** For `activities/append` and `activities/remove`, validate the appended or resulting list shape before persisting.
4. **Tests (optional but recommended):** Unit tests for validators (valid payloads accepted, invalid rejected).

### Acceptance criteria

- [ ] Any PUT to `storage` with key `activities`, `internalActivities`, `accounts`, or `users` is validated server-side before write.
- [ ] Invalid payloads receive HTTP 400 and a descriptive error; no partial write.
- [ ] Valid payloads are written as today; no change in behaviour for correct clients.

---

## D-002: Data normalization migration

**Goal:** Move `activities`, `accounts`, `projects` (and related) from key-value JSON in `storage` into normalised PostgreSQL tables with foreign keys, constraints, and indexes. Execute via dual-write → backfill → cutover → deprecate blobs.

### Step 1 — Design normalised schema

Define and document:

- **Table `accounts`:** id (PK), name, industry, region, sales_rep, sales_rep_region, notes, created_at, updated_at, etc.
- **Table `projects`:** id (PK), account_id (FK → accounts), name, sfdc_link, use_cases, products, created_at, updated_at.
- **Table `activities`:** id (PK), account_id (FK), project_id (FK), activity_date, activity_type, call_type, duration_hours, duration_days, notes, assigned_user_id, source, created_at, updated_at, etc. (align with current JSON shape in `docs/DATABASE_SCHEMA.md` and client `data.js`).
- **Table `internal_activities`:** same idea for internal activities.
- **Indexes:** e.g. (activity_date), (account_id), (project_id), (assigned_user_id, activity_date).
- **Constraints:** NOT NULL where appropriate, CHECK (duration_hours >= 0 AND duration_hours <= 24), etc.

Create a migration file (e.g. `server/scripts/migrations/001_normalized_tables.sql`) that creates these tables and FKs. Do not drop `storage` yet.

### Step 2 — Dual-write

- On every successful write to `storage` for keys `activities`, `internalActivities`, `accounts` (and thus nested projects), also write into the new normalised tables (insert/update by id). Keep writing to `storage` so current clients keep working.
- Implement in `server/routes/storage.js` or a dedicated service called from it. Handle conflicts (e.g. upsert by id).

### Step 3 — Backfill

- One-time script: read current `storage` value for `accounts`, `activities`, `internalActivities`; for each record, insert into normalised tables (ignore duplicates or upsert). Run once after dual-write is in place.

### Step 4 — Cutover (read path)

- Add feature flag or env (e.g. `READ_FROM_NORMALIZED_TABLES=true`). When set, API reads for activities/accounts come from the new tables instead of `storage`. Default false until verified.
- Switch to true after backfill and verification; monitor.

### Step 5 — Deprecate blob writes (optional, later)

- Once all reads go to normalised tables and dual-write is stable, stop writing to `storage` for those keys (or leave as backup). Document in DEPLOYED.md.

### Deliverables

1. **Schema:** `server/scripts/migrations/001_normalized_tables.sql` (or equivalent) with CREATE TABLE and indexes.
2. **Dual-write:** Code in storage route (or service) that updates normalised tables on every successful write to the relevant storage keys.
3. **Backfill script:** e.g. `server/scripts/backfill-normalized-from-storage.js` — reads storage, upserts into new tables.
4. **Read path:** Optional new API or existing entity API that reads from normalised tables when flag is set; document in roadmap/deps.
5. **Docs:** Update `docs/DATABASE_SCHEMA.md` with the new tables and migration notes.

### Acceptance criteria

- [x] New tables exist and have FKs and constraints (accounts, projects; activities/internal_activities use TEXT for account_id/project_id to allow activity-only writes).
- [x] Dual-write runs on every relevant storage write (PUT, append, remove); no regression for current clients.
- [x] Backfill script runs without error and row counts align with storage payload counts (`npm run backfill-normalized`, `npm run backfill-normalized-dry`).
- [x] Cutover plan and flag are documented (`READ_FROM_NORMALIZED_TABLES` in DATABASE_SCHEMA.md); read-path switch is optional and not yet implemented.

---

## How the Data Optimisation Agent should "run the build"

1. **Read this document** and `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md` §4.7 and §6.
2. **Execute D-001 first:** Implement `server/lib/storageValidation.js`, wire it into `server/routes/storage.js`, and ensure invalid payloads are rejected with 400.
3. **Execute D-002 next:** Design schema (migration SQL), implement dual-write, add backfill script, document cutover. Optionally implement read-path switch.
4. **Run and verify:** Run the server and any tests; run backfill against a copy of DB or staging if available.
5. **Update roadmap:** Mark D-001 and D-002 progress in the roadmap or backlog when done.

---

## References

- **Roadmap:** `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md` (Phase 1 = P1 Data, §4.7)
- **DB schema today:** `docs/DATABASE_SCHEMA.md`
- **Storage route:** `server/routes/storage.js`
- **External review:** `docs/EXTERNAL_REVIEW_PM_RESPONSE.md`
