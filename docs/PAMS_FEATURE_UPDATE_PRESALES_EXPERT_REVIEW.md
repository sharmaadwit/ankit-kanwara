# PAMS Product Roadmap – Product Manager Review

**Role:** Product Manager — review, renumber, sectionise, and extend the PAMS roadmap.  
**Scope:** Full codebase (frontend, backend, APIs, docs).  
**Constraint:** **Railway as-is only** — no new hosting, no Redis, no extra workers; all solutions must run on current Railway (Node + PostgreSQL) deployment.

**Cross-reference:** Backlog detail in `docs/PLANNED_AND_BACKLOG.md`, `docs/BACKLOG_BY_CATEGORY.md`. Legacy P-numbers (P-001 … P-025) mapped in §4. **External review (architecture & data):** see `docs/EXTERNAL_REVIEW_PM_RESPONSE.md` and §1.1 / §4.7 below.

---

## 1. Executive Summary

PAMS is a **Presales Activity Management System** (v1.0.1) on **Railway** (Node.js + PostgreSQL, vanilla JS SPA). It covers dashboard, activities (external/internal), accounts/projects, win/loss with MRR, reports, SFDC compliance, and admin.

**Priorities:** **(1) Data (D-001, D-002) — DONE** (see §2.1). **(2) Revenue & compliance (new P1)** — Salesforce wins upload (F-001), cookie-only auth (F-002); (3) Reliability — draft UX, month-scoped API, migration runbook; (4) **Email integration**; (5) Communications & export; (6) Roles & analytics; (7) Gamification; (8) AI and optional.

**External review (architecture & data):** A comprehensive external review flagged the key-value JSON storage as a structural risk. We addressed it: **D-001 (validation)** and **D-002 (normalized tables, dual-write, backfill)** are done (see §2.1). We also added the review’s feature suggestions: F-015–F-018. Full PM response: **`docs/EXTERNAL_REVIEW_PM_RESPONSE.md`**.

**Railway constraint:** All work must run on the existing Railway stack. Use in-memory caching (no Redis), single process, conservative DB pool and backup-to-repo only. No new infra services.

---

## 2. What’s Live (Snapshot)

| Area | Status |
|------|--------|
| **Core** | Dashboard, Activities (external/internal), Accounts & Projects, Win/Loss (MRR multi-currency), Reports, SFDC Compliance, Project Health |
| **Admin** | Users, Industries/use cases, Regions, Sales reps, Drafts, Feature flags, Dashboard visibility, Presales target, Login/activity logs, Force password |
| **Auth** | Email/username + password; cookie primary; header/API-key fallback still present |
| **APIs** | Health, bootstrap, config, auth, users, entities (accounts/activities `?month=`), storage (key-value, batch, append/remove, pending), admin, migration (import, stats, draft, confirm) |
| **Data** | PostgreSQL `storage` table (key-value); backups via GitHub Actions (15-day retention) |
| **Migration mode** | Implemented; not E2E-validated in production |
| **Loading experience** | **Implemented:** Full-screen loading view with dual-ring spinner, progress bar, staged messages (Connecting… → Syncing… → Almost there… → Ready!), and rotating fun tips; overlay stays until first view is ready. |

Ref: `docs/DEPLOYED.md`.

---

## 2.1 Ready vs not ready (review)

**Purpose:** Single view of what is implemented vs pending so we can reprioritise.

### Ready (done / shipped)

| ID | Item | Evidence |
|----|------|----------|
| **D-001** | Server-side validation | `server/lib/storageValidation.js` (validateActivities, validateInternalActivities, validateAccounts); wired in `server/routes/storage.js` for activities append/merge; invalid payloads rejected. |
| **D-002** | Data normalization (tables + dual-write + backfill) | Normalized tables `accounts`, `projects`, `activities`, `internal_activities`; `server/lib/normalizedDualWrite.js`; dual-write on storage write; `npm run backfill-normalized`; `activity_submission_logs`. See `docs/DEPLOYED.md` and `docs/DATABASE_SCHEMA.md`. Read-path cutover (`READ_FROM_NORMALIZED_TABLES`) optional/later. |
| **F-012** | Loading data view | Dual-ring spinner, progress bar, staged messages, tips; overlay until first view ready. |
| **Legacy (BACKLOG_BY_CATEGORY)** | Activity date default, sort + owner defaults, enablement warning, industry merge UX | Marked Done there; in production. |

### Not ready (pending)

