# PAMS - Planned Work and Backlog

Single source of truth for roadmap, backlog, and deployment priorities.
Numbering is global (`P-001` … `P-026`). Items are grouped by **category**: Feature, Optimising, Ops & reliability, AI / Smart features, Testing & validation, Optional.

---

## 1) Current Status Snapshot

- **Deployed:** Backup retention, activity date refresh, remember last date, bootstrap init, batch reconcile, dashboard-first load, conflict-safe draft flow.
- **Platform direction:** Fast first paint, no data loss/conflicts, minimal DB load on Railway free tier.
- **Reference:** `docs/DEPLOYED.md`.
- **Note:** Migration mode is implemented (server + client) but **not yet fully tested or used in production**; see § Testing & validation below.

---

## 2) Backlog by Category

### 2.1 Feature (user-facing product work)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| P-001 | Activities | Activity date default | Default new activity date to last logged. | Planned | High |
| P-002 | Activities | Sort + owner defaults | Sort by logged date; default filter "My activities". | Planned | High |
| P-003 | Activities | Enablement optional warning | Allow save without days/hours for Enablement with explicit warning. | Planned | Medium |
| P-004 | Accounts/Win-Loss | Single-project default | If account has one project, auto-select in win/loss forms. | Planned | High |
| P-005 | Industries | Industry/use-case merge UX | Merge flow: enter merged name, choose base, tweak, confirm. | Planned | Medium |
| P-006 | Auth | Cookie-only final cutover | Remove header/API-key fallback after all users on cookie auth. | Planned | High |
| P-013 | Reports | Reports enhancements | Continue analytics and reports UI/presets. | Planned | Medium |
| P-014 | Reports | Export suite | Expand CSV/XLSX/PDF export for reports and admin views. | Planned | Medium |
| P-015 | Communications | Download email package | Generate downloadable monthly email body/assets for manual send. | Planned | High |
| P-016 | Communications | Email notifications | Alerting for login anomalies, failures, optional report digests. | Planned | Medium |
| P-019 | Admin | Admin panel split/cleanup | Streamline admin sections, remove stale/duplicate flows. | Planned | Medium |
| P-020 | Optional | Win of the month UI | Featured win callout module. | Backlog | Low |
| P-021 | Optional | File attachments | Attach files to activities/accounts with controlled storage. | Backlog | Low |
| **P-024** | **Wins/Comms** | **Salesforce wins/losses Excel + presales notifications** | **Upload Excel (Salesforce win data); parse; store; notify presales owners about wins/losses that month; dashboard notification + callout.** | **Planned** | **High** |

---

### 2.2 Optimising (performance, data safety, scale)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| P-007 | Async/Data Safety | Non-entity async hardening | Replace sync fallbacks where remote async is expected. | In progress | High |
| P-008 | Async/Data Safety | Draft-first conflict UX | Improve conflict messaging and retry from Drafts for full-list saves. | Planned | High |
| P-009 | Performance | Activities at scale API | Month-scoped/batched activity reads for large datasets. | Planned | High |
| P-010 | Performance | View-level prefetch tuning | Tune prefetch cadence/scope from production telemetry. | Planned | Medium |

---

### 2.3 Ops & reliability (backups, observability, runbooks)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| P-011 | Migration | Migration cleanup plan | Finalize migrated data tab flow, merge, overwrite controls. | Planned | High |
| P-012 | Migration | Migration runbook | Step-by-step validated migration checklist, rollback guidance. | Planned | High |
| P-017 | Ops/Backups | Backup verification automation | Recurring verification and restore test checklist/report. | Planned | Medium |
| P-018 | Ops/Observability | Production metrics baseline | Request/latency/error dashboards and SLO thresholds. | Planned | Medium |

---

### 2.4 AI / Smart features

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| **P-025** | **AI** | **Gemini note upload for activity logging** | **Upload a note (e.g. meeting notes); use Gemini to extract activity fields and prefill or create activity log entry.** | **Planned** | **Medium** |
| P-022 | Optional | Calendar integration | Optional sync of important dates and activity schedules (e.g. to Google/Outlook). | Backlog | Low |
| P-023 | Optional | Advanced analytics | Additional funnels, cohort trends, leaderboards (can be AI-assisted). | Backlog | Low |

---

### 2.5 Testing & validation (implemented but not fully tested/used)

| No. | Area | Description | Status |
|-----|------|-------------|--------|
| **Migration** | **End-to-end migration flow** | Migration mode is built (CSV import, draft/confirmed store, migration dashboard, confirm draft/promote). **Not yet fully tested or used in production.** Run full flow: load CSV, review draft counts, confirm by month, promote; document runbook (P-012) and close gaps in `docs/MIGRATION_GAPS.md`. | To do |
| **Code recheck** | **Underused or dead code** | Scripts: `inspect-wins-xlsx.js`, `extract-migration-mapping.js`, `extract-cai-cube-*`, `preloadMigration` (wins from xlsx at startup). Migration import is **CSV-only** in-app; wins xlsx is server-side preload only. No in-app **upload** of wins Excel yet (see P-024). Review other scripts and feature-flagged paths for unused or duplicate logic. | To do |

