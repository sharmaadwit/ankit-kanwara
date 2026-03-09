# PAMS - Backlog by Category

Backlog items grouped by category. **Numbering is sequential per section (1, 2, 3 …)** within each category.

---

## Current status snapshot

**Recently deployed (2025–2026):**

- **Activities:** Default "My activities" filter; activity date default; sort by date; enablement optional warning; **Group by Month / Project / Activity type**; editable project name in Log activity; project dropdown fixed (no auto-close, fixed positioning, stays open).
- **Dashboard & drafts:** Total activities exclude drafts; "Submit all" removed (submit per draft via Edit & Save); draft error message cleared when opening; better empty state; drafts per user only.
- **Suggestions:** localStorage fallback when remote key is empty (restore from local if remote cleared).
- **Accounts UI:** Single header with search + Log Activity + Merge; sidebar with collapse; responsive grid; account cards with region badge and project count.
- **Railway:** Health check path `/api/health`, `railway.toml`, static logging, 404 troubleshooting doc.
- **Industries:** Industry/use-case merge UX (confirm flow, optional final name).

**Platform direction:** Fast first paint, no data loss/conflicts, minimal DB load on Railway free tier.

**Reference:** `docs/DEPLOYED.md`, `docs/PLANNED_AND_BACKLOG.md`.

**Note:** Migration mode is implemented but not yet fully tested in production; see **Testing & validation** below.

---

## What to work on next (suggested order)

| Order | Category | No. | Focus |
|-------|----------|-----|--------|
| 1 | Feature | 14 | Salesforce wins Excel upload + presales notifications + dashboard callout |
| 2 | Feature | 6 | Cookie-only auth cutover (after all users on cookie auth) |
| 3 | Optimising | 2 | Draft-first conflict UX (messaging + retry from Drafts) |
| 4 | Optimising | 3 | Activities at scale (month-scoped/batched API) |
| 5 | Ops | 1 + 2 | Migration cleanup + runbook; run E2E migration test |
| 6 | Feature | 9 | Download email package (monthly email body/assets) |
| 7 | Feature | 8 + 7 | Export suite + reports enhancements |
| 8 | Feature | 10 | Email notifications (login anomalies, report digests) |
| 9 | AI | 1 | Gemini note upload for activity logging |

---

## Feature (user-facing product work)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Activities | Activity date default | Default new activity date to last logged. | **Done** | High |
| 2 | Activities | Sort + owner defaults | Sort by date; default filter "My activities". | **Done** | High |
| 3 | Activities | Enablement optional warning | Save without days/hours with explicit warning. | **Done** | Medium |
| 4 | Accounts/Win-Loss | Single-project default | If account has one project, auto-select in win/loss forms. | Planned | High |
| 5 | Industries | Industry/use-case merge UX | Merge flow: enter merged name, choose base, confirm. | **Done** | Medium |
| 6 | Auth | Cookie-only final cutover | Remove header/API-key fallback after all users on cookie auth. | Planned | High |
| 7 | Reports | Reports enhancements | Continue analytics and reports UI/presets. Project update: ensure new projects (e.g. under an account) appear in project dropdown when logging activity; retain project-level info (use cases, products) when creating new project and when opening activity for edit. | Planned | Medium |
| 8 | Reports | Export suite | Expand CSV/XLSX/PDF export for reports and admin views. | Planned | Medium |
| 9 | Communications | Download email package | Generate downloadable monthly email body/assets for manual send. | Planned | High |
| 10 | Communications | Email notifications | Alerting for login anomalies, failures, optional report digests. | Planned | Medium |
| 11 | Admin | Admin panel split/cleanup | Streamline admin sections, remove stale/duplicate flows. | Planned | Medium |
| 12 | Optional | Win of the month UI | Featured win callout module. | Backlog | Low |
| 13 | Optional | File attachments | Attach files to activities/accounts with controlled storage. | Backlog | Low |
| 14 | Wins/Comms | Salesforce wins Excel + presales notifications | Upload Excel (Salesforce win data); parse; store; notify presales; dashboard notification + callout. | Planned | High |

---