| ID | Item | Notes |
|----|------|--------|
| **F-001** | Salesforce wins Excel upload + callout | No `POST /api/admin/wins-import` or equivalent; no dashboard callout. |
| **F-002** | Cookie-only auth cutover | Header/API-key (e.g. `X-Admin-User`) still accepted; not removed. |
| **F-003** | Single-project default (win/loss) | Not implemented. |
| **F-004, F-014, F-007** | Email package, email integration, notifications | Not wired end-to-end. |
| **F-005, F-006** | Reports enhancements, export suite | Partial (some CSV); full export suite and project-dropdown completeness pending. |
| **O-001** | Draft conflict UX | Messaging and retry from Drafts not fully improved. |
| **O-002** | Month-scoped activities API | Entities API has `?month=`; month-scoped/batched for all reads not fully in place. |
| **R-001, R-002, T-001** | Migration cleanup, runbook, E2E | Migration mode built; cleanup and E2E test not done. |
| **F-015–F-018** | Utilization heatmap, win/loss correlation, stale nudges, data quality score | Not built. |
| **X-005** | Leaders/CXO analytics | Not built. |
| **F-013, A-001** | Gamification, Gemini note upload | Not built. |
| **Remaining O-, R-, X-** | Server-side merge, prefetch, backup verification, metrics, optional features | Backlog or planned. |

### Reprioritisation (after this review)

- **Data (D-001, D-002)** is done → no longer Phase 1 “to build”. **New P1** = next highest value: **Revenue & compliance (F-001, F-002)**.
- Then: Reliability & scale (O-001, O-002, R-001, R-002, T-001) → Email & communications → Roles & proactive insights → Optimisation, AI, Gamification, Optional.

---

## 3. Numbering Scheme and Section Order

All items are renumbered and grouped as follows:

| Prefix | Section | Example |
|--------|---------|--------|
| **F-** | Features (user-facing) | F-001, F-002 … |
| **O-** | Optimisation (performance, data safety, scale) | O-001, O-002 … |
| **R-** | Ops & reliability (backups, runbooks, observability) | R-001, R-002 … |
| **A-** | AI / Smart features | A-001, A-002 … |
| **T-** | Testing & validation | T-001, T-002 … |
| **X-** | Optional / nice-to-have | X-001, X-002 … |
| **D-** | Architecture & data (technical debt / strategic) | D-001, D-002 … |

Within each section, numbers are sequential. Legacy P-numbers are preserved in the master list (§4) for traceability.

---

## 4. Master Item List (by Section)

### 4.1 Features (F-)

| ID | Legacy | Stream | Title | Description | Priority |
|----|--------|--------|-------|-------------|----------|
| **F-001** | P-024 | Wins/Comms | Salesforce wins Excel upload + notifications | Admin uploads Excel (SFDC win data); parse; store per month; dashboard callout “Wins & losses this month”; notify presales owners (in-app; email later). | High |
| **F-002** | P-006 | Auth | Cookie-only auth cutover | Remove header/API-key fallback after all users on cookie auth. | High |
| **F-003** | P-004 | Win-Loss | Single-project default | If account has one project, auto-select in win/loss forms. | High |
| **F-004** | P-015 | Comms | Download email package | Generate downloadable monthly email body + assets (HTML/zip) for manual send; align with MONTHLY_EMAIL_REPORT_SPEC. | High |
| **F-005** | P-013 | Reports | Reports enhancements | Analytics/reports UI and presets; project dropdown and project-level info when logging activity; ensure new projects appear in dropdown. | Medium |
| **F-006** | P-014 | Reports | Export suite | Expand CSV/XLSX/PDF export for reports and admin views (login logs, activity logs, analytics table, monthly report). | Medium |
| **F-007** | P-016 | Comms | Email notifications | Alerting for login anomalies/failures; optional report digests. | Medium |
| **F-008** | P-019 | Admin | Admin panel split/cleanup | Streamline admin sections; remove stale/duplicate flows. | Medium |
| **F-009** | — | **NEW** | In-app release notes / changelog | Small “What’s new” or release notes (e.g. modal or doc link) on first load after deploy; dismissible. | Low |
| **F-010** | — | **NEW** | Keyboard shortcuts | E.g. Ctrl+K search, Escape close modals, basic nav shortcuts; document in UI. | Low |
| **F-011** | — | **NEW** | Bulk actions (activities) | Select multiple activities (e.g. same month) for bulk delete or bulk reassign owner; confirm step. | Low |
| **F-012** | — | **NEW** | Loading data view | **Done.** Spinner (dual-ring), progress bar, staged messages, fun rotating tips; overlay until data ready. | — |
| **F-013** | — | **NEW** | Gamification (points & engagement) | Points for actions (see §4.1.1); optional streaks, badges, leaderboard. Store points in storage/DB; show on dashboard. | Medium |
| **F-014** | — | **NEW** | Email integration (epic) | In-app + outbound email: digest, win/loss alerts, monthly report send, login anomalies. See §4.1.2. **Prioritised.** | High |
| **F-015** | — | **NEW** (external review) | Presales utilization heatmap | Visual calendar/heatmap: hours logged per day/week per presales rep; red flag &gt;45 h/week, green for optimal. Management view for burnout vs capacity. | High |
| **F-016** | — | **NEW** (external review) | Win/loss correlation engine | Once F-001 (SFDC wins) is in: correlate which activity types (e.g. Deep Dive Demo vs High Level Pitch) have highest correlation with Closed Won. “What works” insights. | High |
| **F-017** | — | **NEW** (external review) | Stale account nudges | If account has active project but no logged activity in last 14 days, surface “Needs Attention” card on presales rep’s dashboard. | Medium |
| **F-018** | — | **NEW** (external review) | Data quality score | Score 0–100 per rep based on timeliness of logging (e.g. same-day = better than 10 days late). Reduces “entering months of work right before report” and gamifies good data entry. Complements F-013. | Medium |

