# PreSight — Open backlog report (R-01)

**Report date:** April 2026  
**Purpose:** Single **open-work** list with **new numbering** (`R-001` …). **Completed** legacy items (old P-001, P-002, P-003, P-005, pricing integration, etc.) are **not** listed here—see **Appendix A**.  
**Supersedes for planning:** Use this file for **what is left to do**; historical numbering remains in `PLANNED_AND_BACKLOG.md` for traceability only.

---

## 1) Executive summary

| Theme | Count (approx.) | Notes |
|-------|-----------------|--------|
| Feature / product | 11 | Includes Salesforce wins Excel (was P-024), comms, admin UX |
| Data safety & performance | 12 | Includes items from `BACKLOG_BY_CATEGORY.md` not in old P-list |
| Ops / migration / observability | 7 | Migration E2E, backups, metrics, alerts |
| AI / optional | 4 | Gemini notes, calendar, advanced analytics |
| Testing / hygiene | 2 | Migration test, dead-code review |

---

## 2) Open backlog — renumbered (`R-xxx`)

### 2.1 Features & communications

| ID | Legacy ref | Priority | Title | Description |
|----|------------|----------|--------|-------------|
| **R-001** | P-004 | High | Win/Loss single-project default | When an account has **exactly one** project, **auto-select** that project in flows that still use account→project pickers (product decision: Log Activity **intentionally** does not auto-select today). |
| **R-002** | P-006 | High | Cookie-only auth cutover | After all users on **session cookies**, **remove** header/API-key **fallback** for storage/auth paths (`docs/DEPLOYED.md`). |
| **R-003** | P-013 | Medium | Reports enhancements | Extend **analytics / reports** UI, presets, and project-dropdown behaviour called out in category backlog (new projects visible when logging; project-level fields on edit). |
| **R-004** | P-014 | Medium | Export suite | Expand **CSV / XLSX / PDF** exports for reports and admin views. |
| **R-005** | P-015 | High | Monthly email package | Generate downloadable **monthly email** body/assets for **manual** distribution. |
| **R-006** | P-016 | Medium | Email notifications | **Login** anomalies, failures, optional **report digests** (ties to R-005 later). |
| **R-007** | P-019 | Medium | Admin panel cleanup | Streamline **Admin & Settings** sections; remove duplicate/stale flows. |
| **R-008** | P-020 | Low | Win of the month UI | Featured **win callout** module on dashboard or similar. |
| **R-009** | P-021 | Low | File attachments | Controlled storage for **files** on activities/accounts. |
| **R-010** | P-024 | **High** | Salesforce wins/losses Excel + notifications | **Upload** Salesforce-style Excel → parse → store → **presales** awareness → **dashboard** callout. See `PLANNED_AND_BACKLOG.md` §5 for approaches. |

### 2.2 Optimising — performance & data safety