## Optimising (performance, data safety, scale)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Async/Data Safety | Non-entity async hardening | Replace sync fallbacks where remote async is expected. | In progress | High |
| 2 | Async/Data Safety | Draft-first conflict UX | Improve conflict messaging and retry from Drafts for full-list saves. Show one-line warning for conflict drafts: "Submitting again will replace the current saved data with this draft." | Planned | High |
| 5 | Async/Data Safety | Account+project lock (Option B) | When someone submits an activity update or delete, lock only that account+project (max 60s). Unlock when done; if lock held >60s treat as released. On 423 save to Drafts and retry. Implemented but not yet deployed (see server/lib/accountProjectLock.js, storage.js append/remove). | Backlog | Medium |
| 6 | Async/Data Safety | Admin update/merge: targeted autosave + lock | When admin updates or merges (e.g. account merge, bulk reassign), only update the affected activities (and accounts) via targeted APIs (append/remove per activity, not full-list PUT). Then lock in the update (same one-at-a-time + account/project lock as in #5) so we never overwrite the full list. | Backlog | Medium |
| 7 | Async/Data Safety | Server-side merge for accounts | On storage PUT for `accounts`, merge incoming with current by account id (and nested projects by project id), newer wins. Prevents one partial/stale saveAccounts() from wiping the whole account list. See docs/TECH_EVALUATION_AND_DATA_SAFETY_FIX.md. | Backlog | High |
| 8 | Async/Data Safety | Server-side merge for internalActivities | Same as #7 but for `internalActivities` key (merge by id, newer wins). | Backlog | Medium |
| 9 | Async/Data Safety | Sync path lastVersion on 409 | In the sync setItem path (remoteStorage), when we catch 409 and have error.updated_at, set lastVersion[key] = error.updated_at before merge/retry so "Submit again" uses the right version. | Backlog | Medium |
| 10 | Async/Data Safety | Refetch on tab focus after idle | When tab gains focus and last refetch for entity keys was > N minutes (e.g. 2), trigger reconcile (GET activities/accounts and set lastVersion) to reduce multi-tab stale overwrites. | Backlog | Medium |
| 11 | Async/Data Safety | Restore from backup UI | Add "Restore from backup" in My Drafts when backup exists; confirm warning that it can create duplicates if some drafts were already submitted. See DATA_LOSS_AND_CONFLICT_BLINDSPOTS.md. | Backlog | Low |
| 3 | Performance | Activities at scale API | Month-scoped/batched activity reads for large datasets. | Planned | High |
| 4 | Performance | View-level prefetch tuning | Tune prefetch cadence/scope from production telemetry. | Planned | Medium |

---

## Ops & reliability (backups, observability, runbooks)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | Migration | Migration cleanup plan | Finalize migrated data tab flow, merge, overwrite controls. | Planned | High |
| 2 | Migration | Migration runbook | Step-by-step validated migration checklist, rollback guidance. | Planned | High |
| 3 | Ops/Backups | Backup verification automation | Recurring verification and restore test checklist/report. Periodically restore from latest backup and compare activity/account counts to production. | Planned | Medium |
| 4 | Ops/Observability | Production metrics baseline | Request/latency/error dashboards and SLO thresholds. | Planned | Medium |
| 5 | Ops/Observability | Alert on storage count drops | When activity or account PUT payload count drops significantly vs previous (e.g. &lt; 90% of prior), log or alert so trim events are detected early. See TECH_EVALUATION_AND_DATA_SAFETY_FIX.md. | Backlog | Medium |

---

## AI / Smart features

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| 1 | AI | Gemini note upload for activity logging | Upload a note; use Gemini to extract activity fields and prefill/create activity. | Planned | Medium |
| 2 | Optional | Calendar integration | Optional sync of dates/schedules (e.g. Google/Outlook). | Backlog | Low |
| 3 | Optional | Advanced analytics | Funnels, cohort trends, leaderboards (can be AI-assisted). | Backlog | Low |

---

## Testing & validation (implemented but not fully tested/used)

| No. | Area | Description | Status |
|-----|------|-------------|--------|
| 1 | End-to-end migration flow | Migration mode is built (CSV import, draft/confirmed store, dashboard, promote). Not yet fully tested in production. Run full flow; document runbook (Ops 2); close gaps in `docs/MIGRATION_GAPS.md`. | To do |
| 2 | Underused or dead code | Review scripts (`inspect-wins-xlsx`, `extract-cai-cube-*`, preload wins xlsx, etc.) and feature-flagged paths. Migration import is CSV-only in-app; no in-app wins Excel upload yet (see Feature 14). | To do |

---

## Optional / Nice-to-have (low priority)

| No. | Project | Description |
|-----|---------|-------------|
| 1 | Win of the month UI | Featured win callout. |
| 2 | File attachments | Attachments for activities/accounts. |
| 3 | Calendar integration | Optional calendar sync. |
| 4 | Advanced analytics | Funnels, cohorts, leaderboards. |

---

## Cross-reference: Category number ↔ Legacy P-number

| Category | No. | Legacy ID |
|----------|-----|-----------|
| Feature | 1–14 | P-001 … P-005, P-006, P-013 … P-016, P-019 … P-021, P-024 |
| Optimising | 1–4 | P-007 … P-010 |
| Ops & reliability | 1–4 | P-011, P-012, P-017, P-018 |
| AI / Smart features | 1–3 | P-025, P-022, P-023 |

Full detail and P-024 (Salesforce wins) approaches: `docs/PLANNED_AND_BACKLOG.md`.