#### 4.1.1 Gamification — Points and ideas (F-013)

Suggested point values and engagement levers (configurable by admin):

| Action | Points | Notes |
|--------|--------|--------|
| Log a **loss** (win/loss updated to Lost) | **5** | Encourages honest tracking; losses are high-signal. |
| Log a **win** (Win/Loss updated to Won) | **2** | Celebrate wins without overshadowing loss logging. |
| Log an **activity** (external or internal) | **1** | Per activity; cap per day optional (e.g. max 10/day). |
| First activity of the week | **+2 bonus** | “Week starter” bonus. |
| SFDC link added to project/account | **+1** | Compliance nudge. |
| **Streaks** | — | Consecutive days with ≥1 activity; show “3-day streak” etc. |
| **Badges** | — | e.g. “10 activities this month”, “5 wins”, “Full week”, “No missing SFDC”. |
| **Leaderboard** | — | Monthly points by user (or by region); optional privacy (show top 5 only). |

**Implementation (Railway):** Store `userPoints` or `gamification` key in storage (per user, per month); compute points on save (activity, win/loss); dashboard widget or sidebar “Your points this month” and optional leaderboard view.

#### 4.1.2 Email integration — Epic (F-014)

Prioritised email capabilities (all via existing Railway + `server/services/email.js` / `notifications.js`; no new infra):

| Capability | Description | Priority |
|------------|-------------|----------|
| **Monthly report send** | One-click “Email this month’s report” from Reports (or auto-send to list); use F-004 email package as body. | High |
| **Win/loss alerts** | When a win or loss is logged (or imported via F-001), email the presales owner: “Your project X was marked Won/Lost.” | High |
| **Weekly digest** | Optional weekly summary per user: your activities, your wins/losses, team headline. | Medium |
| **Login anomaly alerts** | Admin (or configured address) gets email on failed logins or unusual patterns (F-007). | Medium |
| **SFDC reminder** | Optional: weekly email to users with “missing SFDC” activities. | Low |

---

### 4.2 Optimisation (O-)

| ID | Legacy | Stream | Title | Description | Priority |
|----|--------|--------|-------|-------------|----------|
| **O-001** | P-008 | Data safety | Draft-first conflict UX | Clear conflict messaging; retry from Drafts; one-line warning: “Submitting again will replace current saved data.” | High |
| **O-002** | P-009 | Performance | Activities at scale API | Month-scoped (and batched) activity reads for activities view and reports; keep Railway single-process, in-memory cache only. | High |
| **O-003** | P-007 | Data safety | Non-entity async hardening | Replace sync fallbacks where remote async is expected. | High |
| **O-004** | P-010 | Performance | Prefetch tuning | Tune prefetch cadence/scope from production telemetry; stay within Railway memory/CPU. | Medium |
| **O-005** | — | Data safety | Server-side merge (accounts) | On PUT `accounts`, merge by id (and projects by id); newer wins. Avoid one stale save wiping list. **Railway:** no new services; logic in existing storage route. | High (backlog) |
| **O-006** | — | Data safety | Server-side merge (internalActivities) | Same as O-005 for `internalActivities`. | Medium (backlog) |
| **O-007** | — | **NEW** | Storage read cache TTL config | Expose `STORAGE_READ_CACHE_TTL_MS` (or similar) in config/admin so Railway can tune without redeploy. | Low |
| **O-008** | — | **NEW** | Refetch on tab focus after idle | When tab gains focus and last entity refetch > N min, trigger reconcile to reduce multi-tab overwrites. | Medium (backlog) |

