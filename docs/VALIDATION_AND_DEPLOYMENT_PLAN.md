# Files to Validate + Deployment Readiness + Next Steps

Use this to (1) validate the right files, (2) recheck what is ready at code level vs what must be deployed, and (3) plan next steps.

---

## Part 1: Files you need to validate

Validate these in order. Your sign-off on mapping and plan unblocks implementation.

### 1.1 Mapping and industry/use case (validate first)

| File | Location | What to validate |
|------|----------|-------------------|
| **MIGRATION_MAPPING_FOR_VALIDATION.md** | `Project PAT/docs/` | Account → best-fit Industry (sample table); duplicate groups; canonical industries; source → PAMS industry mapping. Confirm or correct suggested PAMS industry and duplicates. |
| **migration-mapping-extract.json** | `Project PAT/docs/` | Full list (up to 500 accounts, 100 duplicate groups). Use if you want to validate more than the sample in the .md. |
| **CAI_CUBE_INDUSTRY_USECASE_MAPPING.md** | `Presales Year End Report 2025 - 26/` | Banking / Fintech / Insurance split; universal vs industry-specific use cases; typo fixes (Automative, Fullfillment). |

### 1.2 Plan and behaviour (validate second)

| File | Location | What to validate |
|------|----------|-------------------|
| **MIGRATION_PLAN_FULL.md** | `Project PAT/docs/` | Section-level migration (Account → Project → Activity); Migration mode default Off; Global account checkbox and challenges; Block 2 Edit + Block 4 retained; Win Green/Yellow/Red; best-fit Industry in merge section. |
| **REQUEST_SUMMARY_AND_PLAN.md** | `Project PAT/docs/` | Sandbox cutoff, Inside sales bug, Dashboard last activity, Configuration reorg. Confirm these are still the intended plans. |

### 1.3 Data sources (optional check)

