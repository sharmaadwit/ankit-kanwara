# PAMS - Backlog by Category

Backlog items grouped by category. **Numbering is sequential per section (1, 2, 3 …)** within each category.

---

## Current Status Snapshot

- **Deployed:** Backup retention, activity date refresh, remember last date, bootstrap init, batch reconcile, dashboard-first load, conflict-safe draft flow.
- **Platform direction:** Fast first paint, no data loss/conflicts, minimal DB load on Railway free tier.
- **Reference:** `docs/DEPLOYED.md`.
- **Note:** Migration mode is implemented but not yet fully tested or used in production; see **Testing & validation** below.

---

## Feature (user-facing product work)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Activities | Activity date default | Default new activity date to last logged. | Planned | High |
| 2 | Activities | Sort + owner defaults | Sort by logged date; default filter "My activities". | Planned | High |
| 3 | Activities | Enablement optional warning | Allow save without days/hours for Enablement with explicit warning. | Planned | Medium |
| 4 | Accounts/Win-Loss | Single-project default | If account has one project, auto-select in win/loss forms. | Planned | High |
| 5 | Industries | Industry/use-case merge UX | Merge flow: enter merged name, choose base, tweak, confirm. | Planned | Medium |
| 6 | Auth | Cookie-only final cutover | Remove header/API-key fallback after all users on cookie auth. | Planned | High |
| 7 | Reports | Reports enhancements | Continue analytics and reports UI/presets. | Planned | Medium |
| 8 | Reports | Export suite | Expand CSV/XLSX/PDF export for reports and admin views. | Planned | Medium |
| 9 | Communications | Download email package | Generate downloadable monthly email body/assets for manual send. | Planned | High |
| 10 | Communications | Email notifications | Alerting for login anomalies, failures, optional report digests. | Planned | Medium |
| 11 | Admin | Admin panel split/cleanup | Streamline admin sections, remove stale/duplicate flows. | Planned | Medium |
| 12 | Optional | Win of the month UI | Featured win callout module. | Backlog | Low |
| 13 | Optional | File attachments | Attach files to activities/accounts with controlled storage. | Backlog | Low |
| 14 | Wins/Comms | Salesforce wins/losses Excel + presales notifications | Upload Excel (Salesforce win data); parse; store; notify presales owners about wins/losses that month; dashboard notification + callout. | Planned | High |

---

## Optimising (performance, data safety, scale)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Async/Data Safety | Non-entity async hardening | Replace sync fallbacks where remote async is expected. | In progress | High |
| 2 | Async/Data Safety | Draft-first conflict UX | Improve conflict messaging and retry from Drafts for full-list saves. | Planned | High |
| 3 | Performance | Activities at scale API | Month-scoped/batched activity reads for large datasets. | Planned | High |
| 4 | Performance | View-level prefetch tuning | Tune prefetch cadence/scope from production telemetry. | Planned | Medium |

---

## Ops & reliability (backups, observability, runbooks)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Migration | Migration cleanup plan | Finalize migrated data tab flow, merge, overwrite controls. | Planned | High |
| 2 | Migration | Migration runbook | Step-by-step validated migration checklist, rollback guidance. | Planned | High |
| 3 | Ops/Backups | Backup verification automation | Recurring verification and restore test checklist/report. | Planned | Medium |
| 4 | Ops/Observability | Production metrics baseline | Request/latency/error dashboards and SLO thresholds. | Planned | Medium |

---

## AI / Smart features

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | AI | Gemini note upload for activity logging | Upload a note (e.g. meeting notes); use Gemini to extract activity fields and prefill or create activity log entry. | Planned | Medium |
| 2 | Optional | Calendar integration | Optional sync of important dates and activity schedules (e.g. to Google/Outlook). | Backlog | Low |
| 3 | Optional | Advanced analytics | Additional funnels, cohort trends, leaderboards (can be AI-assisted). | Backlog | Low |

---

## Testing & validation (implemented but not fully tested/used)

| No. | Area | Description | Status |
|-----|------|-------------|--------|
| 1 | End-to-end migration flow | Migration mode is built (CSV import, draft/confirmed store, migration dashboard, confirm draft/promote). Not yet fully tested or used in production. Run full flow: load CSV, review draft counts, confirm by month, promote; document runbook (Ops 2) and close gaps in `docs/MIGRATION_GAPS.md`. | To do |
| 2 | Underused or dead code | Scripts: `inspect-wins-xlsx.js`, `extract-migration-mapping.js`, `extract-cai-cube-*`, `preloadMigration` (wins from xlsx at startup). Migration import is CSV-only in-app; wins xlsx is server-side preload only. No in-app upload of wins Excel yet (see Feature 14). Review other scripts and feature-flagged paths for unused or duplicate logic. | To do |

---

## Optional / Nice-to-have (low priority)

| No. | Project | Description |
|-----|---------|-------------|
| 1 | Win of the month UI | Featured win callout. |
| 2 | File attachments | Attachments for activities/accounts. |
| 3 | Calendar integration | Optional calendar sync. |
| 4 | Advanced analytics | Funnels, cohorts, leaderboards. |

---

## Suggested execution order

1. **Feature 14** — Salesforce wins/losses Excel upload + dashboard notification.
2. **Feature 6** — Cookie-only cutover (after user migration confirmed).
3. **Optimising 2** — Drafts conflict UX.
4. **Optimising 3** — Month-scoped activity reads.
5. **Ops 1 + Ops 2** — Migration cleanup + runbook; run migration E2E test (Testing 1).
6. **Feature 9** — Download email package.
7. **Feature 8 + Feature 7** — Export suite and reports.
8. **Feature 10** — Email notifications.
9. **AI 1** — Gemini note upload for activity logging (when ready for AI features).

---

## Cross-reference: Category number ↔ Legacy P-number

For traceability with the original backlog:

| Category | No. | Legacy ID |
|----------|-----|-----------|
| Feature | 1–14 | P-001, P-002, P-003, P-004, P-005, P-006, P-013, P-014, P-015, P-016, P-019, P-020, P-021, P-024 |
| Optimising | 1–4 | P-007, P-008, P-009, P-010 |
| Ops & reliability | 1–4 | P-011, P-012, P-017, P-018 |
| AI / Smart features | 1–3 | P-025, P-022, P-023 |

Full detail, approaches for Feature 14 (Salesforce wins), and references: `docs/PLANNED_AND_BACKLOG.md`.