---

### 4.3 Ops & Reliability (R-)

| ID | Legacy | Stream | Title | Description | Priority |
|----|--------|--------|-------|-------------|----------|
| **R-001** | P-011 | Migration | Migration cleanup plan | Finalize migration tab flow; merge/overwrite controls; document. | High |
| **R-002** | P-012 | Migration | Migration runbook | Step-by-step migration checklist; rollback guidance; run one E2E and close MIGRATION_GAPS.md. | High |
| **R-003** | P-017 | Backups | Backup verification | Recurring verification + restore test checklist/report. **Railway:** backups remain GitHub Actions → repo; no external backup service. | Medium |
| **R-004** | P-018 | Observability | Production metrics baseline | Request/latency/error baseline; simple SLO thresholds. **Railway:** use existing logs + optional in-app metrics endpoint (counts, cache hit rate); no external APM required. | Medium |
| **R-005** | — | **NEW** | Health check depth | Optional `GET /api/health?deep=1` that runs a lightweight DB query and returns DB latency; keep default health cheap for Railway. | Low |
| **R-006** | — | **NEW** | Alert on storage count drops | When activity/account PUT payload count drops significantly vs prior (e.g. &lt;90%), log prominently for trim detection. | Medium (backlog) |
| **R-007** | — | **NEW** | Env var checklist in docs | Document required/optional env vars for Railway (DATABASE_URL, PORT, FORCE_REMOTE_STORAGE, SESSION_*, CORS, etc.) in DEPLOYED.md or runbook. | Low |

---

### 4.4 AI / Smart (A-)

| ID | Legacy | Stream | Title | Description | Priority |
|----|--------|--------|-------|-------------|----------|
| **A-001** | P-025 | AI | Gemini note upload for activity logging | Upload meeting note; Gemini extracts activity fields; prefill or create activity. **Railway:** server-side call to Gemini API; no new worker. | Medium |
| **A-002** | P-023 | Optional | Advanced analytics | Funnels, cohort trends, leaderboards (can be AI-assisted). | Low (backlog) |

---

### 4.5 Testing & Validation (T-)

| ID | Legacy | Area | Title | Description | Priority |
|----|--------|------|-------|-------------|----------|
| **T-001** | — | Migration | E2E migration flow | Run full migration: load CSV → draft → confirm by month → promote; document; close MIGRATION_GAPS.md. | High |
| **T-002** | — | Code | Dead/underused code review | Review scripts (inspect-wins-xlsx, extract-cai-cube-*, preloadMigration, etc.) and feature-flagged paths; remove or document. | Medium |

---

### 4.6 Optional (X-)

| ID | Legacy | Title | Description | Priority |
|----|--------|-------|-------------|----------|
| **X-001** | P-020 | Win of the month UI | Featured win callout on dashboard. | Low |
| **X-002** | P-021 | File attachments | Attach files to activities/accounts; storage on Railway (e.g. DB BLOB or existing storage key); size/count limits. | Low |
| **X-003** | P-022 | Calendar integration | Optional sync of key activity dates to Google/Outlook. | Low |
| **X-004** | — | **NEW** | Restore from backup UI | In My Drafts (or Admin), “Restore from backup” when backup exists; confirm warning (possible duplicates). | Low |
| **X-005** | — | **NEW** | Leaders/CXO analytics (AUTH_AND_LEADERS_SPEC) | Sales users, Sales leaders (one region), Leaders (all regions, slice-and-dice). Server-side scope + in-memory cache only (Railway). | Medium (when prioritised) |

---

### 4.7 Architecture & data (D-) — Response to external review

| ID | Title | Description | Priority |
|----|-------|-------------|----------|
| **D-001** | Server-side validation & schema checks | **Done.** Implemented in `server/lib/storageValidation.js`; wired in storage route. | — |
| **D-002** | Data normalization migration (strategic) | **Done.** Normalized tables, dual-write, backfill script, activity_submission_logs. Optional: read-path cutover (`READ_FROM_NORMALIZED_TABLES`). See `docs/DEPLOYED.md`, `docs/DATABASE_SCHEMA.md`. | — |