| ID | Legacy ref | Priority | Title | Description |
|----|------------|----------|--------|-------------|
| **R-011** | P-007 | High | Non-entity async hardening | Replace **sync** fallbacks where **async** remote paths are expected (**in progress** in legacy backlog). |
| **R-012** | P-008 | High | Draft-first conflict UX | Clearer **conflict** messaging; **retry from Drafts** after full-list save failures; optional one-line warning when replacing server data from draft. |
| **R-013** | P-009 | High | Activities at scale API | **Month-scoped / batched** reads for very large activity sets. |
| **R-014** | P-010 | Medium | View prefetch tuning | Tune **prefetch** from production behaviour (telemetry). |
| **R-015** | Cat-O5 | Medium | **Deploy** account+project lock | `server/lib/accountProjectLock.js` exists with storage hooks—**enable in deployment** and validate 423 → Drafts path (`BACKLOG_BY_CATEGORY` Optimising #5). |
| **R-016** | Cat-O6 | Medium | Admin merge: targeted saves + lock | Bulk admin updates without **full-list PUT**; align with R-015. |
| **R-017** | Cat-O7 | High | Server-side merge — `accounts` | On storage PUT, **merge by id** (projects nested by id); prevent stale `saveAccounts()` from wiping list (`TECH_EVALUATION_AND_DATA_SAFETY_FIX.md`). |
| **R-018** | Cat-O8 | Medium | Server-side merge — `internalActivities` | Same merge strategy as R-017 for internal activities array. |
| **R-019** | Cat-O9 | Medium | Sync path: `lastVersion` on 409 | On conflict response with `updated_at`, **set lastVersion** before merge/retry so “Submit again” is correct. |
| **R-020** | Cat-O10 | Medium | Refetch on tab focus (idle) | After tab inactive **> N min**, reconcile activities/accounts to reduce **multi-tab** stale overwrites. |
| **R-021** | Cat-O11 | Low | Restore from backup UI | In **My Drafts**, offer restore from latest backup with strong duplicate warning (`DATA_LOSS_AND_CONFLICT_BLINDSPOTS.md`). |

### 2.3 Ops, migration, observability

| ID | Legacy ref | Priority | Title | Description |
|----|------------|----------|--------|-------------|
| **R-022** | P-011 | High | Migration cleanup plan | Finalize migration tab: merge, overwrite, controls. |
| **R-023** | P-012 | High | Migration runbook | Validated **step-by-step** checklist + rollback; closes testing gap below. |
| **R-024** | P-017 | Medium | Backup verification automation | Scheduled **verify + restore test** report vs production counts. |
| **R-025** | P-018 | Medium | Production metrics baseline | Request **latency/error** visibility and SLO-style thresholds. |
| **R-026** | Cat-Ops5 | Medium | Alert on storage count drops | Log/alert when activity/account PUT array length **drops sharply** vs prior (trim detection). |

### 2.4 AI & optional product

| ID | Legacy ref | Priority | Title | Description |
|----|------------|----------|--------|-------------|
| **R-027** | P-025 | Medium | Gemini note upload → activity | Upload **notes**; Gemini proposes activity fields; user confirms save. |
| **R-028** | P-022 | Low | Calendar integration | Optional export/sync of key dates to Google/Outlook. |
| **R-029** | P-023 | Low | Advanced analytics | Funnels, cohorts, leaderboards. |

### 2.5 Testing & hygiene

| ID | Legacy ref | Priority | Title | Description |
|----|------------|----------|--------|-------------|
| **R-030** | Test-1 | High | Migration E2E | Full CSV → draft → confirm → promote in a realistic run; update `MIGRATION_GAPS.md`. |
| **R-031** | Test-2 | Medium | Dead code / scripts audit | Review `inspect-wins-xlsx`, `extract-cai-cube-*`, preload wins paths; align with R-010; remove or document unused entry points. |

---

## 3) Suggested additions (not in legacy P-table; from code/docs review)

| ID | Priority | Title | Description |
|----|----------|--------|-------------|
| **R-032** | Medium | Pricing **Sync** pulls from calculator service | Today **Sync** only **GET `/my-unlinked`** (DB). Optional: server job or button calling **pricing-calc** (or webhook) to **ingest** new rows before listing—only if product needs near-real-time from external app. |
| **R-033** | Medium | Harden **POST `/api/pricing-calculations`** | Ensure **API key** / rate limits / payload size limits in production; monitor abuse (`pricingCalculations.js`). |
| **R-034** | Low | Conflict UX docs for admins | **409** payloads no longer go to `pending_storage_saves` (deprecated per `DEPRECATIONS_AND_LOGGING.md`); steer admins to **Activity submission log** runbook—verify UI links and docs (`WHERE_TO_LOOK_ACTIVITIES.md`). |

---

## 4) Suggested execution order (first cuts)

1. **R-010** (Salesforce wins Excel) + **R-030** (migration E2E) in parallel where teams allow  
2. **R-002** (cookie cutover) once user base confirmed  
3. **R-012** / **R-017** / **R-018** (drafts UX + server merge—reduce data-loss class bugs)  
4. **R-011** / **R-013** (async + scale)  
5. **R-022** + **R-023** (migration cleanup + runbook)  
6. **R-005** → **R-006** (email package then notifications)  
7. **R-027** (Gemini) when AI budget/env ready  
8. Optional cluster: **R-008–R-009**, **R-028–R-029**

---

## Appendix A — Completed / shipped (excluded from R-list)

| Legacy | Short description |
|--------|-------------------|
| P-001 | Default activity date from last logged (localStorage per user) |
| P-002 | Activities sort + default “my activities” |
| P-003 | Enablement save without time (confirm) |
| P-005 | Industry / use-case merge (Admin) |
| B-001–B-006 | Backup, perf, prefetch (historical builds) |
| B-007 / Feature 15 | PreSight branding, pricing calculator API, dashboard Pricing, feature flag, multi pricing activities |

---

## Appendix B — Legacy ID quick map (open items only)

| R-ID | Legacy |
|------|--------|
| R-001 | P-004 |
| R-002 | P-006 |
| R-003 | P-013 |
| R-004 | P-014 |
| R-005 | P-015 |
| R-006 | P-016 |
| R-007 | P-019 |
| R-008 | P-020 |
| R-009 | P-021 |
| R-010 | P-024 |
| R-011 | P-007 |
| R-012 | P-008 |
| R-013 | P-009 |
| R-014 | P-010 |
| R-015–R-021 | Category backlog Optimising #5–11 |
| R-022 | P-011 |
| R-023 | P-012 |
| R-024 | P-017 |
| R-025 | P-018 |
| R-026 | Category Ops #5 |
| R-027 | P-025 |
| R-028 | P-022 |
| R-029 | P-023 |
| R-030–R-031 | Testing rows |
| R-032–R-034 | New suggestions |

---

*When this report is revised, bump the report ID (R-02, …) and date; keep `PLANNED_AND_BACKLOG.md` synchronized or mark it “see BACKLOG_OPEN_REPORT_R01.md for open-only numbering.”*
