# PAMS - Planned Work and Backlog

Single source of truth for roadmap, backlog, and deployment priorities.
Numbering is global (`P-001`, `P-002`, ...), grouped by project stream.

---

## 1) Current Status Snapshot

- Deployed: backup retention, activity date refresh, remember last date, bootstrap init, batch reconcile, dashboard-first load, conflict-safe draft flow.
- Platform direction: keep first paint fast, protect against data loss/conflicts, minimize DB load on Railway free tier.
- Reference for live state: `docs/DEPLOYED.md`.

---

## 2) Product and Engineering Backlog (Master List)

| No. | Stream | Project | Description | Status | Priority |
|-----|--------|---------|-------------|--------|----------|
| P-001 | Activities | Activity date default = last logged | Default new activity date to the user/project last logged date. | Planned | High |
| P-002 | Activities | Sort + owner defaults | Sort activities by logged date and default filter to My activities. | Planned | High |
| P-003 | Activities | Enablement optional warning | Allow save without days/hours for Enablement with explicit warning. | Planned | Medium |
| P-004 | Accounts/Win-Loss | Single-project default | If account has one project, auto-select it in win/loss forms. | Planned | High |
| P-005 | Industries | Industry/use-case merge UX | Merge flow: enter merged name, choose base, tweak, confirm. | Planned | Medium |
| P-006 | Auth | Cookie-only final cutover | Remove header/API-key fallback after all users are on cookie auth. | Planned | High |
| P-007 | Async/Data Safety | Non-entity async hardening | Continue replacing sync fallbacks where remote async is expected. | In progress | High |
| P-008 | Async/Data Safety | Draft-first conflict UX | Improve conflict messaging and retry path from Drafts for full-list saves. | Planned | High |
| P-009 | Performance | Activities at scale API path | Prefer month-scoped entity endpoint and/or batched reads for large activity datasets. | Planned | High |
| P-010 | Performance | View-level prefetch tuning | Tune prefetch cadence and scope based on production telemetry. | Planned | Medium |
| P-011 | Migration | Migration cleanup plan | Finalize migrated data tab flow, merge behavior, overwrite controls, checks. | Planned | High |
| P-012 | Migration | Migration runbook | Step-by-step validated migration checklist for repeatable execution. | Planned | High |
| P-013 | Reports | Reports enhancements | Continue analytics and reports UI/logic improvements and presets. | Planned | Medium |
| P-014 | Reports | Export suite | Expand CSV/XLSX/PDF export coverage for reports and admin views. | Planned | Medium |
| P-015 | Communications | Download email package | Generate downloadable monthly email body/assets for manual periodic send. | Planned | High |
| P-016 | Communications | Email notifications | Alerting for login anomalies, failures, feature events, optional report digests. | Planned | Medium |
| P-017 | Ops/Backups | Backup verification automation | Add recurring verification and restore test checklist/report. | Planned | Medium |
| P-018 | Ops/Observability | Production metrics baseline | Add request/latency/error dashboards and SLO thresholds. | Planned | Medium |
| P-019 | Admin | Admin panel split/cleanup | Streamline admin sections and remove stale controls/duplicate flows. | Planned | Medium |
| P-020 | Optional | Win of the month UI | Featured win callout module. | Backlog | Low |
| P-021 | Optional | File attachments | Attach files to activities/accounts with controlled storage policy. | Backlog | Low |
| P-022 | Optional | Calendar integration | Optional sync of important dates and activity schedules. | Backlog | Low |
| P-023 | Optional | Advanced analytics | Additional funnels, cohort trends, and leaderboards. | Backlog | Low |

---

## 3) Deployed Items (Historical Tracking)

| Build | Item | Description | Status |
|-------|------|-------------|--------|
| B-001 | Backup retention | Keep latest + dated snapshots with retention window. | Deployed |
| B-002 | Activity date refresh | Re-fetch/re-render after date changes so month placement is correct. | Deployed |
| B-003 | Last activity date memory | Persist last-used date per user for faster entry. | Deployed |
| B-004 | First-load performance | Bootstrap endpoint + batch reconcile + deferred presets. | Deployed |
| B-005 | Dashboard-first perf/safety | Lazy refresh strategy, draft-safe entity saves, storage read cache, pool tuning. | Deployed |
| B-006 | Intent prefetch | Sidebar hover/focus/touch prefetch with throttle and idle scheduling. | Deployed |

---

## 4) Next Execution Plan (Suggested Order)

1. **P-006** Cookie-only final cutover (post user migration confirmation).
2. **P-008** Improve Drafts conflict UX for full-list retries and visibility.
3. **P-009** Month-scoped activity reads in high-volume paths.
4. **P-011 + P-012** Migration cleanup + runbook finalization.
5. **P-015** Download email package for periodic reporting.
6. **P-014 + P-013** Export suite and reports enhancement follow-up.
7. **P-016** Email notifications expansion (digest optional).

---

## 5) References

- Deployment state: `docs/DEPLOYED.md`
- Recovery and safety docs: `docs/DATA_BACK_TO_104_RECOVERY.md`, `docs/DATA_LOSS_ROOT_CAUSE_AND_RECOVERY.md`
- Cleanup and migration plans: `docs/MIGRATION_CLEANUP_PLAN.md`, `docs/CLEANUP_PLAN.md`