| File / folder | Purpose |
|---------------|---------|
| **Presales Year End Report 2025 - 26/** | CAI Cube xlsx, 2025 Wins with SFDC xlsx, presales data. Confirm which files are the source of truth for mapping and Wins. |
| **Project-PAT-LocalArchive/2026-02-11_161551/pams_migration_ready_v3.csv** | Source for `extract-migration-mapping.js`. Re-run script after any CSV update. |

---

## Part 2: What is ready at code level vs what must be deployed

### 2.1 Already in codebase (may or may not be on Railway)

Check production (Railway) with a **hard refresh** (Ctrl+Shift+R). If you don’t see these, the latest code is not deployed.

| Feature | Where in code | In DEPLOYED.md? | Action |
|---------|----------------|-----------------|--------|
| **Sandbox Access** label (ex–POC Sandbox) | `admin.js` (label), Sandbox under Configuration | Not explicitly | Deploy + hard refresh if missing in prod |
| **Configuration vs System Admin** split | `admin.js`, `app.js` (loadConfigurationPanel, systemAdminView) | Not explicitly | Same |
| **Dashboard month** selector (admin) | app.js, `/api/config` dashboardMonth | Not explicitly | Same |
| **System Users / Sales Users** Status filter | admin.js | Not explicitly | Same |
| **Industry & Use Cases** – Edit industry, Pending Accept/Reject/Merge | admin.js, data.js | Yes (edit, pending) | Already documented as live |
| **Sandbox Access** inline (no separate “Open POC Sandbox Manager”) | admin.js loadPOCSandbox | In ADMIN_SPLIT doc | Deploy if not in prod |
| **Bootstrap, batch reconcile, cookie auth, entity APIs** | server, pams-app | Yes in DEPLOYED | Already documented |
| **Migration cleanup** (one-time normalize, dedupe activities) | data.js `applyMigrationCleanupIfNeeded` | No | Runs once per client via localStorage version; not a “feature” to deploy per se |
| **universalUseCases** get/save | data.js only | No | Backend exists; **not used** in Admin or activity forms |

### 2.2 Not in code yet (planned, not built)

| Feature | Plan reference | Status |
|----------|----------------|--------|
| **Migration mode** toggle (Admin On/Off, default Off) | MIGRATION_PLAN_FULL §4 | Not implemented |
| **Migration UI** – Account / Project / Activity sections, alphabetical list, Duplicates, confirm merge, Global account, best-fit Industry | MIGRATION_PLAN_FULL §4, §7, §10 | Not implemented |
| **Universal use cases** in Admin (Block 1) and **getEffectiveUseCasesForIndustry** in forms | MIGRATION_PLAN_FULL §5 | Not implemented (DataManager has universal get/save only) |
| **Block 2 Industries** – Edit already exists; no change needed | MIGRATION_PLAN_FULL §5 | Ready (Edit is there) |
| **Block 4 Pending** – Merge and others | Already in admin.js | Ready (no change) |
| **Global account** checkbox on account; project-level sales rep when Global | MIGRATION_PLAN_FULL §6 | Not implemented |
| **Parse Wins xlsx** and **Green/Yellow/Red** match categories in UI | MIGRATION_PLAN_FULL §9 | Not implemented (script only inspects structure) |
| **Sandbox cutoff** (submission date + 7 days, auto-close, “Migrated data” tag) | REQUEST_SUMMARY_AND_PLAN Plan 2 | Partially: Sandbox UI exists; cutoff logic and tag may need verification |
| **Dashboard – remove “This week”, add Last activity submission** | REQUEST_SUMMARY_AND_PLAN Plan 4 | Not verified in code |
| **Inside sales → India West** bug fix | REQUEST_SUMMARY_AND_PLAN Plan 1 | Not verified in code |
| **Project Health** under Configuration → Analytics | REQUEST_SUMMARY_AND_PLAN Plan 3 | Not verified in code |

### 2.3 Deployment readiness summary

- **Ready to deploy (code exists):** Current `main` with Admin split, Sandbox Access under Configuration, Industry & Use Cases (Edit + Pending), bootstrap, cookie auth, entity APIs, backups. **Action:** If production is behind, push to `main` and deploy; then hard refresh and confirm.
- **Not ready (needs build):** Migration mode toggle and UI, universal use cases in Admin + effective use cases in forms, Global account + project-level rep, Wins parsing + Green/Yellow/Red, Sandbox cutoff/tag, Dashboard “Last activity” and “This week” removal, Inside sales bug fix, Project Health move.

---

## Part 3: Recheck steps (what to do before “next steps”)

1. **Confirm production vs code**
   - Deploy latest from `main` to Railway (if you have uncommitted or unpushed changes, commit and push first).
   - Hard refresh the app; open **Configuration** and **System Admin** and confirm:
     - Sandbox Access is under Configuration and shows “Sandbox Access” (not “POC Sandbox”).
     - Industry & Use Cases has Industries list with Edit/Remove and Pending with Accept/Reject/Merge.
   - If anything from §2.1 is missing in prod, that code is not deployed yet.

2. **Validate mapping and plan**
   - Open **MIGRATION_MAPPING_FOR_VALIDATION.md**: check sample Account → Industry and duplicate groups; note any corrections.
   - Open **CAI_CUBE_INDUSTRY_USECASE_MAPPING.md**: confirm Banking/Fintech/Insurance and universal vs industry-specific use cases.
   - Open **MIGRATION_PLAN_FULL.md**: confirm section-level migration, Global account, and Win categories.

3. **Optional: refresh mapping data**
   - If you update the migration CSV or Wins file, run:
     - `node scripts/extract-migration-mapping.js` (regenerates `docs/MIGRATION_MAPPING_FOR_VALIDATION.md` and `docs/migration-mapping-extract.json`).
     - `node scripts/inspect-wins-xlsx.js` (to re-check Wins xlsx structure for Green/Yellow/Red).

---

## Part 4: Next steps (after validation)

Order these so that validation and “already in code” are done first, then build in order.

### Phase A: Confirm and deploy existing code
- [ ] Deploy current `main` to Railway (if not already).
- [ ] Hard refresh; verify Admin split, Sandbox Access, Industry & Use Cases, Dashboard month.
- [ ] Update **DEPLOYED.md** with any missing items from §2.1 so it matches what you see in production.

### Phase B: Validation sign-off
- [ ] Sign off on **MIGRATION_MAPPING_FOR_VALIDATION.md** (industries, duplicates, sample).
- [ ] Sign off on **CAI_CUBE_INDUSTRY_USECASE_MAPPING.md** and **MIGRATION_PLAN_FULL.md** (Global account, sections, Win categories).

### Phase C: Build (in suggested order)
1. **Migration mode toggle** – Config or System Admin; store `featureFlags.migrationMode` or `migrationModeEnabled`; default Off. Gate all migration UI behind this.
2. **Universal use cases** – Admin Block 1 (list, Add/Edit/Remove); DataManager `getEffectiveUseCasesForIndustry(industry)`; activity/project forms use effective list. Block 2 (Industries Edit) and Block 4 (Pending) already in place.
3. **Global account** – Add `account.isGlobalAccount`; add optional `project.salesRep` (and email/region); account card and reports show “Global” or per-project rep when Global; Migration UI option “Mark as Global account”.
4. **Migration UI – Account section** – Alphabetical account list; Duplicates section with confirm merge / not; best-fit Industry from mapping (or API); Global account checkbox. (Merge logic can start simple: pick canonical, move projects/activities, delete duplicate.)
5. **Migration UI – Project and Activity sections** – Map projects to accounts; map activities to accounts/projects; use existing attach/link flows where possible.
6. **Wins parsing and Green/Yellow/Red** – Parse 2025 Wins xlsx (identify data table rows/columns); classify each row Strong/Medium/Weak; show in Migration UI (e.g. Account or a Wins tab) with colour.
7. **Sandbox cutoff and “Migrated data” tag** – Implement submission date + 7 days, auto-close filter, and “Migrated data” tag per REQUEST_SUMMARY_AND_PLAN.
8. **Dashboard and bug fix** – Remove “This week”; add “Last activity submission”; Inside sales → India West fix; Project Health under Configuration → Analytics (if not already).

### Phase D: Runbook and docs
- [ ] Add a short **Migration runbook** (backup → enable Migration mode → duplicate review → merge → Project/Activity mapping → disable mode → verify).
- [ ] Keep **DEPLOYED.md** updated as each phase is deployed.

---

## Quick reference: file paths

```
Project PAT/
  docs/
    VALIDATION_AND_DEPLOYMENT_PLAN.md   ← this file
    MIGRATION_PLAN_FULL.md
    MIGRATION_MAPPING_FOR_VALIDATION.md
    migration-mapping-extract.json
    REQUEST_SUMMARY_AND_PLAN.md
    DEPLOYED.md
    ADMIN_SPLIT_AND_REPORTS_REVIEW.md
    PLANNED_AND_BACKLOG.md
  scripts/
    extract-migration-mapping.js
    inspect-wins-xlsx.js
    extract-current-cube-only.js

Presales Year End Report 2025 - 26/
  CAI_CUBE_INDUSTRY_USECASE_MAPPING.md
  CAI Cube & 3p Connectors .xlsx
  2025 Wins with SFDC-2026-02-02-17-56-23.xlsx
  ...

Project-PAT-LocalArchive/2026-02-11_161551/
  pams_migration_ready_v3.csv
  ...
```