---

### 2.6 Optional / Nice-to-have (low priority)

- **P-020** Win of the month UI  
- **P-021** File attachments  
- **P-022** Calendar integration  
- **P-023** Advanced analytics  

---

## 3) New & updated items (quick reference)

- **P-024 Salesforce wins/losses Excel + presales notifications**  
  Download Salesforce win data → upload Excel to PAMS → parse (reuse/align with existing “2025 Wins with SFDC” xlsx shape) → store per month → notify presales owners about wins/losses for that month → **dashboard notification + callout** (e.g. “Wins & losses this month” or “New wins to review”). See § 5 for suggested approaches.

- **P-025 Gemini note upload for activity logging**  
  User uploads a note (e.g. meeting notes); Gemini parses and suggests activity type, account, date, summary, etc.; user reviews and saves as activity. AI-assisted logging.

- **P-022 Calendar integration**  
  Optional sync of key activity dates to calendar (discussed as AI/smart feature; remains in Optional).

---

## 4) Master list (all items, one table)

| No. | Category | Project | Description | Status | Priority |
|-----|----------|---------|-------------|--------|----------|
| P-001 | Feature | Activity date default | Default new activity date to last logged. | Planned | High |
| P-002 | Feature | Sort + owner defaults | Sort by logged date; default "My activities". | Planned | High |
| P-003 | Feature | Enablement optional warning | Save without days/hours with warning. | Planned | Medium |
| P-004 | Feature | Single-project default | Auto-select project in win/loss when one project. | Planned | High |
| P-005 | Feature | Industry/use-case merge UX | Merge flow with base, rename, confirm. | Planned | Medium |
| P-006 | Feature | Cookie-only final cutover | Remove header/API-key fallback. | Planned | High |
| P-007 | Optimising | Non-entity async hardening | Replace sync fallbacks for async paths. | In progress | High |
| P-008 | Optimising | Draft-first conflict UX | Better conflict/retry from Drafts. | Planned | High |
| P-009 | Optimising | Activities at scale API | Month-scoped/batched reads. | Planned | High |
| P-010 | Optimising | View-level prefetch tuning | Prefetch scope/timing from telemetry. | Planned | Medium |
| P-011 | Ops | Migration cleanup plan | Finalize migration tab, merge, overwrite. | Planned | High |
| P-012 | Ops | Migration runbook | Validated migration checklist. | Planned | High |
| P-013 | Feature | Reports enhancements | Reports UI and presets. | Planned | Medium |
| P-014 | Feature | Export suite | CSV/XLSX/PDF export expansion. | Planned | Medium |
| P-015 | Feature | Download email package | Monthly email body/assets for manual send. | Planned | High |
| P-016 | Feature | Email notifications | Login/report digests, anomalies. | Planned | Medium |
| P-017 | Ops | Backup verification automation | Verification + restore test report. | Planned | Medium |
| P-018 | Ops | Production metrics baseline | Latency/error dashboards, SLOs. | Planned | Medium |
| P-019 | Feature | Admin panel split/cleanup | Simplify admin nav and controls. | Planned | Medium |
| P-020 | Optional | Win of the month UI | Featured win callout. | Backlog | Low |
| P-021 | Optional | File attachments | Attachments for activities/accounts. | Backlog | Low |
| P-022 | AI/Optional | Calendar integration | Optional calendar sync. | Backlog | Low |
| P-023 | Optional | Advanced analytics | Funnels, cohorts, leaderboards. | Backlog | Low |
| P-024 | Feature | Salesforce wins Excel + notifications | Upload Excel → parse → store → notify presales → dashboard callout. | Planned | High |
| P-025 | AI | Gemini note upload for activity logging | Note upload → Gemini extract → prefill activity. | Planned | Medium |

---

## 5) Suggested approaches: P-024 (Salesforce wins Excel + presales notifications)

**Goal:** You download Salesforce win (and optionally loss) data, upload an Excel file to PAMS, and presales owners get notified about wins/losses for that month, with a clear dashboard callout.

### 5.1 Options

| Approach | Pros | Cons |
|----------|------|------|
| **A) Admin uploads Excel once per month** | Simple; reuse existing xlsx parsing (e.g. `preloadMigration` / `inspect-wins-xlsx` column shape). | Manual step; no real-time Salesforce sync. |
| **B) Scheduled job + file drop** | Can automate (e.g. export to shared drive, job picks up file). | Needs file storage and job runner. |
| **C) Salesforce API integration** | Direct sync, no file upload. | More build and auth; may be out of scope for “upload Excel”. |