**Context:** Data (D-001, D-002) is implemented and deployed. **New P1** is Revenue & compliance (F-001, F-002). See §2.1 Ready vs not ready.

---

## 5. Gap Analysis (Summary by Section)

### 5.1 Features — Gaps

- **CRM/SFDC:** No in-app SFDC wins upload (F-001); no “Wins this month” callout or presales notifications.
- **Auth:** Header/API-key fallback still present (F-002).
- **Export/Comms:** No full export suite (F-006), no downloadable email package (F-004), email notifications (F-007) not wired end-to-end.
- **Reports:** Presets exist; project dropdown and project-level completeness (F-005) and export expansion (F-006) pending.
- **New:** No in-app release notes (F-009), keyboard shortcuts (F-010), or bulk actions (F-011). **Loading view (F-012) done.** Gamification (F-013) and email epic (F-014) on roadmap.

### 5.2 Optimisation — Gaps

- **Data safety:** Draft conflict UX (O-001), async hardening (O-003), server-side merge (O-005, O-006) pending or backlog.
- **Performance:** Month-scoped activities API (O-002) and prefetch tuning (O-004) pending; must stay within Railway single-process and in-memory cache.

### 5.3 Ops & Reliability — Gaps

- **Migration:** Cleanup (R-001) and runbook + E2E (R-002) not done.
- **Backups/Observability:** Verification (R-003) and metrics baseline (R-004) planned; no deep health (R-005) or storage-drop alert (R-006) yet.

### 5.4 AI — Gaps

- Gemini note upload (A-001) and advanced analytics (A-002) not built.

### 5.5 Testing — Gaps

- Migration E2E (T-001) and dead-code review (T-002) to do.

### 5.6 Optional — Gaps

- Win of the month (X-001), file attachments (X-002), calendar (X-003), restore-from-backup UI (X-004), Leaders/CXO (X-005) not implemented.

---

## 6. Suggested Roadmap (Phased)

**Constraint:** All phases run on **Railway as-is** (Node + PostgreSQL; no Redis, no extra workers).

### Data (D-001, D-002) — Done

D-001 (server-side validation) and D-002 (normalized tables, dual-write, backfill) are implemented and deployed. See §2.1 and `docs/DEPLOYED.md`. Optional follow-up: read-path cutover (`READ_FROM_NORMALIZED_TABLES`) when ready.

### Phase 1 (P1) — Revenue & compliance (1–2 sprints)

Next highest priority after data: SFDC wins visibility and auth hardening.

| Order | ID | Item | Deliverable |
|-------|-----|------|-------------|
| 1 | **F-001** | Salesforce wins Excel upload + callout + notifications | `POST /api/admin/wins-import` (multipart); parse xlsx; **column mapping validation, preview before apply**, clear errors; store per month; dashboard card “Wins & losses this month”; in-app list; optional per-owner callout. |
| 2 | **F-002** | Cookie-only auth | Remove header/API-key fallback; document. |

### Phase 2 — Reliability & scale (2–3 sprints)

| Order | ID | Item | Deliverable |
|-------|-----|------|-------------|
| 3 | **O-001** | Draft conflict UX | Conflict copy + “resubmit replaces current data” warning; retry from Drafts. |
| 4 | **O-002** | Month-scoped activities API | Activities API month-scoped/batched; wire activities view and reports; in-memory cache where helpful. |
| 5 | **R-001**, **R-002**, **T-001** | Migration cleanup + runbook + E2E | Finalize tab flow; runbook doc; one full E2E run; update MIGRATION_GAPS.md. |

### Phase 3 — Email integration & communications (2–3 sprints)

| Order | ID | Item | Deliverable |
|-------|-----|------|-------------|
| 6 | **F-014** / **F-004** | Email integration (epic) + download package | Monthly report as downloadable HTML/assets; **one-click “Email this month’s report”**; win/loss alerts to presales owner when project marked Won/Lost; optional weekly digest. Use existing `email.js` / `notifications.js` on Railway. |
| 7 | **F-007** | Email notifications | Login anomaly alerts to admin; optional report digest. |
| 8 | **F-006**, **F-005** | Export suite + reports enhancements | CSV/XLSX/PDF where applicable; reports UI and project dropdown completeness. |

### Phase 4 — Roles, analytics & proactive insights