**Recommendation for now:** **A** — Admin (or designated user) uploads Excel; app parses and stores “wins/losses this month” (or by chosen month); dashboard shows a notification/callout and optionally a list of wins/losses so presales owners see them.

### 5.2 Parsing and storage

- **Format:** Align with existing “2025 Wins with SFDC” xlsx structure (see `scripts/inspect-wins-xlsx.js`, `server/services/preloadMigration.js`). If your new export differs, define a small mapping (sheet name, column indices, date column, account/opportunity, win/loss, owner/presales).
- **Library:** Keep using `xlsx` (already in use in scripts and preload). Add an API route, e.g. `POST /api/wins/upload` or `POST /api/admin/wins-import`, that accepts multipart file upload, parses the first (or configured) sheet, normalises rows (date, account, win/loss, owner), and stores them.
- **Storage:** Store parsed wins in a dedicated key or table, e.g. `salesforce_wins_YYYY_MM` or a single `salesforce_wins` array with `month`/`date` so you can filter “this month” or “selected month”.
- **Idempotency:** Decide whether each upload replaces the month’s data or appends (replace is simpler and avoids duplicates).

### 5.3 Notifications and dashboard

- **In-app notification:** Add a small banner or card on the dashboard when there is wins/loss data for “this month” (or last upload month): e.g. “Wins & losses for February 2026” with a link to a Wins/Loss view or a modal list.
- **Presales owners:** If your Excel has “owner” or “presales” column, you can:
  - **Option 1:** Show one global callout for everyone: “X wins, Y losses this month” and a list (filterable by owner in the UI).
  - **Option 2:** Per-owner notifications: store which presales owners are linked to which rows; on dashboard load, for current user, show “Your wins/losses this month” (requires matching username/email to Excel owner).
- **Email (later):** P-016 (Email notifications) can later send a digest “Wins & losses this month” to presales owners; the same stored data can feed that.

### 5.4 Implementation steps (high level)

1. **Define Excel schema** — Document columns (date, account, opportunity, win/loss, owner, etc.) and share a sample (redacted) so parsing is stable.
2. **Upload API** — `POST /api/admin/wins-import` (or `/api/wins/upload`), multipart; parse with `xlsx`; validate required columns; save to storage.
3. **Storage shape** — e.g. `{ month: '2026-02', wins: [...], losses: [...], uploadedAt: ISO }` or one array with `type: 'win'|'loss'`.
4. **Dashboard** — On load, if there is data for current (or last) month, show a notification/card: “Wins & losses this month” and link to a list/modal; optionally filter by current user if owner is stored.
5. **Wins/loss view** — Reuse or extend existing Win/Loss UI to show “from Salesforce import” for the selected month (and optionally compare with PAMS win/loss entries).

Once you have a sample Excel (column names and 1–2 example rows), the parsing and API can be implemented to match it; the dashboard callout and “presales owner” logic can be added in a follow-up step.

---

## 6) Deployed Items (Historical)

| Build | Item | Description | Status |
|-------|------|-------------|--------|
| B-001 | Backup retention | Latest + dated snapshots with retention. | Deployed |
| B-002 | Activity date refresh | Re-fetch/re-render after date changes. | Deployed |
| B-003 | Last activity date memory | Persist last-used date per user. | Deployed |
| B-004 | First-load performance | Bootstrap + batch reconcile + deferred presets. | Deployed |
| B-005 | Dashboard-first perf/safety | Lazy refresh, draft-safe saves, cache, pool tuning. | Deployed |
| B-006 | Intent prefetch | Sidebar hover/focus prefetch with throttle. | Deployed |

---

## 7) Next Execution Plan (suggested order)

1. **P-024** — Salesforce wins/losses Excel upload + dashboard notification (and callout).
2. **P-006** — Cookie-only cutover (after user migration confirmed).
3. **P-008** — Drafts conflict UX.
4. **P-009** — Month-scoped activity reads.
5. **P-011 + P-012** — Migration cleanup + runbook; **run migration E2E test** (Testing & validation).
6. **P-015** — Download email package.
7. **P-014 + P-013** — Export suite and reports.
8. **P-016** — Email notifications.
9. **P-025** — Gemini note upload for activity logging (when ready for AI features).

---

## 8) References

- Deployment state: `docs/DEPLOYED.md`
- Recovery and safety: `docs/DATA_BACK_TO_104_RECOVERY.md`, `docs/DATA_LOSS_ROOT_CAUSE_AND_RECOVERY.md`
- Migration: `docs/MIGRATION_MODE_SPEC.md`, `docs/MIGRATION_GAPS.md`, `docs/MIGRATION_CLEANUP_PLAN.md`, `docs/CLEANUP_PLAN.md`
- Incident runbook: `docs/INCIDENT_RUNBOOK_DB_FLAP.md`
- Roadmap (v1/v2): `docs/v1.0-launch-prep.md`