| Order | ID | Item | Deliverable |
|-------|-----|------|-------------|
| 9 | **X-005** | Leaders/CXO (AUTH_AND_LEADERS_SPEC) | Sales/Sales leader/Leader roles; scope (region vs all); analytics API params; in-memory cache keyed by scope; slice-and-dice UI. |
| 9b | **F-015**, **F-017**, **F-018** | Utilization heatmap, stale nudges, data quality score | Heatmap (hours/week per rep, red/green flags); “Needs Attention” for accounts with no activity in 14 days; data quality score 0–100 by timeliness of logging. |
| 9c | **F-016** | Win/loss correlation engine | After F-001: correlate activity types with Closed Won; “what works” report. |

### Phase 5 — Optimisation, Ops, AI, Gamification, Optional (as capacity)

| Order | ID | Item |
|-------|-----|------|
| 10 | **F-013** | **Gamification** — Points (5 loss / 2 win / 1 activity), streaks, badges, monthly leaderboard; dashboard widget “Your points this month”. |
| 11 | **A-001** | Gemini note upload (A-001) |
| 12 | **O-003**, **O-004** | Async hardening (O-003), prefetch tuning (O-004) |
| 13 | **R-003**, **R-004** | Backup verification (R-003), metrics baseline (R-004) |
| 14 | **F-003**, **F-008** | Single-project default (F-003), admin cleanup (F-008) |
| 15 | **F-009**, **F-010**, **F-011** | Release notes (F-009), shortcuts (F-010), bulk actions (F-011) |
| 16 | **O-005**, **O-006**, **O-007**, **O-008** | Server-side merge (O-005, O-006), cache TTL config (O-007), refetch on focus (O-008) |
| 17 | **R-005**, **R-006**, **R-007** | Deep health (R-005), storage-drop alert (R-006), env checklist (R-007) |
| 18 | **X-001** … **X-004** | Win of month (X-001), attachments (X-002), calendar (X-003), restore-from-backup (X-004) |

---

## 7. Summary Table (Roadmap at a glance)

| Phase | Focus | Key IDs |
|-------|--------|---------|
| **—** | **Data (done)** | D-001, D-002 — deployed; see §2.1 |
| **1 (P1)** | **Revenue & compliance** | **F-001, F-002** |
| **2** | Reliability & scale | O-001, O-002, R-001, R-002, T-001 |
| **3** | **Email integration** & communications | F-014, F-004, F-007, F-006, F-005 |
| **4** | Roles, analytics & **proactive insights** | X-005, F-015, F-016, F-017, F-018 |
| **5** | Optimisation, Ops, AI, **Gamification**, Optional | F-013, A-001, O-003, O-004, R-003, R-004, F-003, F-008, F-009–F-011, O-005–O-008, R-005–R-007, X-001–X-004 |

---

## 8. Railway Constraint — Explicit Rules

- **Hosting:** Railway only; no other PaaS or VMs.
- **Database:** PostgreSQL on Railway; no read replicas or external DB.
- **Cache:** In-memory only (e.g. storage read cache, analytics cache); no Redis or external cache.
- **Workers:** Single Node process; no background worker process or queue service.
- **Backups:** GitHub Actions → repo (e.g. backups/); no external backup storage required.
- **Observability:** Logs + optional in-app metrics endpoint; no mandatory external APM.
- **File storage:** For wins upload (F-001) and future attachments (X-002): use request body/DB or existing storage keys; avoid large file blobs if possible; if blobs, stay within Railway/PostgreSQL limits.

---

## 9. References

- **Backlog:** `docs/PLANNED_AND_BACKLOG.md`, `docs/BACKLOG_BY_CATEGORY.md`
- **External review & PM response:** `docs/EXTERNAL_REVIEW_PM_RESPONSE.md`
- **Deployed:** `docs/DEPLOYED.md`
- **Auth & Leaders:** `docs/AUTH_AND_LEADERS_SPEC.md`
- **Migration:** `docs/MIGRATION_MODE_SPEC.md`, `docs/MIGRATION_GAPS.md`
- **Reports:** `docs/ANALYTICS_AND_REPORTS_PLAN.md`, `docs/MONTHLY_EMAIL_REPORT_SPEC.md`
- **F-001 (P-024) approach:** `docs/PLANNED_AND_BACKLOG.md` §5

---

*Product Manager review: renumbered (F/O/R/A/T/X), sectionised (Features → Optimisation → Ops → AI → Testing → Optional), with added suggestions and Railway-as-is constraint. Update when priorities or backlog change.*
